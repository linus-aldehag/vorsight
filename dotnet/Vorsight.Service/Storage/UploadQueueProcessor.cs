using System.Threading.Tasks.Dataflow;

using Vorsight.Service.SystemOperations;
using Vorsight.Service.Monitoring;

/// <summary>
/// Handles processing of screenshot uploads from a queue
/// </summary>
namespace Vorsight.Service.Storage;

public interface IUploadQueueProcessor
{
    /// <summary>
    /// Initializes and starts the upload queue processor
    /// </summary>
    Task StartAsync(CancellationToken cancellationToken);
    
    /// <summary>
    /// Enqueues a file for upload
    /// </summary>
    /// <param name="filePath">Path to the file to upload</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task EnqueueFileAsync(string filePath, CancellationToken cancellationToken);
    
    /// <summary>
    /// Completes the queue and waits for processing to finish
    /// </summary>
    Task CompleteAsync(TimeSpan? timeout = null);
}

/// <summary>
/// Implementation of the upload queue processor
/// </summary>
public class UploadQueueProcessor : IUploadQueueProcessor, IDisposable
{
    private readonly ILogger<UploadQueueProcessor> _logger;
    private readonly IGoogleDriveService _googleDriveService;
    private readonly IShutdownCoordinator _shutdownCoordinator;
    private readonly IHealthMonitor _healthMonitor;
    private readonly BufferBlock<string> _uploadQueue = new();
    private readonly CancellationTokenSource _internalCts = new();
    private readonly HashSet<string> _queuedFiles = []; // Track queued files
    private readonly Lock _queuedFilesLock = new();
    private Task? _processorTask;
    
    public UploadQueueProcessor(
        ILogger<UploadQueueProcessor> logger, 
        IGoogleDriveService googleDriveService, 
        IShutdownCoordinator shutdownCoordinator,
        IHealthMonitor healthMonitor)
    {
        _logger = logger;
        _googleDriveService = googleDriveService;
        _shutdownCoordinator = shutdownCoordinator;
        _healthMonitor = healthMonitor;
        
        // Register with the shutdown coordinator
        _shutdownCoordinator.RegisterUploadQueue(_uploadQueue);
    }
    
    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (_processorTask != null)
        {
            _logger.LogWarning("Upload processor already started");
            return Task.CompletedTask;
        }
        
        if (_isDisposed)
        {
            _logger.LogError("Attempted to start UploadQueueProcessor after disposal");
            return Task.CompletedTask;
        }

