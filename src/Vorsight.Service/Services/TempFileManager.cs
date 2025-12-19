namespace Vorsight.Service.Services;

/// <summary>
/// Service for managing temporary file cleanup and retry logic
/// </summary>
public interface ITempFileManager
{
    /// <summary>
    /// Starts the periodic cleanup process
    /// </summary>
    Task StartPeriodicCleanupAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Implementation of temporary file manager
/// </summary>
public class TempFileManager(
    ILogger<TempFileManager> logger,
    IConfiguration configuration,
    IUploadQueueProcessor uploadQueueProcessor)
    : ITempFileManager
{
    private readonly string _tempPath = Path.Combine(Path.GetTempPath(), "Vorsight", Environment.MachineName);
    private readonly TimeSpan _maxFileAge = TimeSpan.FromHours(configuration.GetValue("TempFileManager:MaxFileAgeHours", 24));
    private readonly TimeSpan _retryFailedUploadsInterval = TimeSpan.FromMinutes(configuration.GetValue("TempFileManager:RetryFailedUploadsIntervalMinutes", 30));
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(configuration.GetValue("TempFileManager:CleanupIntervalHours", 6));
    
    private static readonly TimeSpan MinAgeForRetry = TimeSpan.FromMinutes(5);

    public async Task StartPeriodicCleanupAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Starting periodic cleanup (cleanup every {CleanupInterval}, retry every {RetryInterval})", 
            _cleanupInterval, _retryFailedUploadsInterval);
        
        var cleanupTask = RunPeriodicTaskAsync("cleanup", _cleanupInterval, CleanupOldFilesAsync, cancellationToken);
        var retryTask = RunPeriodicTaskAsync("retry", _retryFailedUploadsInterval, RetryFailedUploadsAsync, cancellationToken);
        
        try
        {
            await Task.WhenAll(cleanupTask, retryTask);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            logger.LogInformation("Periodic cleanup stopped");
        }
    }

    private async Task CleanupOldFilesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var filesToDelete = GetFilesOlderThan(_maxFileAge);
            
            if (filesToDelete.Count > 0)
            {
                logger.LogInformation("Cleaning up {Count} old temporary files (older than {MaxAge})", 
                    filesToDelete.Count, _maxFileAge);
                
                DeleteFiles(filesToDelete);
                await CleanupEmptyDirectoriesAsync(_tempPath);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during old file cleanup");
        }
    }

    private async Task RetryFailedUploadsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var failedFiles = GetFilesInAgeRange(MinAgeForRetry, _maxFileAge);
            
            if (failedFiles.Count > 0)
            {
                logger.LogInformation("Re-queuing {Count} potentially failed upload files", failedFiles.Count);
                await EnqueueFiles(failedFiles, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during failed upload retry");
        }
    }

    private List<string> GetFilesOlderThan(TimeSpan maxAge)
    {
        if (!Directory.Exists(_tempPath))
            return [];

        var cutoffTime = DateTime.Now - maxAge;
        var files = new List<string>();
        
        foreach (var directory in Directory.GetDirectories(_tempPath))
        {
            files.AddRange(Directory.GetFiles(directory, "*.png", SearchOption.AllDirectories)
                .Where(file => new FileInfo(file).CreationTime < cutoffTime));
        }
        
        return files;
    }
    
    private List<string> GetFilesInAgeRange(TimeSpan minAge, TimeSpan maxAge)
    {
        if (!Directory.Exists(_tempPath))
            return [];

        var now = DateTime.Now;
        var files = new List<string>();
        
        foreach (var directory in Directory.GetDirectories(_tempPath))
        {
            files.AddRange(Directory.GetFiles(directory, "*.png", SearchOption.AllDirectories)
                .Where(file =>
                {
                    var age = now - new FileInfo(file).CreationTime;
                    return age > minAge && age < maxAge;
                }));
        }
        
        return files;
    }

    private void DeleteFiles(IEnumerable<string> files)
    {
        foreach (var file in files)
        {
            try
            {
                File.Delete(file);
                logger.LogDebug("Deleted old file: {FilePath}", file);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to delete old file: {FilePath}", file);
            }
        }
    }

    private async Task EnqueueFiles(IEnumerable<string> files, CancellationToken cancellationToken)
    {
        foreach (var file in files)
        {
            try
            {
                await uploadQueueProcessor.EnqueueFileAsync(file, cancellationToken);
                logger.LogDebug("Re-queued failed upload: {FilePath}", file);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to re-queue file: {FilePath}", file);
            }
        }
    }

    private async Task RunPeriodicTaskAsync(
        string taskName, 
        TimeSpan interval, 
        Func<CancellationToken, Task> task, 
        CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await task(cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in periodic {TaskName} task", taskName);
            }
            
            try
            {
                await Task.Delay(interval, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
    
    private async Task CleanupEmptyDirectoriesAsync(string rootPath)
    {
        try
        {
            foreach (var directory in Directory.GetDirectories(rootPath))
            {
                await CleanupEmptyDirectoriesAsync(directory);

                if (Directory.EnumerateFileSystemEntries(directory).Any())
                    continue;
                
                try
                {
                    Directory.Delete(directory);
                    logger.LogDebug("Deleted empty directory: {Directory}", directory);
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Failed to delete empty directory: {Directory}", directory);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Error cleaning up empty directories in: {RootPath}", rootPath);
        }
    }
}
