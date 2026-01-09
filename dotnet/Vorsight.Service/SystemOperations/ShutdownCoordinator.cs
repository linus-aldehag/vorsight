using System.Threading.Tasks.Dataflow;
using Timer = System.Threading.Timer;

namespace Vorsight.Service.SystemOperations;

/// <summary>
/// Interface for coordinating graceful shutdown of the application
/// </summary>
public interface IShutdownCoordinator
{
    /// <summary>
    /// Called when the application is shutting down to ensure all pending operations complete
    /// </summary>
    Task ShutdownGracefullyAsync(TimeSpan? timeout = null);
    
    /// <summary>
    /// Register an upload queue for shutdown coordination
    /// </summary>
    void RegisterUploadQueue(BufferBlock<string> queue);
    
    /// <summary>
    /// Deregister an upload queue from shutdown coordination
    /// </summary>
    void DeregisterUploadQueue(BufferBlock<string> queue);
}

/// <summary>
/// Coordinates graceful shutdown of the application
/// </summary>
public class ShutdownCoordinator(ILogger<ShutdownCoordinator> logger) : IShutdownCoordinator
{
    private readonly List<BufferBlock<string>> _uploadQueues = [];
    private readonly SemaphoreSlim _lock = new(1, 1);

    /// <summary>
    /// Register an upload queue for shutdown coordination
    /// </summary>
    public void RegisterUploadQueue(BufferBlock<string> queue)
    {
        _lock.Wait();
        try
        {
            _uploadQueues.Add(queue);
            logger.LogDebug("Upload queue registered for shutdown coordination");
        }
        finally
        {
            _lock.Release();
        }
    }
    
    /// <summary>
    /// Deregister an upload queue from shutdown coordination
    /// </summary>
    public void DeregisterUploadQueue(BufferBlock<string> queue)
    {
        _lock.Wait();
        try
        {
            if (_uploadQueues.Remove(queue))
            {
                logger.LogDebug("Upload queue deregistered from shutdown coordination");
            }
        }
        finally
        {
            _lock.Release();
        }
    }
    
    /// <summary>
    /// Wait for all pending uploads to complete or timeout
    /// </summary>
    public async Task ShutdownGracefullyAsync(TimeSpan? timeout = null)
    {
        var actualTimeout = timeout ?? TimeSpan.FromSeconds(30);
        logger.LogInformation("Beginning graceful shutdown, waiting up to {Timeout} seconds for uploads to complete", actualTimeout.TotalSeconds);
        
        await _lock.WaitAsync();
        List<BufferBlock<string>> queues;
        try
        {
            // Create a copy to avoid modification during enumeration
            queues = new List<BufferBlock<string>>(_uploadQueues);
        }
        finally
        {
            _lock.Release();
        }
        
        if (queues.Count == 0)
        {
            logger.LogInformation("No active upload queues to wait for");
            return;
        }
        
        // Wait for all queues to empty or complete
        var completionTasks = queues.Select(q => WaitForQueueEmptyAsync(q, actualTimeout)).ToList();
        
        try
        {
            await Task.WhenAll(completionTasks);
            logger.LogInformation("All pending uploads completed successfully");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Some uploads did not complete within the timeout period");
        }
    }
    
    private async Task WaitForQueueEmptyAsync(BufferBlock<string> queue, TimeSpan timeout)
    {
        var initialCount = queue.Count;
        
        if (initialCount > 0)
        {
            logger.LogInformation("Waiting for {Count} pending uploads to complete", initialCount);
            
            // Create a task that completes when the queue is empty or completed
            var completionSource = new TaskCompletionSource<bool>();
            
            // Check periodically if the queue is empty
            await using var timer = new Timer(state =>
            {
                if (queue.Count != 0 && !queue.Completion.IsCompleted) return;
                var tcs = (TaskCompletionSource<bool>)state!;
                tcs.TrySetResult(true);
            }, completionSource, 0, 500);
            
            // Also complete when the queue completion task completes
            await queue.Completion.ContinueWith(_ => completionSource.TrySetResult(true));
            
            // Create a task that completes after the timeout
            var timeoutTask = Task.Delay(timeout);
            
            // Wait for either the queue to empty or the timeout
            var completedTask = await Task.WhenAny(completionSource.Task, timeoutTask);
            
            if (completedTask == timeoutTask)
            {
                logger.LogWarning("Timed out waiting for upload queue to empty. {RemainingCount} items left", queue.Count);
                throw new TimeoutException($"Timed out waiting for upload queue to empty. {queue.Count} items left");
            }
            
            logger.LogInformation("Upload queue emptied successfully");
        }
        else
        {
            logger.LogInformation("Upload queue is already empty");
        }
    }
}
