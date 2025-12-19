using Vorsight.Core.IPC;
using Vorsight.Native;

namespace Vorsight.Service.Services;

/// <summary>
/// Coordinates and manages screenshot operations
/// </summary>
public interface IScreenshotCoordinator
{
    /// <summary>
    /// Starts the timed screenshot process
    /// </summary>
    Task StartTimedScreenshotsAsync(CancellationToken cancellationToken);
    
    /// <summary>
    /// Starts the window change detection screenshot process
    /// </summary>
    Task StartWindowChangeScreenshotsAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Implementation of the screenshot coordinator
/// </summary>
public class ScreenshotCoordinator(
    ILogger<ScreenshotCoordinator> logger,
    IConfiguration config,
    IWindowMonitor windowMonitor,
    INamedPipeServer ipcServer)
    : IScreenshotCoordinator
{
    private readonly int _intervalMinutes = config.GetValue("Screenshot:IntervalMinutes", 5);
    private string _lastActiveWindowTitle = string.Empty;

    /// <summary>
    /// Starts the timed screenshot process
    /// </summary>
    public async Task StartTimedScreenshotsAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("Starting timed screenshots at {Interval} minute intervals", _intervalMinutes);

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                // Request screenshot via IPC
                var request = new PipeMessage(PipeMessage.MessageType.ScreenshotRequest, 0)
                {
                    Metadata = "Type:Timed"
                };
                
                await ipcServer.BroadcastMessageAsync(request);
                logger.LogDebug("Requested timed screenshot via IPC");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error requesting timed screenshot - will retry in {Interval} minutes", _intervalMinutes);
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(_intervalMinutes), cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                logger.LogInformation("Timed screenshots cancelled");
                break;
            }
        }
        
        logger.LogInformation("Timed screenshots stopped");
    }
    
    /// <summary>
    /// Starts the window change detection screenshot process
    /// </summary>
    public async Task StartWindowChangeScreenshotsAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("Starting window change detection screenshots");
        
        var consecutiveErrors = 0;
        const int maxConsecutiveErrors = 10;
        
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var currentWindow = windowMonitor.GetActiveWindowTitle();
                if (!string.IsNullOrEmpty(currentWindow) && currentWindow != _lastActiveWindowTitle)
                {
                    _lastActiveWindowTitle = currentWindow;
                    
                    // Request screenshot via IPC
                    var request = new PipeMessage(PipeMessage.MessageType.ScreenshotRequest, 0)
                    {
                        Metadata = $"Type:WindowChange|Title:{currentWindow}"
                    };
                    
                    await ipcServer.BroadcastMessageAsync(request);
                    logger.LogDebug("Requested window change screenshot via IPC for window: {WindowTitle}", currentWindow);
                }
                
                consecutiveErrors = 0; // Reset error counter on success
            }
            catch (Exception ex)
            {
                consecutiveErrors++;
                logger.LogError(ex, "Error during window change screenshot (consecutive errors: {Count})", consecutiveErrors);
                
                if (consecutiveErrors >= maxConsecutiveErrors)
                {
                    logger.LogError("Too many consecutive errors in window change monitoring. Stopping to prevent resource exhaustion.");
                    break;
                }
                
                // Longer delay after errors to prevent resource exhaustion
                await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
                continue;
            }
            
            try
            {
                // Check for window changes frequently but not too aggressively
                await Task.Delay(1000, cancellationToken); // Relaxed check to 1s to reduce CPU
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                logger.LogInformation("Window change monitoring cancelled");
                break;
            }
        }
        
        logger.LogInformation("Window change monitoring stopped");
    }
}
