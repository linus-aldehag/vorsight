using System.Text.Json;
using Vorsight.Service.Services;

namespace Vorsight.Service.Services;

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
            var tempPath = Path.Combine(Path.GetTempPath(), fileName);
            
            await File.WriteAllTextAsync(tempPath, json);
            
            // Assuming we have a dedicated folder for logs, or root for now
            // We need to implement UploadFileAsync in GoogleDriveService or use public one.
            // Using logic similar to UploadQueueProcessor but direct
            
            // Note: This relies on GoogleDriveService being initialized and auth'd
             var folderId = await _driveService.EnsureFolderExistsAsync("Vorsight Logs");
             if (folderId != null) 
             {
                 await _driveService.UploadFileAsync(tempPath, fileName, "application/json", folderId);
                 _logger.LogInformation("Uploaded session summary: {FileName}", fileName);
             }
             
             File.Delete(tempPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload session summary");
        }
    }
}
