using System.Diagnostics.Eventing.Reader;
using Microsoft.Extensions.Logging;
using Vorsight.Infrastructure.Contracts;
using Vorsight.Contracts.Audit;
using Vorsight.Contracts.Settings;

namespace Vorsight.Infrastructure.Audit;

/// <summary>
/// Implementation of audit manager for Windows Event Log monitoring.
/// Detects and logs security events indicating admin tampering.
/// </summary>
[System.Runtime.Versioning.SupportedOSPlatform("windows")]
public class AuditManager(ILogger<AuditManager> logger) : IAuditManager
{
    private bool _disposed;
    
    // Deduplication
    private readonly Dictionary<string, DateTime> _recentEventHashes = new();
    private readonly TimeSpan _dedupeWindow = TimeSpan.FromSeconds(5);
    private readonly object _dedupeLock = new();

    // Events for audit notifications
    public event EventHandler<AuditEventDetectedEventArgs>? CriticalEventDetected;
    public event EventHandler<TamperingDetectedEventArgs>? TamperingDetected;

    protected virtual void OnCriticalEventDetected(AuditEventDetectedEventArgs e)
    {
        CriticalEventDetected?.Invoke(this, e);
    }

    protected virtual void OnTamperingDetected(TamperingDetectedEventArgs e)
    {
        TamperingDetected?.Invoke(this, e);
    }

    public bool IsMonitoring { get; private set; }

    public async Task InitializeAsync()
    {
        ThrowIfDisposed();
        logger.LogInformation("Audit manager initialized");
        await Task.CompletedTask;
    }

