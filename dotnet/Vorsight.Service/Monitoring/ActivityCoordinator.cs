using Vorsight.Contracts.IPC;
using Vorsight.Interop;

using Vorsight.Service.SystemOperations;
using Vorsight.Service.Server;
using Vorsight.Contracts.Settings;
using Vorsight.Contracts.DTOs;
using Vorsight.Infrastructure.Contracts;
using Vorsight.Infrastructure.Monitoring;

namespace Vorsight.Service.Monitoring;

public interface IActivityCoordinator
{
    Task StartMonitoringAsync(CancellationToken cancellationToken);
    ActivitySnapshot? GetCurrentActivity();
    void UpdateActivity(Vorsight.Contracts.Models.ActivityData data);
    Task RequestManualScreenshotAsync(string source);
}

public class ActivityCoordinator(
    ILogger<ActivityCoordinator> logger,
    ILoggerFactory loggerFactory,
    IConfiguration config,
    INamedPipeServer ipcServer,
    ICommandExecutor commandExecutor,
    ISettingsManager settingsManager,
    IServerConnection serverConnection,
    IHealthMonitor healthMonitor)
    : IActivityCoordinator
{
    private readonly ILoggerFactory _loggerFactory = loggerFactory;
    private readonly INamedPipeServer _ipcServer = ipcServer;
    private readonly ICommandExecutor _commandExecutor = commandExecutor;
    private readonly ISettingsManager _settingsManager = settingsManager;
    private readonly IServerConnection _serverConnection = serverConnection;
    private readonly IHealthMonitor _healthMonitor = healthMonitor;
    private string _currentWindow = string.Empty;
    private string _currentProcess = string.Empty;
    private DateTime _currentActivityStart = DateTime.MinValue;
    private DateTime _lastTimedScreenshot = DateTime.MinValue;
    private DateTime _lastPollTime = DateTime.MinValue;
    private ActivitySnapshot? _latestSnapshot;
    private string _currentUsername = string.Empty;
    
    // Recovery tracking
    private DateTime _lastAgentPathResolveAttempt = DateTime.MinValue;
    private string _cachedAgentPath = string.Empty;

    public void UpdateActivity(Vorsight.Contracts.Models.ActivityData data)
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(data.Timestamp).UtcDateTime;

        // Report successful activity reception to health monitor
        _healthMonitor.RecordActivitySuccess();
        _healthMonitor.UpdateLastActivityReceived(now);

        // Initialize tracking if needed
        if (_currentActivityStart == DateTime.MinValue)
        {
            _currentWindow = data.ActiveWindow;
            _currentProcess = data.ProcessName;
            _currentUsername = data.Username;
            _currentActivityStart = now;
        }

        // Check if window changed
        if (data.ActiveWindow != _currentWindow)
        {
            var duration = (int)(now - _currentActivityStart).TotalSeconds;

            // Send PREVIOUS activity if it had a meaningful duration
            if (_serverConnection.IsConnected && duration > 0)
            {
                _ = _serverConnection.SendActivityAsync(new ActivityPayload
                {
                    Timestamp = new DateTimeOffset(_currentActivityStart),
                    ActiveWindow = _currentWindow,
                    ProcessName = _currentProcess,
                    Duration = duration,
                    Username = !string.IsNullOrEmpty(_currentUsername) ? _currentUsername : data.Username
                });
            }

            _currentWindow = data.ActiveWindow;
            _currentProcess = data.ProcessName;
            _currentActivityStart = now;
        }
        
        // Update snapshot for polling
        _latestSnapshot = new ActivitySnapshot 
        { 
            ActiveWindowTitle = data.ActiveWindow, 
            ProcessName = data.ProcessName,
            Timestamp = now
        };
    }

    public async Task StartMonitoringAsync(CancellationToken cancellationToken)
    {
        var monitorLogger = _loggerFactory.CreateLogger("ActivityMonitor");
        monitorLogger.LogInformation("Activity monitoring started");

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                var settings = await _settingsManager.GetSettingsAsync();
                
                // Monitor loop - check connection and send heartbeat
                // Activity updates are event-driven via UpdateActivity, but we need to keep connection alive
                // and potentially send heartbeat if interval elapsed (though server might handle pings)
                
                // Let's assume we send a heartbeat every 30 seconds
                if (now - _lastPollTime > TimeSpan.FromSeconds(30))
                {
                    _lastPollTime = now;

                    // Send heartbeat to server with current activity
                    if (_serverConnection.IsConnected && _latestSnapshot != null)
                    {
                        // Get version from assembly
                        var version = System.Reflection.Assembly.GetExecutingAssembly()
                            .GetName().Version?.ToString() ?? "Unknown";
                        
                        // Populate HealthStatus object
                        var healthStatus = new HealthStatus 
                        {
                            // Uptime provides useful signal for service restarts/crashes that pings may miss
                            Uptime = (DateTime.UtcNow - System.Diagnostics.Process.GetCurrentProcess().StartTime.ToUniversalTime()).TotalSeconds
                        };

                        await _serverConnection.SendHeartbeatAsync(new StatePayload
                        {
                            LastActivityTime = new DateTimeOffset(_latestSnapshot.Value.Timestamp),
                            ActiveWindow = _latestSnapshot.Value.ActiveWindowTitle,
                            ScreenshotCount = 0,
                            UploadCount = 0,
                            Version = version,
                            Health = healthStatus
                        });
                    }
                }

                // Check for Timed Screenshot (only if enabled)
                var screenshotInterval = TimeSpan.FromSeconds(settings.Screenshots.IntervalSeconds);
                if (settings.Screenshots.IntervalSeconds > 0 && now - _lastTimedScreenshot > screenshotInterval && _latestSnapshot != null)
                {
                    monitorLogger.LogDebug("Timed interval elapsed");
                    _lastTimedScreenshot = now;
                    await RequestScreenshotAsync("Timed", _latestSnapshot.Value);
                }

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
        // First, try the configured path (may be relative or absolute)
        var configuredPath = config.GetValue<string>("Agent:ExecutablePath");
        if (!string.IsNullOrEmpty(configuredPath))
        {
            // Try as absolute path first
            if (File.Exists(configuredPath))
            {
                return configuredPath;
            }
            
            // Try as relative path from base directory
            var absolutePath = Path.Combine(AppContext.BaseDirectory, configuredPath);
            if (File.Exists(absolutePath))
            {
                return absolutePath;
            }
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
