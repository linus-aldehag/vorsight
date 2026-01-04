using System.Diagnostics.Eventing.Reader;
using Microsoft.Extensions.Logging;
using Vorsight.Contracts.Audit;

namespace Vorsight.Infrastructure.Audit;

/// <summary>
/// Implementation of audit manager for Windows Event Log monitoring.
/// Detects and logs security events indicating admin tampering.
/// </summary>
public class AuditManager(ILogger<AuditManager> logger) : IAuditManager
{
    private bool _disposed;
    
    // Deduplication
    private readonly Dictionary<string, DateTime> _recentEventHashes = new();
    private readonly TimeSpan _dedupeWindow = TimeSpan.FromSeconds(5);
    private readonly object _dedupeLock = new();

    // Events for audit notifications
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



    private EventLogWatcher? _securityLogWatcher;

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public async Task StartMonitoringAsync()
    {
        ThrowIfDisposed();

        if (IsMonitoring)
            return;

        try
        {
            // Build the query from filters
            var query = BuildEventQuery();
            if (string.IsNullOrEmpty(query))
            {
                logger.LogWarning("No audit filters configured. Event log monitoring will operate with default security catch-all.");
                query = "*[System/Provider[@Name='Microsoft-Windows-Security-Auditing']]";
            }

            var eventQuery = new EventLogQuery("Security", PathType.LogName, query);
            _securityLogWatcher = new EventLogWatcher(eventQuery);
            
            _securityLogWatcher.EventRecordWritten += SecurityLogWatcher_EventRecordWritten;
            
            _securityLogWatcher.Enabled = true;
            IsMonitoring = true;
            
            logger.LogInformation("Event log monitoring started with query: {Query}", query);
            await Task.CompletedTask;
        }
        catch (EventLogException ex)
        {
            // If we lack permission (must be admin/service), we log a warning but don't crash the app
            logger.LogWarning(ex, "Could not initialize Event Log watchers. Ensure the service is running as Administrator/LocalSystem.");
            IsMonitoring = false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error starting event log monitoring");
            IsMonitoring = false;
        }
    }

    private string BuildEventQuery()
    {
        // Expanded query for comprehensive security monitoring
        // Covers: User management, Service tampering, Scheduled tasks, Audit tampering
        return @"*[System[(
            EventID=4720 or
            EventID=4732 or
            EventID=4728 or
            EventID=4672 or
            EventID=7045 or
            EventID=7040 or
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

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private void SecurityLogWatcher_EventRecordWritten(object? sender, EventRecordWrittenEventArgs e)
    {
        try
        {
            using var eventRecord = e.EventRecord;
            if (eventRecord == null) return;

            var evt = new AuditEvent
            {
                Timestamp = eventRecord.TimeCreated ?? DateTime.UtcNow,
                EventId = eventRecord.Id.ToString(),
                EventType = eventRecord.TaskDisplayName ?? "Security Event",
                SourceLogName = "Security",
                Username = "System", // Will extract from event properties if needed
                Details = eventRecord.FormatDescription() ?? "No description available"
            };
            
            // Check for duplicates before processing
            if (IsDuplicate(evt))
            {
                logger.LogDebug("Skipping duplicate event {Id} for {Username}", evt.EventId, evt.Username);
                return;
            }
            
            // Basic detection logic
            switch (eventRecord.Id)
            {
                case 4720: // User Created
                    NotifyCriticalEvent(evt, "User Account Created");
                    break;
                    
                case 4732:
                case 4728: // Added to group
                    NotifyCriticalEvent(evt, "Group Membership Changed");
                    break;
                    
                case 4672: // Admin login (noisy, but critical)
                    // Optionally filter admin noise
                    break;
                    
                case 7045: // Service installed (System log)
                    evt.SourceLogName = "System";
                    evt.EventType = "Service Installed";
                    NotifyCriticalEvent(evt, "New service installed - verify legitimacy");
                    break;
                    
                case 7040: // Service start type changed
                    evt.SourceLogName = "System";
                    evt.EventType = "Service Configuration Changed";
                    NotifyCriticalEvent(evt, "Service start type modified");
                    break;
                    
                case 4697: // Service installed (Security log)
                    evt.EventType = "Service Installed (Security)";
                    NotifyCriticalEvent(evt, "New service installed via security event");
                    break;
                    
                case 4698: // Scheduled task created
                    evt.EventType = "Scheduled Task Created";
                    NotifyCriticalEvent(evt, "New scheduled task created");
                    break;
                    
                case 4699: // Scheduled task deleted
                    evt.EventType = "Scheduled Task Deleted";
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
                    logger.LogCritical("CRITICAL: Audit log tampering detected! EventID={EventId}", evt.EventId);
                    NotifyCriticalEvent(evt, "CRITICAL: Audit log cleared - tampering detected!");
                    break;
                    
                case 4719: // Audit policy changed
                    evt.EventType = "Audit Policy Changed";
                    NotifyCriticalEvent(evt, "System audit policy modified");
                    break;
            }

            logger.LogDebug("Captured Security Event {Id}: {Type}", eventRecord.Id, evt.EventType);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing event log record");
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

        if (!IsMonitoring)
            return;

        try 
        {
            if (_securityLogWatcher != null)
            {
                _securityLogWatcher.Enabled = false;
                _securityLogWatcher.Dispose();
                _securityLogWatcher = null;
            }
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