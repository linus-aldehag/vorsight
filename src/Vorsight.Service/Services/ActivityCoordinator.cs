using Vorsight.Core.IPC;
using Vorsight.Native;

namespace Vorsight.Service.Services;

public interface IActivityCoordinator
{
    Task StartMonitoringAsync(CancellationToken cancellationToken);
    ActivitySnapshot? GetCurrentActivity();
}

public class ActivityCoordinator(
    ILogger<ActivityCoordinator> logger,
    IConfiguration config,
    IUserActivityMonitor activityMonitor,
    INamedPipeServer ipcServer)
    : IActivityCoordinator
{
    private readonly int _screenshotIntervalMinutes = config.GetValue("Activity:ScreenshotIntervalMinutes", 5);
    private string _lastWindowTitle = string.Empty;
    private DateTime _lastTimedScreenshot = DateTime.MinValue;
    private ActivitySnapshot? _latestSnapshot;

    public async Task StartMonitoringAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("Activity monitoring started. Interval: {Interval}m", _screenshotIntervalMinutes);

        // Main monitoring loop - runs frequently (e.g. every second)
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var snapshot = activityMonitor.GetSnapshot();
                _latestSnapshot = snapshot;
                var now = DateTime.UtcNow;

                // 1. Check for Window Change
                if (!string.IsNullOrEmpty(snapshot.ActiveWindowTitle) && 
                    snapshot.ActiveWindowTitle != _lastWindowTitle)
                {
                    logger.LogDebug("Window changed: '{Old}' -> '{New}' (Inactivity: {Inactivity})", 
                        _lastWindowTitle, snapshot.ActiveWindowTitle, snapshot.TimeSinceLastInput);
                    
                    _lastWindowTitle = snapshot.ActiveWindowTitle;
                    
                    // Request Window Change Screenshot
                    await RequestScreenshotAsync("WindowChange", snapshot);
                }

                // 2. Check for Timed Screenshot
                if (now - _lastTimedScreenshot > TimeSpan.FromMinutes(_screenshotIntervalMinutes))
                {
                    logger.LogDebug("Timed interval elapsed (Inactivity: {Inactivity})", snapshot.TimeSinceLastInput);
                    
                    _lastTimedScreenshot = now;
                    
                    // Request Timed Screenshot
                    await RequestScreenshotAsync("Timed", snapshot);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in activity monitoring loop");
            }

            try
            {
                // Pulse every 1 second
                await Task.Delay(1000, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
        
        logger.LogInformation("Activity monitoring stopped");
    }

    private async Task RequestScreenshotAsync(string triggerType, ActivitySnapshot snapshot)
    {
        try
        {
            var metadata = $"Type:{triggerType}|Title:{snapshot.ActiveWindowTitle}|InputInactivity:{snapshot.TimeSinceLastInput}";
            
            var request = new PipeMessage(PipeMessage.MessageType.ScreenshotRequest, 0)
            {
                Metadata = metadata
            };
            
            await ipcServer.BroadcastMessageAsync(request);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to request screenshot ({Trigger})", triggerType);
        }
    }

    public ActivitySnapshot? GetCurrentActivity() => _latestSnapshot;
}
