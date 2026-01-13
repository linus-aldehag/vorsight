using Vorsight.Contracts.IPC;
using Vorsight.Interop;

using Vorsight.Service.SystemOperations;
using Vorsight.Service.Server;
using Vorsight.Contracts.Settings;
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
    private int _consecutiveAgentCommandFailures = 0;
    private DateTime _lastAgentPathResolveAttempt = DateTime.MinValue;
    private string _cachedAgentPath = string.Empty;

    public void UpdateActivity(Vorsight.Contracts.Models.ActivityData data)
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(data.Timestamp).UtcDateTime;

        // Report successful activity reception to health monitor
        _healthMonitor.RecordActivitySuccess();
        _healthMonitor.UpdateLastActivityReceived(now);
        
        // Reset failure counter on successful activity
        _consecutiveAgentCommandFailures = 0;

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
                _ = _serverConnection.SendActivityAsync(new
                {
                    timestamp = _currentActivityStart.ToString("O"),  // ISO 8601 format for SQLite
                    activeWindow = _currentWindow,
                    processName = _currentProcess,
                    duration = duration,
                    username = !string.IsNullOrEmpty(_currentUsername) ? _currentUsername : data.Username
                });
            }

            logger.LogDebug("Activity changed: '{Old}' ({Dur}s) -> '{New}'", _currentWindow, duration, data.ActiveWindow);

            // Update state
            _currentWindow = data.ActiveWindow;
            _currentProcess = data.ProcessName;
            _currentUsername = data.Username;
            _currentActivityStart = now;
        }
        else
        {
            // Window hasn't changed, but still send periodic activity ping
            // This ensures activity is continuously tracked, not just on window changes
            var duration = (int)(now - _currentActivityStart).TotalSeconds;
            if (_serverConnection.IsConnected && duration > 0)
            {
                _ = _serverConnection.SendActivityAsync(new
                {
                    timestamp = _currentActivityStart.ToString("O"),  // ISO 8601 format for SQLite
                    activeWindow = _currentWindow,
                    processName = _currentProcess,
                    duration = duration,
                    username = !string.IsNullOrEmpty(_currentUsername) ? _currentUsername : data.Username,
                    isContinuation = true // Flag to indicate this is a continuation, not a window change
                });
                
                // Reset start time to prevent accumulating overlapping durations
                _currentActivityStart = now;
            }
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
        
        // Try to resolve agent path at startup, but don't give up if it fails
        _cachedAgentPath = ResolveAgentPath();
        _lastAgentPathResolveAttempt = DateTime.UtcNow;
        
        if (string.IsNullOrEmpty(_cachedAgentPath))
        {
            monitorLogger.LogWarning("Agent executable not found at startup. Will retry every 30 seconds.");
            monitorLogger.LogWarning("Configure Agent:ExecutablePath in appsettings.json or ensure wuapihost.exe is in: {Base}", AppContext.BaseDirectory);
        }
        else
        {
            monitorLogger.LogInformation("Activity monitoring started with agent: {AgentPath}", _cachedAgentPath);
        }

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                // Periodically retry agent path resolution if it's missing
                if (string.IsNullOrEmpty(_cachedAgentPath) && 
                    (DateTime.UtcNow - _lastAgentPathResolveAttempt).TotalSeconds > 30)
                {
                    _cachedAgentPath = ResolveAgentPath();
                    _lastAgentPathResolveAttempt = DateTime.UtcNow;
                    
                    if (!string.IsNullOrEmpty(_cachedAgentPath))
                    {
                        monitorLogger.LogInformation("Agent executable found: {AgentPath}", _cachedAgentPath);
                    }
                }
                
                // Get current settings
                var settings = await _settingsManager.GetSettingsAsync();
                
                if (!settings.Activity.Enabled)
                {
                    // Monitoring disabled, just wait
                    await Task.Delay(5000, cancellationToken);
                    continue;
                }
                
                // Skip activity polling if agent is not available
                if (string.IsNullOrEmpty(_cachedAgentPath))
                {
                    await Task.Delay(5000, cancellationToken);
                    continue;
                }

                var now = DateTime.UtcNow;
                var pollInterval = TimeSpan.FromSeconds(settings.Activity.IntervalSeconds);
                var screenshotInterval = TimeSpan.FromSeconds(settings.Screenshots.IntervalSeconds);

                // Log current settings every 5 minutes for diagnostics
                if (_lastPollTime == DateTime.MinValue || (now - _lastPollTime).TotalMinutes > 5)
                {
                    var healthStatus = _healthMonitor.GetActivityHealthStatus();
                    monitorLogger.LogInformation(
                        "Activity monitoring: Screenshot={Screenshot}s, Ping={Ping}s, Health={Health}, ConsecutiveFailures={Failures}", 
                        settings.Screenshots.IntervalSeconds, 
                        settings.Activity.IntervalSeconds,
                        healthStatus,
                        _consecutiveAgentCommandFailures);
                }

                // Poll Agent for Activity
                if (now - _lastPollTime > pollInterval)
                {
                    _lastPollTime = now;
                    
                    // Execute agent command and track result
                    var commandSuccess = _commandExecutor.RunCommandAsUser(_cachedAgentPath, "activity");
                    
                    if (commandSuccess)
                    {
                        _healthMonitor.RecordAgentCommandSuccess();
                        _consecutiveAgentCommandFailures = 0;
                    }
                    else
                    {
                        _healthMonitor.RecordAgentCommandFailure();
                        _consecutiveAgentCommandFailures++;
                        
                        monitorLogger.LogDebug("Agent command failed (attempt {Attempts})", _consecutiveAgentCommandFailures);

                        if (_consecutiveAgentCommandFailures >= 5)
                        {
                            monitorLogger.LogWarning(
                                "Agent command failed {Attempts} consecutive times. This may indicate explorer.exe is not running or session access issues.",
                                _consecutiveAgentCommandFailures);
                        }
                        
                        // After 3 consecutive failures, invalidate cached agent path to force re-resolution
                        if (_consecutiveAgentCommandFailures >= 3)
                        {
                            monitorLogger.LogWarning("Multiple consecutive agent command failures. Will retry agent path resolution.");
                            _cachedAgentPath = string.Empty;
                            _lastAgentPathResolveAttempt = DateTime.MinValue;
                        }
                    }
                    
                    // Send heartbeat to server with current activity
                    if (_serverConnection.IsConnected && _latestSnapshot != null)
                    {
                        // Get version from assembly
                        var version = System.Reflection.Assembly.GetExecutingAssembly()
                            .GetName().Version?.ToString() ?? "Unknown";
                        
                        await _serverConnection.SendHeartbeatAsync(new
                        {
                            lastActivityTime = _latestSnapshot.Value.Timestamp,
                            activeWindow = _latestSnapshot.Value.ActiveWindowTitle,
                            screenshotCount = 0,
                            uploadCount = 0,
                            version = version,  // Add version
                            health = new
                            {
                                isMonitoring = settings.Activity.Enabled,
                                screenshotInterval = settings.Screenshots.IntervalSeconds,
                                pingInterval = settings.Activity.IntervalSeconds
                            }
                        });
                    }
                }

                // Check for Timed Screenshot (only if enabled)
                if (settings.Screenshots.IntervalSeconds > 0 && now - _lastTimedScreenshot > screenshotInterval && _latestSnapshot != null)
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
