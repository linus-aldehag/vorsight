using System.Text.Json;
using Vorsight.Service.Monitoring;

namespace Vorsight.Service.Storage;

public class SessionSummary
{
    public string SessionId { get; set; } = Guid.NewGuid().ToString();
    public DateTimeOffset StartTime { get; set; } = DateTimeOffset.Now;
    public DateTimeOffset? EndTime { get; set; }
    public string ExitReason { get; set; } = "Running";
    public List<string> Exceptions { get; set; } = new();
    public HealthReport? LastHealthReport { get; set; }
}

public interface ISessionSummaryManager
{
    Task InitializeAsync();
    void RegisterException(Exception ex);
    Task CompleteSessionAsync(string reason, HealthReport? finalReport);
}

public class SessionSummaryManager : ISessionSummaryManager
{
    private readonly ILogger<SessionSummaryManager> _logger;
    private readonly IGoogleDriveService _driveService;
    private readonly string _lockFilePath;
    private readonly SessionSummary _currentSession = new();
    
    public SessionSummaryManager(ILogger<SessionSummaryManager> logger, IGoogleDriveService driveService)
    {
        _logger = logger;
        _driveService = driveService;
        _lockFilePath = Path.Combine(AppContext.BaseDirectory, "session.lock");
    }

    public async Task InitializeAsync()
    {
        // Check for previous crash
        if (File.Exists(_lockFilePath))
        {
            _logger.LogWarning("Previous session likely crashed (lock file exists)");
            try
            {
                var crashSummary = await File.ReadAllTextAsync(_lockFilePath);
                var prevSession = JsonSerializer.Deserialize<SessionSummary>(crashSummary);
                if (prevSession != null)
                {
                    prevSession.ExitReason = "Crash";
                    prevSession.EndTime = DateTimeOffset.Now; // Approximate
                    await UploadSummaryAsync(prevSession);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to recover previous session summary");
            }
        }

        // Create new lock file with initial session data
        await SaveLockFileAsync();
    }

    public void RegisterException(Exception ex)
    {
        lock (_currentSession)
        {
            _currentSession.Exceptions.Add($"{DateTimeOffset.Now}: {ex.GetType().Name} - {ex.Message}\n{ex.StackTrace}");
        }
        _ = SaveLockFileAsync(); // Fire and forget update
    }

    public async Task CompleteSessionAsync(string reason, HealthReport? finalReport)
    {
        _logger.LogInformation("Completing session with reason: {Reason}", reason);
        _currentSession.ExitReason = reason;
        _currentSession.EndTime = DateTimeOffset.Now;
        _currentSession.LastHealthReport = finalReport;

        await UploadSummaryAsync(_currentSession);

        if (File.Exists(_lockFilePath))
        {
            File.Delete(_lockFilePath);
        }
    }

    private async Task SaveLockFileAsync()
    {
        try
        {
            var json = JsonSerializer.Serialize(_currentSession);
            await File.WriteAllTextAsync(_lockFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update session lock file");
        }
    }

    private async Task UploadSummaryAsync(SessionSummary summary)
    {
        try
        {
            var json = JsonSerializer.Serialize(summary, new JsonSerializerOptions { WriteIndented = true });
            var fileName = $"session-{summary.SessionId}-{summary.StartTime:yyyyMMddHHmmss}.json";
            
            // Construct path: Temp/Vorsight/{Machine}/Logs
            var logDir = Vorsight.Infrastructure.IO.PathConfiguration.GetSessionLogPath();
            Directory.CreateDirectory(logDir);
            
            var tempPath = Path.Combine(logDir, fileName);
            
            await File.WriteAllTextAsync(tempPath, json);
            
            // Use smart upload which infers folder structure from path
             await _driveService.UploadFileAsync(tempPath, CancellationToken.None);
             
             // File deletion is handled by UploadFileAsync if successful? 
             // GoogleDriveService.InternalUploadFileAsync deletes it. Line 183.
             // Wait. UploadFileAsync -> InternalUploadFileAsync.
             // InternalUploadFileAsync does NOT delete it?
             // Line 181 in UploadQueueProcessor deletes it.
             // GoogleDriveService.InternalUploadFileAsync does NOT delete.
             // UploadFileAsync (public) calls Internal.
             // Let's check GoogleDriveService again.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload session summary");
        }
    }
}
