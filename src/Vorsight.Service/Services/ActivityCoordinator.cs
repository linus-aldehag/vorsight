using Vorsight.Core.IPC;
using Vorsight.Native;

namespace Vorsight.Service.Services;

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
    Services.Analytics.IActivityRepository activityRepository,
    Vorsight.Core.Settings.ISettingsManager settingsManager)
    : IActivityCoordinator
{
    private readonly ILoggerFactory _loggerFactory = loggerFactory;
    private readonly INamedPipeServer _ipcServer = ipcServer;
    private readonly ICommandExecutor _commandExecutor = commandExecutor;
    private readonly Services.Analytics.IActivityRepository _activityRepository = activityRepository;
    private readonly Vorsight.Core.Settings.ISettingsManager _settingsManager = settingsManager;
    private string _lastWindowTitle = string.Empty;
    private DateTime _lastTimedScreenshot = DateTime.MinValue;
    private DateTime _lastPollTime = DateTime.MinValue;
    private ActivitySnapshot? _latestSnapshot;

    public void UpdateActivity(Vorsight.Core.Models.ActivityData data)
    {
        // Persist to Repository
        _activityRepository.AddActivity(data);

        // Convert ActivityData to Snapshot
        var snapshot = new ActivitySnapshot
        {
            Timestamp = DateTimeOffset.FromUnixTimeSeconds(data.Timestamp).UtcDateTime,
            ActiveWindowTitle = data.ActiveWindow
        };

        _latestSnapshot = snapshot;

        // Check for Window Change immediately upon receiving report
        if (!string.IsNullOrEmpty(snapshot.ActiveWindowTitle) && 
            snapshot.ActiveWindowTitle != _lastWindowTitle)
        {
            logger.LogDebug("Window changed (Agent): '{Old}' -> '{New}'", _lastWindowTitle, snapshot.ActiveWindowTitle);
            _lastWindowTitle = snapshot.ActiveWindowTitle;
            
            // Fire and forget
            _ = RequestScreenshotAsync("WindowChange", snapshot);
        }
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
