namespace Vorsight.Service.Monitoring;

/// <summary>
/// Monitors the health and activity of the application
/// </summary>
public interface IHealthMonitor
{
    /// <summary>
    /// Records a successful screenshot operation
    /// </summary>
    void RecordScreenshotSuccess();
    
    /// <summary>
    /// Records a failed screenshot operation
    /// </summary>
    void RecordScreenshotFailure();
    
    /// <summary>
    /// Records a successful upload operation
    /// </summary>
    void RecordUploadSuccess();
    
    /// <summary>
    /// Records a failed upload operation
    /// </summary>
    void RecordUploadFailure();
    
    /// <summary>
    /// Starts health monitoring and periodic reporting
    /// </summary>
    Task StartMonitoringAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Gets the current health report
    /// </summary>
    HealthReport GetHealthReport();
}

/// <summary>
/// Implementation of health monitoring
/// </summary>
public class HealthMonitor : IHealthMonitor
{
    private readonly ILogger<HealthMonitor> _logger;
    private readonly object _statsLock = new();
    
    // Current period stats
    private int _screenshotsSuccessful;
    private int _screenshotsFailed;
    private int _uploadsSuccessful;
    private int _uploadsFailed;
    private DateTime _periodStart = DateTime.Now;
    
    // Overall stats
    private int _totalScreenshotsSuccessful;
    private int _totalScreenshotsFailed;
    private int _totalUploadsSuccessful;
    private int _totalUploadsFailed;
    private DateTime _applicationStart = DateTime.Now;
    
    public HealthMonitor(ILogger<HealthMonitor> logger)
    {
        _logger = logger;
    }
    
    public void RecordScreenshotSuccess()
    {
        lock (_statsLock)
        {
            _screenshotsSuccessful++;
            _totalScreenshotsSuccessful++;
        }
    }
    
    public void RecordScreenshotFailure()
    {
        lock (_statsLock)
        {
            _screenshotsFailed++;
            _totalScreenshotsFailed++;
        }
    }
    
    public void RecordUploadSuccess()
    {
        lock (_statsLock)
        {
            _uploadsSuccessful++;
            _totalUploadsSuccessful++;
        }
    }
    
    public void RecordUploadFailure()
    {
        lock (_statsLock)
        {
            _uploadsFailed++;
            _totalUploadsFailed++;
        }
    }
    
    public async Task StartMonitoringAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Health monitoring started");
        
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(15), cancellationToken); // Report every 15 minutes
                ReportHealth();
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in health monitoring");
            }
        }
        
        // Final report on shutdown
        ReportHealth();
        _logger.LogInformation("Health monitoring stopped");
    }
    
    private void ReportHealth()
    {
        lock (_statsLock)
        {
            var periodDuration = DateTime.Now - _periodStart;
            var totalDuration = DateTime.Now - _applicationStart;
            
            // Period stats
            var periodTotal = _screenshotsSuccessful + _screenshotsFailed;
            var periodUploadTotal = _uploadsSuccessful + _uploadsFailed;
            var periodSuccessRate = periodTotal > 0 ? (_screenshotsSuccessful * 100.0 / periodTotal) : 0;
            var periodUploadRate = periodUploadTotal > 0 ? (_uploadsSuccessful * 100.0 / periodUploadTotal) : 0;
            
            // Overall stats
            var overallTotal = _totalScreenshotsSuccessful + _totalScreenshotsFailed;
            var overallUploadTotal = _totalUploadsSuccessful + _totalUploadsFailed;
            var overallSuccessRate = overallTotal > 0 ? (_totalScreenshotsSuccessful * 100.0 / overallTotal) : 0;
            var overallUploadRate = overallUploadTotal > 0 ? (_totalUploadsSuccessful * 100.0 / overallUploadTotal) : 0;
            
            _logger.LogInformation(
                "Health Report - Period: {PeriodDuration:hh\\:mm\\:ss} | " +
                "Screenshots: {ScreenshotSuccess}/{ScreenshotTotal} ({ScreenshotRate:F1}%) | " +
                "Uploads: {UploadSuccess}/{UploadTotal} ({UploadRate:F1}%) | " +
                "Overall Runtime: {TotalDuration:hh\\:mm\\:ss} | " +
                "Total Screenshots: {TotalScreenshots} | Total Uploads: {TotalUploads}",
                periodDuration,
                _screenshotsSuccessful, periodTotal, periodSuccessRate,
                _uploadsSuccessful, periodUploadTotal, periodUploadRate,
                totalDuration,
                overallTotal, overallUploadTotal);
            
            // Check for concerning patterns
            if (periodTotal == 0 && periodDuration > TimeSpan.FromMinutes(20))
            {
                _logger.LogWarning("No screenshot activity in the last {Duration:hh\\:mm\\:ss} - possible application freeze", periodDuration);
            }
            
            if (periodTotal > 0 && periodSuccessRate < 50)
            {
                _logger.LogWarning("Screenshot success rate is very low: {Rate:F1}% - check screenshot service", periodSuccessRate);
            }
            
            if (periodUploadTotal > 0 && periodUploadRate < 50)
            {
                _logger.LogWarning("Upload success rate is very low: {Rate:F1}% - check Google Drive connectivity", periodUploadRate);
            }
            
            // Reset period counters
            _screenshotsSuccessful = 0;
            _screenshotsFailed = 0;
            _uploadsSuccessful = 0;
            _uploadsFailed = 0;
            _periodStart = DateTime.Now;
        }
    }

    public HealthReport GetHealthReport()
    {
        lock (_statsLock)
        {
            var periodDuration = DateTime.Now - _periodStart;
            var totalDuration = DateTime.Now - _applicationStart;
            
            return new HealthReport
            {
                ScreenshotsSuccessful = _screenshotsSuccessful,
                ScreenshotsFailed = _screenshotsFailed,
                UploadsSuccessful = _uploadsSuccessful,
                UploadsFailed = _uploadsFailed,
                TotalScreenshotsSuccessful = _totalScreenshotsSuccessful,
                TotalScreenshotsFailed = _totalScreenshotsFailed,
                TotalUploadsSuccessful = _totalUploadsSuccessful,
                TotalUploadsFailed = _totalUploadsFailed,
                PeriodDuration = periodDuration,
                TotalRuntime = totalDuration
            };
        }
    }
}

public record HealthReport
{
    public int ScreenshotsSuccessful { get; init; }
    public int ScreenshotsFailed { get; init; }
    public int UploadsSuccessful { get; init; }
    public int UploadsFailed { get; init; }
    public int TotalScreenshotsSuccessful { get; init; }
    public int TotalScreenshotsFailed { get; init; }
    public int TotalUploadsSuccessful { get; init; }
    public int TotalUploadsFailed { get; init; }
    public TimeSpan PeriodDuration { get; init; }
    public TimeSpan TotalRuntime { get; init; }
}
