using System.Text.Json;
using Vorsight.Core.Models;

namespace Vorsight.Service.Services.Analytics;

public class JsonFileActivityRepository : IActivityRepository, IDisposable, IAsyncDisposable
{
    private readonly List<ActivityData> _activities = new();
    private readonly ReaderWriterLockSlim _lock = new();
    private readonly ILogger<JsonFileActivityRepository> _logger;
    private readonly string _filePath;
    private readonly Timer _saveTimer;
    private bool _isDirty = false;

    public JsonFileActivityRepository(ILogger<JsonFileActivityRepository> logger)
    {
        _logger = logger;
        
        var dataDir = Path.Combine(AppContext.BaseDirectory, "data");
        Directory.CreateDirectory(dataDir);
        _filePath = Path.Combine(dataDir, "activity_history.json");

        LoadData();

        // Auto-save every 1 minute if dirty
        _saveTimer = new Timer(
            callback: _ => _ = SaveDataAsync(), 
            state: null, 
            dueTime: TimeSpan.FromMinutes(1), 
            period: TimeSpan.FromMinutes(1));
    }

    private void LoadData()
    {
        if (!File.Exists(_filePath)) return;

        try
        {
            var json = File.ReadAllText(_filePath);
            var loaded = JsonSerializer.Deserialize<List<ActivityData>>(json);
            if (loaded != null)
            {
                _lock.EnterWriteLock();
                try
                {
                    _activities.AddRange(loaded);
                    // Initial prune
                    PruneInternal(TimeSpan.FromHours(25));
                }
                finally
                {
                    _lock.ExitWriteLock();
                }
                _logger.LogInformation("Loaded {Count} activity records from disk", _activities.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load activity history");
        }
    }

    public void AddActivity(ActivityData activity)
    {
        _lock.EnterWriteLock();
        try
        {
            _activities.Add(activity);
            _isDirty = true;
        }
        finally
        {
            _lock.ExitWriteLock();
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
        _lock.EnterWriteLock();
        try
        {
            PruneInternal(retentionPeriod);
        }
        finally
        {
            _lock.ExitWriteLock();
        }
        return Task.CompletedTask;
    }

    private void PruneInternal(TimeSpan retentionPeriod)
    {
        var cutoff = DateTimeOffset.UtcNow.Subtract(retentionPeriod).ToUnixTimeSeconds();
        int removed = _activities.RemoveAll(a => a.Timestamp < cutoff);
        if (removed > 0)
        {
            _isDirty = true;
            _logger.LogDebug("Pruned {Count} old activity records", removed);
        }
    }

    private async Task SaveDataAsync()
    {
        if (!_isDirty) return;

        List<ActivityData> snapshot;
        _lock.EnterReadLock();
        try
        {
            if (_activities.Count == 0) return;
            snapshot = new List<ActivityData>(_activities);
        }
        finally
        {
            _lock.ExitReadLock();
        }

        try
        {
            var json = JsonSerializer.Serialize(snapshot);
            await File.WriteAllTextAsync(_filePath, json);
            _isDirty = false;
            // _logger.LogDebug("Saved activity history to disk");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save activity history");
        }
    }

    public void Dispose()
    {
        _saveTimer?.Dispose();
        _lock?.Dispose();
        // Sync save on dispose? Better in AsyncDispose or explict shutdown
    }

    public async ValueTask DisposeAsync()
    {
        if (_saveTimer != null) await _saveTimer.DisposeAsync();
        
        // Final save
        await SaveDataAsync();
        
        if (_lock != null) _lock.Dispose();
    }
}
