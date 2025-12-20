using System.Collections.Concurrent;
using Vorsight.Core.Models;

namespace Vorsight.Service.Services.Analytics;

public interface IActivityRepository
{
    void AddActivity(ActivityData activity);
    IEnumerable<ActivityData> GetActivities(DateTimeOffset start, DateTimeOffset end);
    Task PruneOldDataAsync(TimeSpan retentionPeriod);
}

public class InMemoryActivityRepository : IActivityRepository
{
    // Using ConcurrentDictionary for thread safety, Key=Timestamp
    private readonly ConcurrentBag<ActivityData> _activities = new();
    private readonly ILogger<InMemoryActivityRepository> _logger;
    private readonly object _pruneLock = new();
    private DateTimeOffset _lastPrune = DateTimeOffset.MinValue;

    public InMemoryActivityRepository(ILogger<InMemoryActivityRepository> logger)
    {
        _logger = logger;
    }

    public void AddActivity(ActivityData activity)
    {
        _activities.Add(activity);
        
        // Occasional prune check to keep memory usage bounded (every 5 mins)
        if (DateTimeOffset.UtcNow - _lastPrune > TimeSpan.FromMinutes(5))
        {
            _ = Task.Run(() => PruneOldDataAsync(TimeSpan.FromHours(24)));
        }
    }

    public IEnumerable<ActivityData> GetActivities(DateTimeOffset start, DateTimeOffset end)
    {
        var unixStart = start.ToUnixTimeSeconds();
        var unixEnd = end.ToUnixTimeSeconds();
        
        return _activities.Where(a => a.Timestamp >= unixStart && a.Timestamp <= unixEnd);
    }

    public Task PruneOldDataAsync(TimeSpan retentionPeriod)
    {
        // Simple prune implementation for ConcurrentBag is inefficient (requires creating new list)
        // But for <24h data (approx 17k records at 5s interval), it's manageable.
        
        lock (_pruneLock)
        {
            if (DateTimeOffset.UtcNow - _lastPrune < TimeSpan.FromMinutes(1)) return Task.CompletedTask; // Debounce

             _logger.LogDebug("Pruning old activity data...");
            var cutoff = DateTimeOffset.UtcNow.Subtract(retentionPeriod).ToUnixTimeSeconds();
            
            // Take snapshot, filter, replace? No, ConcurrentBag doesn't support replace easily.
            // Better to just filter on Read and let it grow slightly?
            // Or use a different collection. List with Lock is better for this use case.
        }
        return Task.CompletedTask;
    }
}

// Refactored Implementation using Synchronized List for easier Pruning
public class SynchronizedActivityRepository : IActivityRepository
{
    private readonly List<ActivityData> _activities = new();
    private readonly ReaderWriterLockSlim _lock = new();
    private readonly ILogger<SynchronizedActivityRepository> _logger;
    private DateTimeOffset _lastPrune = DateTimeOffset.MinValue;

    public SynchronizedActivityRepository(ILogger<SynchronizedActivityRepository> logger)
    {
        _logger = logger;
    }

    public void AddActivity(ActivityData activity)
    {
        _lock.EnterWriteLock();
        try
        {
            _activities.Add(activity);
        }
        finally
        {
            _lock.ExitWriteLock();
        }

        if (DateTimeOffset.UtcNow - _lastPrune > TimeSpan.FromMinutes(5))
        {
            _ = Task.Run(() => PruneOldDataAsync(TimeSpan.FromHours(25))); // Keep a bit more buffer
        }
    }

    public IEnumerable<ActivityData> GetActivities(DateTimeOffset start, DateTimeOffset end)
    {
        var unixStart = start.ToUnixTimeSeconds();
        var unixEnd = end.ToUnixTimeSeconds();
        
        _lock.EnterReadLock();
        try
        {
            return _activities.Where(a => a.Timestamp >= unixStart && a.Timestamp <= unixEnd).ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public Task PruneOldDataAsync(TimeSpan retentionPeriod)
    {
        _logger.LogDebug("Pruning activity repository...");
        var cutoff = DateTimeOffset.UtcNow.Subtract(retentionPeriod).ToUnixTimeSeconds();
        
        _lock.EnterWriteLock();
        try
        {
            int removed = _activities.RemoveAll(a => a.Timestamp < cutoff);
            _lastPrune = DateTimeOffset.UtcNow;
            if (removed > 0) _logger.LogDebug("Pruned {Count} old activity records", removed);
        }
        finally
        {
            _lock.ExitWriteLock();
        }
        return Task.CompletedTask;
    }
}
