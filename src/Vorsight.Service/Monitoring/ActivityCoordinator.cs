using Vorsight.Core.IPC;
using Vorsight.Native;

using Vorsight.Service.SystemOperations;
using Vorsight.Service.Server;

namespace Vorsight.Service.Monitoring;

public interface IActivityCoordinator
{
    Task StartMonitoringAsync(CancellationToken cancellationToken);
    ActivitySnapshot? GetCurrentActivity();
    void UpdateActivity(Vorsight.Core.Models.ActivityData data);
    Task RequestManualScreenshotAsync(string source);
}

public class ActivityCoordinator(
    ILogger<ActivityCoordinator> logger,
    ILoggerFactory loggerFactory,
    IConfiguration config,
    INamedPipeServer ipcServer,
    ICommandExecutor commandExecutor,
    Vorsight.Core.Settings.ISettingsManager settingsManager,
    IServerConnection serverConnection)
    : IActivityCoordinator
{
    private readonly ILoggerFactory _loggerFactory = loggerFactory;
    private readonly INamedPipeServer _ipcServer = ipcServer;
    private readonly ICommandExecutor _commandExecutor = commandExecutor;
    private readonly Vorsight.Core.Settings.ISettingsManager _settingsManager = settingsManager;
    private readonly IServerConnection _serverConnection = serverConnection;
    private string _currentWindow = string.Empty;
    private string _currentProcess = string.Empty;
    private DateTime _currentActivityStart = DateTime.MinValue;
    private DateTime _lastTimedScreenshot = DateTime.MinValue;
    private DateTime _lastPollTime = DateTime.MinValue;
    private ActivitySnapshot? _latestSnapshot;

    public void UpdateActivity(Vorsight.Core.Models.ActivityData data)
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(data.Timestamp).UtcDateTime;

        // Initialize tracking if needed
        if (_currentActivityStart == DateTime.MinValue)
        {
            _currentWindow = data.ActiveWindow;
            _currentProcess = data.ProcessName;
            _currentActivityStart = now;
        }

        // Check if window changed
        if (data.ActiveWindow != _currentWindow)
        {
            var duration = (int)(now - _currentActivityStart).TotalSeconds;

            // Send PREVIOUS activity if it had a meaningful duration
            if (_serverConnection.IsConnected && duration > 0)
            {
                _ = _serverConnection.SendActivityAsync(new
                {
                    timestamp = _currentActivityStart,
                    activeWindow = _currentWindow,
                    processName = _currentProcess,
                    duration = duration
                });
            }

            logger.LogDebug("Activity changed: '{Old}' ({Dur}s) -> '{New}'", _currentWindow, duration, data.ActiveWindow);

            // Trigger Screenshot on Window Change
            if (!string.IsNullOrEmpty(data.ActiveWindow))
            {
                _ = RequestScreenshotAsync("WindowChange", new ActivitySnapshot 
                { 
                    ActiveWindowTitle = data.ActiveWindow,
                    ProcessName = data.ProcessName,
                    Timestamp = now 
                });
            }

            // Update state
            _currentWindow = data.ActiveWindow;
            _currentProcess = data.ProcessName;
            _currentActivityStart = now;
        }

        // Always update latest snapshot for Heartbeat/Dashboard
        _latestSnapshot = new ActivitySnapshot
        {
            Timestamp = now,
            ActiveWindowTitle = data.ActiveWindow,
            ProcessName = data.ProcessName
        };
    }

    public async Task StartMonitoringAsync(CancellationToken cancellationToken)
    {
        var monitorLogger = _loggerFactory.CreateLogger<ActivityCoordinator>();
        
        // Validate agent executable exists before starting monitoring
        var agentPath = ResolveAgentPath();
        if (string.IsNullOrEmpty(agentPath))
        {
            monitorLogger.LogWarning("Agent executable not found at startup. Activity monitoring will be disabled.");
            monitorLogger.LogWarning("Configure Agent:ExecutablePath in appsettings.json to enable activity monitoring. BaseDir: {Base}", AppContext.BaseDirectory);
            
            // Wait for cancellation instead of spinning with warnings
            try
            {
                await Task.Delay(Timeout.Infinite, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                monitorLogger.LogInformation("Activity monitoring stopped (agent not configured)");
            }
            return;
        }

        monitorLogger.LogInformation("Activity monitoring started with agent: {AgentPath}", agentPath);

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                // Get current settings
                var settings = await _settingsManager.GetSettingsAsync();
                
                if (!settings.IsMonitoringEnabled)
                {
                    // Monitoring disabled, just wait
                    await Task.Delay(5000, cancellationToken);
                    continue;
                }

                var now = DateTime.UtcNow;
                var pollInterval = TimeSpan.FromSeconds(settings.PingIntervalSeconds);
                var screenshotInterval = TimeSpan.FromSeconds(settings.ScreenshotIntervalSeconds);

                // Poll Agent for Activity
                if (now - _lastPollTime > pollInterval)
                {
                    _lastPollTime = now;
                    // Agent path already validated at startup
                    _commandExecutor.RunCommandAsUser(agentPath, "activity");
                    
                    // Send heartbeat to server
                    if (_serverConnection.IsConnected && _latestSnapshot != null)
                    {
                        await _serverConnection.SendHeartbeatAsync(new
                        {
                            lastActivityTime = _latestSnapshot.Value.Timestamp,
                            activeWindow = _latestSnapshot.Value.ActiveWindowTitle,
                            screenshotCount = 0, // TODO: Get from health monitor
                            uploadCount = 0,
                            health = new
                            {
                                isMonitoring = settings.IsMonitoringEnabled,
                                screenshotInterval = settings.ScreenshotIntervalSeconds,
                                pingInterval = settings.PingIntervalSeconds
                            }
                        });
                    }
                }

                // Check for Timed Screenshot
                if (now - _lastTimedScreenshot > screenshotInterval && _latestSnapshot != null)
                {
                    monitorLogger.LogDebug("Timed interval elapsed");
                    _lastTimedScreenshot = now;
                    await RequestScreenshotAsync("Timed", _latestSnapshot.Value);
                }
            }
            catch (Exception ex)
            {
                monitorLogger.LogError(ex, "Error in activity monitoring loop");
            }

            try
            {
                await Task.Delay(1000, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
        
        monitorLogger.LogInformation("Activity monitoring stopped");
    }

    public async Task RequestManualScreenshotAsync(string source)
    {
        var snapshot = _latestSnapshot ?? new ActivitySnapshot 
        { 
            ActiveWindowTitle = "Manual Trigger", 
            ProcessName = "System",
            Timestamp = DateTime.UtcNow 
        };
        
        await RequestScreenshotAsync(source, snapshot);
    }

    private async Task RequestScreenshotAsync(string triggerType, ActivitySnapshot snapshot)
    {
        try
        {
            var agentPath = ResolveAgentPath();
            if (string.IsNullOrEmpty(agentPath)) 
            {
                logger.LogWarning("Cannot request screenshot: Agent not found");
                return;
            }

            var metadata = $"Type:{triggerType}|Title:{snapshot.ActiveWindowTitle}";
            // Launch Agent in one-shot screenshot mode
            var args = $"screenshot \"{metadata}\"";
            
            _commandExecutor.RunCommandAsUser(agentPath, args);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to request screenshot ({Trigger})", triggerType);
        }
    }

    private string ResolveAgentPath()
    {
        // First, try the configured path
        var configuredPath = config.GetValue<string>("Agent:ExecutablePath");
        if (!string.IsNullOrEmpty(configuredPath) && File.Exists(configuredPath))
        {
            return configuredPath;
        }

        // Fallback 1: Look for wuapihost.exe in the same directory (production)
        var agentPath = Path.Combine(AppContext.BaseDirectory, "wuapihost.exe");
        if (File.Exists(agentPath))
        {
            return agentPath;
        }

        // Fallback 2: Look for Vorsight.Agent.exe in dev environment
        var devPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../Vorsight.Agent/bin/Debug/net10.0-windows/win-x64/Vorsight.Agent.exe"));
        if (File.Exists(devPath))
        {
            return devPath;
        }

        // Fallback 3: Look for wuapihost.exe in dev environment (if renamed manually)
        var devPathRenamed = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../Vorsight.Agent/bin/Debug/net10.0-windows/win-x64/wuapihost.exe"));
        if (File.Exists(devPathRenamed))
        {
            return devPathRenamed;
        }

        return string.Empty;
    }


    public ActivitySnapshot? GetCurrentActivity() => _latestSnapshot;
}
