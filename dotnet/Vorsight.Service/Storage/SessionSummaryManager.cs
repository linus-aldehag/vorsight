using System.Text.Json;
using Vorsight.Infrastructure.IO;
using Vorsight.Service.Monitoring;

namespace Vorsight.Service.Storage;

public class SessionSummary
{
    public string SessionId { get; init; } = Guid.NewGuid().ToString();
    public DateTimeOffset StartTime { get; init; } = DateTimeOffset.Now;
    public DateTimeOffset? EndTime { get; set; }
    public string ExitReason { get; set; } = "Running";
    public List<string> Exceptions { get; init; } = [];
    public HealthReport? LastHealthReport { get; set; }
}

public interface ISessionSummaryManager
{
    Task InitializeAsync();
    void RegisterException(Exception ex);
    Task CompleteSessionAsync(string reason, HealthReport? finalReport);
}

public class SessionSummaryManager(
    ILogger<SessionSummaryManager> logger,
    IGoogleDriveService driveService
) : ISessionSummaryManager
{
    private readonly string _lockFilePath = Path.Combine(AppContext.BaseDirectory, "session.lock");
    private readonly SessionSummary _currentSession = new();

    public async Task InitializeAsync()
    {
        // Check for previous crash
        if (File.Exists(_lockFilePath))
        {
            logger.LogWarning("Previous session likely crashed (lock file exists)");
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
                logger.LogError(ex, "Failed to recover previous session summary");
            }
        }

        // Create new lock file with initial session data
        await SaveLockFileAsync();
    }

    public void RegisterException(Exception ex)
    {
        lock (_currentSession)
        {
            _currentSession.Exceptions.Add(
                $"{DateTimeOffset.Now}: {ex.GetType().Name} - {ex.Message}\n{ex.StackTrace}"
            );
        }
        _ = SaveLockFileAsync(); // Fire and forget update
    }

    public async Task CompleteSessionAsync(string reason, HealthReport? finalReport)
    {
        logger.LogInformation("Completing session with reason: {Reason}", reason);
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
            logger.LogError(ex, "Failed to update session lock file");
        }
    }

    private async Task UploadSummaryAsync(SessionSummary summary)
    {
        try
        {
            var json = JsonSerializer.Serialize(
                summary,
                new JsonSerializerOptions { WriteIndented = true }
            );
            var fileName = $"session-{summary.SessionId}-{summary.StartTime:yyyyMMddHHmmss}.json";

            // Construct path: Temp/Vorsight/{Machine}/Logs
            var logDir = PathConfiguration.GetSessionLogPath();
            Directory.CreateDirectory(logDir);

            var tempPath = Path.Combine(logDir, fileName);

            await File.WriteAllTextAsync(tempPath, json);

            // Upload to Google Drive with custom folder path
            var machineName = Environment.MachineName;
            var targetFolder = $"Vorsight/{machineName}/Sessions";
            await driveService.UploadFileAsync(tempPath, CancellationToken.None, targetFolder);

            // Delete the local file after successful upload
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
                logger.LogDebug("Deleted session summary file after upload: {FilePath}", tempPath);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload session summary");
        }
    }
}
