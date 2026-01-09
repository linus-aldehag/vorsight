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
    /// Records a successful activity tracking operation
    /// </summary>
    void RecordActivitySuccess();
    
    /// <summary>
    /// Records a failed activity tracking operation
    /// </summary>
    void RecordActivityFailure();
    
    /// <summary>
    /// Records a successful agent command execution
    /// </summary>
    void RecordAgentCommandSuccess();
    
    /// <summary>
    /// Records a failed agent command execution
    /// </summary>
    void RecordAgentCommandFailure();
    
    /// <summary>
    /// Updates the timestamp of last received activity data
    /// </summary>
    void UpdateLastActivityReceived(DateTime timestamp);
    
    /// <summary>
    /// Gets the activity health status
    /// </summary>
    ActivityHealthStatus GetActivityHealthStatus();
    
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
    private int _activitiesSuccessful;
    private int _activitiesFailed;
    private int _agentCommandsSuccessful;
    private int _agentCommandsFailed;
    private DateTime _periodStart = DateTime.Now;
    
    // Overall stats
    private int _totalScreenshotsSuccessful;
    private int _totalScreenshotsFailed;
    private int _totalUploadsSuccessful;
    private int _totalUploadsFailed;
    private int _totalActivitiesSuccessful;
    private int _totalActivitiesFailed;
    private int _totalAgentCommandsSuccessful;
    private int _totalAgentCommandsFailed;
    private DateTime _applicationStart = DateTime.Now;
    private DateTime _lastActivityReceived = DateTime.MinValue;
    
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
    
    public void RecordActivitySuccess()
    {
        lock (_statsLock)
        {
            _activitiesSuccessful++;
            _totalActivitiesSuccessful++;
        }
    }
    
    public void RecordActivityFailure()
    {
        lock (_statsLock)
        {
            _activitiesFailed++;
            _totalActivitiesFailed++;
        }
    }
    
    public void RecordAgentCommandSuccess()
    {
        lock (_statsLock)
        {
            _agentCommandsSuccessful++;
            _totalAgentCommandsSuccessful++;
        }
    }
    
    public void RecordAgentCommandFailure()
    {
        lock (_statsLock)
        {
            _agentCommandsFailed++;
            _totalAgentCommandsFailed++;
        }
    }
    
    public void UpdateLastActivityReceived(DateTime timestamp)
    {
        lock (_statsLock)
        {
            _lastActivityReceived = timestamp;
        }
    }
    
    public ActivityHealthStatus GetActivityHealthStatus()
    {
        lock (_statsLock)
        {
            // If we've never received activity data
            if (_lastActivityReceived == DateTime.MinValue)
            {
                return ActivityHealthStatus.Unknown;
            }
            
            var timeSinceLastActivity = DateTime.Now - _lastActivityReceived;
            
            // Check if activity is stale (no data for 10+ minutes)
            if (timeSinceLastActivity > TimeSpan.FromMinutes(10))
            {
                return ActivityHealthStatus.Failed;
            }
            
            // Check recent failure rate (in current period)
            var totalActivities = _activitiesSuccessful + _activitiesFailed;
            if (totalActivities > 0)
            {
                var successRate = _activitiesSuccessful * 100.0 / totalActivities;
                if (successRate < 50)
                {
                    return ActivityHealthStatus.Degraded;
                }
            }
            
            // Check agent command execution
            var totalCommands = _agentCommandsSuccessful + _agentCommandsFailed;
            if (totalCommands > 5) // Only check if we have meaningful sample
            {
                var commandSuccessRate = _agentCommandsSuccessful * 100.0 / totalCommands;
                if (commandSuccessRate < 50)
                {
                    return ActivityHealthStatus.Degraded;
                }
            }
            
            return ActivityHealthStatus.Healthy;
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
            
            // Activity stats
            var periodActivityTotal = _activitiesSuccessful + _activitiesFailed;
            var periodActivityRate = periodActivityTotal > 0 ? (_activitiesSuccessful * 100.0 / periodActivityTotal) : 0;
            var periodCommandTotal = _agentCommandsSuccessful + _agentCommandsFailed;
            var periodCommandRate = periodCommandTotal > 0 ? (_agentCommandsSuccessful * 100.0 / periodCommandTotal) : 0;
            
            var overallActivityTotal = _totalActivitiesSuccessful + _totalActivitiesFailed;
            var overallCommandTotal = _totalAgentCommandsSuccessful + _totalAgentCommandsFailed;
            
            var timeSinceLastActivity = _lastActivityReceived != DateTime.MinValue 
                ? DateTime.Now - _lastActivityReceived 
                : TimeSpan.Zero;
            
            _logger.LogInformation(
                "Health Report - Period: {PeriodDuration:hh\\:mm\\:ss} | " +
                "Screenshots: {ScreenshotSuccess}/{ScreenshotTotal} ({ScreenshotRate:F1}%) | " +
                "Uploads: {UploadSuccess}/{UploadTotal} ({UploadRate:F1}%) | " +
                "Activities: {ActivitySuccess}/{ActivityTotal} ({ActivityRate:F1}%) | " +
                "Agent Commands: {CommandSuccess}/{CommandTotal} ({CommandRate:F1}%) | " +
                "Last Activity: {LastActivity:mm\\:ss}s ago | " +
                "Overall Runtime: {TotalDuration:hh\\:mm\\:ss}",
                periodDuration,
                _screenshotsSuccessful, periodTotal, periodSuccessRate,
                _uploadsSuccessful, periodUploadTotal, periodUploadRate,
                _activitiesSuccessful, periodActivityTotal, periodActivityRate,
                _agentCommandsSuccessful, periodCommandTotal, periodCommandRate,
                timeSinceLastActivity,
                totalDuration);
            
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
            
            // Activity health warnings
            if (_lastActivityReceived != DateTime.MinValue && timeSinceLastActivity > TimeSpan.FromMinutes(10))
            {
                _logger.LogWarning("No activity data received in {Duration:hh\\:mm\\:ss} - activity tracking may have stopped", timeSinceLastActivity);
            }
            
            if (periodActivityTotal > 0 && periodActivityRate < 50)
            {
                _logger.LogWarning("Activity success rate is very low: {Rate:F1}% - check activity processing", periodActivityRate);
            }
            
            if (periodCommandTotal > 5 && periodCommandRate < 50)
            {
                _logger.LogWarning("Agent command success rate is very low: {Rate:F1}% - check agent executable and session access", periodCommandRate);
            }
            
            // Reset period counters
            _screenshotsSuccessful = 0;
            _screenshotsFailed = 0;
            _uploadsSuccessful = 0;
            _uploadsFailed = 0;
            _activitiesSuccessful = 0;
            _activitiesFailed = 0;
            _agentCommandsSuccessful = 0;
            _agentCommandsFailed = 0;
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
