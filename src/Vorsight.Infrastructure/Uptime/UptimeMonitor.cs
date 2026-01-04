using System.Text.Json;

namespace Vorsight.Infrastructure.Uptime;

public class UptimeMonitor
{
    private readonly string _storagePath;
    private DateTime? _currentStart;
    private DateTime? _lastSeen;
    private readonly TimeSpan _threshold = TimeSpan.FromMinutes(5);
    private readonly object _lock = new();

    public UptimeMonitor(string? storageDirectory = null)
    {
        // Default to a folder in LocalApplicationData if not specified
        if (string.IsNullOrEmpty(storageDirectory))
        {
            storageDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Vorsight", "Data");
        }
        
        Directory.CreateDirectory(storageDirectory);
        _storagePath = Path.Combine(storageDirectory, "uptime.json");
    }

    public void RecordHeartbeat()
    {
        lock (_lock)
        {
            var now = DateTime.UtcNow;

            // If this is the first heartbeat or the gap is too large, start a new interval
            if (_lastSeen == null || (now - _lastSeen.Value) > _threshold)
            {
                // Start new interval
                _currentStart = now;
                _lastSeen = now;
                
                // Append new entry
                AppendInterval(new UptimeInterval { Start = _currentStart.Value, End = _lastSeen.Value });
            }
            else
            {
                // Continue current interval
                _lastSeen = now;
                
                // Update the last entry
                UpdateLastIntervalEnd(_lastSeen.Value);
            }
        }
    }

    private void AppendInterval(UptimeInterval interval)
    {
        try
        {
            var intervals = LoadIntervals();
            intervals.Add(interval);
            SaveIntervals(intervals);
        }
        catch (Exception)
        {
            // Suppress errors during file I/O to avoid crashing the service
        }
    }

    private void UpdateLastIntervalEnd(DateTime newEnd)
    {
        try
        {
            var intervals = LoadIntervals();
            if (intervals.Count > 0)
            {
                var last = intervals[intervals.Count - 1];
                // Only update if it looks like the same interval (start matches)
                // In a simplified model, we just update the last one since we know we are 'continuing' it in memory
                if (last.Start == _currentStart) 
                {
                    last.End = newEnd;
                    SaveIntervals(intervals);
                }
                else
                {
                    // If in-memory state drifted from file state (e.g. app restart), add new
                    intervals.Add(new UptimeInterval { Start = _currentStart!.Value, End = newEnd });
                    SaveIntervals(intervals);
                }
            }
            else
            {
                // Should have been added by AppendInterval, but just in case
                intervals.Add(new UptimeInterval { Start = _currentStart!.Value, End = newEnd });
                SaveIntervals(intervals);
            }
        }
        catch (Exception)
        {
            // Suppress I/O errors
        }
    }

    private List<UptimeInterval> LoadIntervals()
    {
        if (!File.Exists(_storagePath))
        {
            return new List<UptimeInterval>();
        }

        try
        {
            var json = File.ReadAllText(_storagePath);
            return JsonSerializer.Deserialize<List<UptimeInterval>>(json) ?? new List<UptimeInterval>();
        }
        catch
        {
            return new List<UptimeInterval>();
        }
    }

    private void SaveIntervals(List<UptimeInterval> intervals)
    {
        var json = JsonSerializer.Serialize(intervals, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(_storagePath, json);
        File.WriteAllText(_storagePath, json);
    }

    public UptimeStatus GetCurrentStatus()
    {
        lock (_lock)
        {
            return new UptimeStatus
            {
                CurrentStart = _currentStart,
                LastSeen = _lastSeen,
                IsTracking = _lastSeen.HasValue && (DateTime.UtcNow - _lastSeen.Value) < _threshold
            };
        }
    }
}

public record UptimeStatus
{
    public DateTime? CurrentStart { get; init; }
    public DateTime? LastSeen { get; init; }
    public bool IsTracking { get; init; }
}

public class UptimeInterval
{
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
}