    private readonly List<EventLogWatcher> _activeWatchers = new();

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public async Task StartMonitoringAsync(AgentSettings settings)
    {
        ThrowIfDisposed();

        if (IsMonitoring)
        {
            // If already monitoring, restart to apply new settings
            await StopMonitoringAsync();
        }

        try
        {
            // 1. Security Log Watcher (High Priority)
            if (settings.AuditLogSecurityEnabled)
            {
                StartWatcher("Security", BuildSecurityQuery());
            }

            // 2. System Log Watcher (Services, Startups)
            if (settings.AuditLogSystemEnabled)
            {
                StartWatcher("System", BuildSystemQuery());
            }

            // 3. Application Log Watcher (Optional/Future use)
            if (settings.AuditLogApplicationEnabled)
            {
                // Basic application audit - can be expanded later
                StartWatcher("Application", "*[System[Level<=3]]"); // Error, Warning, Critical
            }
            
            IsMonitoring = true;
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error starting event log monitoring");
            IsMonitoring = false;
        }
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private void StartWatcher(string logName, string query)
    {
        try
        {
            var eventQuery = new EventLogQuery(logName, PathType.LogName, query);
            var watcher = new EventLogWatcher(eventQuery);
            
            watcher.EventRecordWritten += (sender, e) => 
                LogWatcher_EventRecordWritten(sender, e, logName);
            
            watcher.Enabled = true;
            _activeWatchers.Add(watcher);
            
            logger.LogInformation("Started monitoring {LogName} log with query: {Query}", logName, query);
        }
        catch (EventLogException ex)
        {
            logger.LogWarning(ex, "Could not initialize watcher for {LogName}. Ensure permissions.", logName);
        }
    }

    private string BuildSecurityQuery()
    {
        // Security specific events: User management, Audit tampering, Process creation
        return @"*[System[(
            EventID=4720 or
            EventID=4732 or
            EventID=4728 or
            EventID=4672 or
            EventID=4697 or
            EventID=4698 or
            EventID=4699 or
            EventID=4700 or
            EventID=4701 or
            EventID=4702 or
            EventID=1102 or
            EventID=4719
        )]]";
    }

    private string BuildSystemQuery()
    {
        // System specific events: Service Installation (System Log typically has 7045)
        return @"*[System[(
            EventID=7045 or
            EventID=7040
        )]]";
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private void LogWatcher_EventRecordWritten(object? sender, EventRecordWrittenEventArgs e, string logName)
    {
        try
        {
            using var eventRecord = e.EventRecord;
            if (eventRecord == null) return;

            var evt = new AuditEvent
            {
                Timestamp = eventRecord.TimeCreated ?? DateTime.UtcNow,
                EventId = eventRecord.Id.ToString(),
                EventType = eventRecord.TaskDisplayName ?? $"{logName} Event",
                SourceLogName = logName,
                Username = "System", // Default, extraction logic could be improved
                Details = eventRecord.FormatDescription() ?? "No description available",
                IsFlagged = false // Default to Unflagged (History). Explicitly flag tampering events.
            };
            
            // Check for duplicates before processing
            if (IsDuplicate(evt))
            {
                // logger.LogDebug("Skipping duplicate event {Id}", evt.EventId);
                return;
            }
            
            ProcessEvent(evt, eventRecord.Id, logName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing event log record from {LogName}", logName);
        }
    }

    private void ProcessEvent(AuditEvent evt, int eventId, string logName)
    {
        switch (eventId)
        {
            // --- Security Log Events ---
            case 4720: // User Created
                NotifyCriticalEvent(evt, "User Account Created");
                break;
                
            case 4732:
            case 4728: // Added to group
                NotifyCriticalEvent(evt, "Group Membership Changed");
                break;
                
            case 4672: // Admin login
                break;
                
            case 4697: // Service installed (Security log)
                evt.EventType = "Service Installed (Security)";
                NotifyCriticalEvent(evt, "New service installed via security event");
                break;
                
            case 4698: // Scheduled task created
                evt.EventType = "Scheduled Task Created";
                NotifyCriticalEvent(evt, "New scheduled task created");
                break;
                
            case 4699: // Scheduled task deleted - Potentially suspicious if unexpected
                evt.EventType = "Scheduled Task Deleted";
                // evt.IsFlagged = true; // Uncomment to flag deletions
                NotifyCriticalEvent(evt, "Scheduled task deleted");
                break;
                
            case 4700: // Scheduled task enabled
                evt.EventType = "Scheduled Task Enabled";
                NotifyCriticalEvent(evt, "Scheduled task enabled");
                break;
                
            case 4701: // Scheduled task disabled
                evt.EventType = "Scheduled Task Disabled";
                NotifyCriticalEvent(evt, "Scheduled task disabled");
                break;
                
            case 4702: // Scheduled task updated
                evt.EventType = "Scheduled Task Updated";
                NotifyCriticalEvent(evt, "Scheduled task modified");
                break;
                
            case 1102: // Audit log cleared - CRITICAL!
                evt.EventType = "Audit Log Cleared";
                evt.IsFlagged = true; // Tampering
                logger.LogCritical("CRITICAL: Audit log tampering detected! EventID={EventId}", evt.EventId);
                NotifyCriticalEvent(evt, "CRITICAL: Audit log cleared - tampering detected!");
                break;
                
            case 4719: // Audit policy changed
                evt.EventType = "Audit Policy Changed";
                evt.IsFlagged = true; // Tampering risk
                NotifyCriticalEvent(evt, "System audit policy modified");
                break;

            // --- System Log Events ---
            case 7045: // Service installed (System log)
                evt.EventType = "Service Installed";
                NotifyCriticalEvent(evt, "New service installed - verify legitimacy");
                break;
                
            case 7040: // Service start type changed
                evt.EventType = "Service Configuration Changed";
                NotifyCriticalEvent(evt, "Service start type modified");
                break;
                
            default:
                if (logName == "Application" && (evt.Details.Contains("Critical") || evt.Details.Contains("Error")))
                {
                    NotifyCriticalEvent(evt, $"Application Error: {evt.EventType}");
                }
                break;
        }
    }

    private void NotifyCriticalEvent(AuditEvent evt, string description)
    {
        OnCriticalEventDetected(new AuditEventDetectedEventArgs
        {
            Event = evt,
            DetectedTime = DateTime.UtcNow,
            Description = description
        });
    }
    
    private string GetEventHash(AuditEvent evt)
    {
        // Create hash based on event ID, username, and timestamp (rounded to second)
        var timestampKey = evt.Timestamp.ToString("yyyyMMddHHmmss");
        return $"{evt.EventId}_{evt.Username}_{timestampKey}";
    }
    
    private bool IsDuplicate(AuditEvent evt)
    {
        lock (_dedupeLock)
        {
            var hash = GetEventHash(evt);
            var now = DateTime.UtcNow;
            
            // Clean up old hashes (older than dedup window)
            var expiredHashes = _recentEventHashes
                .Where(kvp => now - kvp.Value > _dedupeWindow)
                .Select(kvp => kvp.Key)
                .ToList();
            
            foreach (var expiredHash in expiredHashes)
            {
                _recentEventHashes.Remove(expiredHash);
            }
            
            // Check if we've seen this event recently
            if (_recentEventHashes.ContainsKey(hash))
            {
                return true; // Duplicate
            }
            
            // Add to recent events
            _recentEventHashes[hash] = now;
            return false;
        }
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public async Task StopMonitoringAsync()
    {
        ThrowIfDisposed();

        if (!IsMonitoring && _activeWatchers.Count == 0)
            return;

        try 
        {
            foreach (var watcher in _activeWatchers)
            {
                watcher.Enabled = false;
                watcher.Dispose();
            }
            _activeWatchers.Clear();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error stopping event watcher");
        }

        IsMonitoring = false;
        logger.LogInformation("Event log monitoring stopped");
        await Task.CompletedTask;
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(AuditManager));
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public void Dispose()
    {
        if (_disposed)
            return;

        try
        {
            StopMonitoringAsync().Wait();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error disposing AuditManager");
        }

        _disposed = true;
        GC.SuppressFinalize(this);
    }
}