        var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, _internalCts.Token);
        _processorTask = ProcessUploadsAsync(linkedCts.Token);
        
        _logger.LogInformation("Upload processor started");
        return Task.CompletedTask;
    }
    
    public Task EnqueueFileAsync(string filePath, CancellationToken cancellationToken)
    {
        if (IsCompleted)
        {
            throw new InvalidOperationException("Cannot enqueue to a completed queue");
        }
        
        lock (_queuedFilesLock)
        {
            if (!_queuedFiles.Add(filePath))
            {
                _logger.LogDebug("File already queued for upload: {FilePath}", filePath);
                return Task.CompletedTask;
            }
        }
        
        _logger.LogDebug("Enqueuing file for upload: {FilePath}", filePath);
        return _uploadQueue.SendAsync(filePath, cancellationToken);
    }
    
    public int QueueCount => _uploadQueue.Count;
    
    public bool IsCompleted => _uploadQueue.Completion.IsCompleted;
    
    public async Task CompleteAsync(TimeSpan? timeout = null)
    {
        var actualTimeout = timeout ?? TimeSpan.FromSeconds(3); // Reduced from 10s to 3s
        
        _logger.LogInformation("Completing upload queue with {Count} items", _uploadQueue.Count);
        _uploadQueue.Complete();
        
        if (_processorTask != null)
        {
            try
            {
                var timeoutTask = Task.Delay(actualTimeout);
                var completedTask = await Task.WhenAny(_processorTask, timeoutTask);
                
                if (completedTask == timeoutTask && !_processorTask.IsCompleted)
                {
                    _logger.LogWarning("Upload processor did not complete within {Timeout}s, canceling...", actualTimeout.TotalSeconds);
                    await _internalCts.CancelAsync();
                }
                else
                {
                    _logger.LogInformation("Upload processor completed successfully");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error waiting for upload processor to complete");
            }
        }
    }
    
    
    private async Task ProcessUploadsAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Upload Queue Processing Loop Started");
            while (!cancellationToken.IsCancellationRequested && !_uploadQueue.Completion.IsCompleted)
            {
                string filePath;
                try
                {
                    // Use a timeout to periodically check the cancellation token
                    var receiveTask = _uploadQueue.ReceiveAsync(cancellationToken);
                    // Increased check frequency to debug
                    var timeoutTask = Task.Delay(5000, CancellationToken.None); 
                    
                    var completedTask = await Task.WhenAny(receiveTask, timeoutTask);
                    if (completedTask == timeoutTask)
                    {
                        if (cancellationToken.IsCancellationRequested && _uploadQueue.Count == 0)
                        {
                            break; 
                        }
                        // Log periodically if queue is idle but running
                        if (DateTime.UtcNow.Second % 30 < 5) 
                             _logger.LogTrace("Upload queue idle. Queue count: {Count}", _uploadQueue.Count);
                        continue; 
                    }
                    
                    filePath = await receiveTask;
                    _logger.LogDebug("Dequeued item: {FilePath}", filePath);
                }
                catch (InvalidOperationException) when (_uploadQueue.Completion.IsCompleted)
                {
                    // Queue is completed and empty
                    break;
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    // If we have items remaining in the queue during shutdown, log them
                    if (_uploadQueue.Count > 0) 
                    {
                        _logger.LogInformation("Shutdown requested with {Count} items still in upload queue", _uploadQueue.Count);
                    }
                    break;
                }

                try
                {
                    _logger.LogDebug("Processing upload for file: {FilePath}", filePath);
                    await _googleDriveService.UploadFileAsync(filePath, cancellationToken);
                    _healthMonitor.RecordUploadSuccess();
                    
                    // Only delete the file if upload was successful and not cancelling
                    if (!cancellationToken.IsCancellationRequested && File.Exists(filePath))
                    {
                        File.Delete(filePath);
                        
                        // Clean up empty parent directory if possible
                        try
                        {
                            var parentDir = Path.GetDirectoryName(filePath);
                            if (!string.IsNullOrEmpty(parentDir) && Directory.Exists(parentDir))
                            {
                                if (!Directory.EnumerateFileSystemEntries(parentDir).Any())
                                {
                                    Directory.Delete(parentDir);
                                    _logger.LogDebug("Cleaned up empty directory: {Directory}", parentDir);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogDebug(ex, "Could not clean up parent directory for: {FilePath}", filePath);
                        }
                    }
                    
                    // Remove from queued files tracking after successful processing
                    lock (_queuedFilesLock)
                    {
                        _queuedFiles.Remove(filePath);
                    }
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    _logger.LogInformation("Upload cancelled during shutdown: {FilePath}", filePath);
                    
                    // Remove from tracking even if cancelled
                    lock (_queuedFilesLock)
                    {
                        _queuedFiles.Remove(filePath);
                    }
                }
                catch (Exception ex)
                {
                    _healthMonitor.RecordUploadFailure();
                    _logger.LogError(ex, "Error processing upload for file: {FilePath}", filePath);
                    
                    // Remove from tracking even if failed
                    lock (_queuedFilesLock)
                    {
                        _queuedFiles.Remove(filePath);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in upload processor");
        }
        finally
        {
            _logger.LogInformation("Upload processor completed");
        }
    }

    private bool _isDisposed;

    public void Dispose()
    {
        if (_isDisposed) return;
        _isDisposed = true;
        _logger?.LogInformation("Disposing UploadQueueProcessor");
        
        _shutdownCoordinator.DeregisterUploadQueue(_uploadQueue);
        _internalCts.Dispose();
        GC.SuppressFinalize(this);
    }
}
