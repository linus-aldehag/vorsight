using System.Diagnostics.Eventing.Reader;
using Microsoft.Extensions.Logging;

namespace Vorsight.Core.Audit;

/// <summary>
/// Implementation of audit manager for Windows Event Log monitoring.
/// Detects and logs security events indicating admin tampering.
/// </summary>
public class AuditManager(ILogger<AuditManager> logger) : IAuditManager
{
    private readonly List<AuditEventFilter> _filters = new();
    private bool _disposed;

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

        try
        {
            // Add default filters for important security events
            await AddFilterAsync(new AuditEventFilter
            {
                FilterId = "filter_user_creation",
                Description = "User Account Creation",
                Source = AuditEventFilter.EventLogSource.Security,
                EventId = AuditEventFilter.CriticalEventIds.UserAccountCreated,
                IsEnabled = true
            });

            await AddFilterAsync(new AuditEventFilter
            {
                FilterId = "filter_group_modification",
                Description = "Group Membership Change",
                Source = AuditEventFilter.EventLogSource.Security,
                EventId = AuditEventFilter.CriticalEventIds.GroupMembershipAdded,
                IsEnabled = true
            });

            await AddFilterAsync(new AuditEventFilter
            {
                FilterId = "filter_admin_privs",
                Description = "Administrative Privileges Used",
                Source = AuditEventFilter.EventLogSource.Security,
                EventId = 4672,
                IsEnabled = true,
                Severity = AuditEventFilter.EventSeverity.Critical
            });

            logger.LogInformation("Audit manager initialized with {FilterCount} filters", _filters.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error initializing audit manager");
            throw;
        }
    }

    public async Task AddFilterAsync(AuditEventFilter filter)
    {
        ThrowIfDisposed();

        if (filter == null)
            throw new ArgumentNullException(nameof(filter));

        _filters.Add(filter);
        logger.LogInformation("Added audit filter: {FilterId} - {Description}", filter.FilterId, filter.Description);

        await Task.CompletedTask;
    }

    public async Task RemoveFilterAsync(string filterId)
    {
        ThrowIfDisposed();

        var filter = _filters.FirstOrDefault(f => f.FilterId == filterId);
        if (filter != null)
        {
            _filters.Remove(filter);
            logger.LogInformation("Removed audit filter: {FilterId}", filterId);
        }

        await Task.CompletedTask;
    }

    public async Task<IEnumerable<AuditEventFilter>> GetFiltersAsync()
    {
        ThrowIfDisposed();
        return await Task.FromResult(_filters.AsReadOnly());
    }

    public async Task LogAuditEventAsync(AuditEvent auditEvent)
    {
        ThrowIfDisposed();
        logger.LogInformation("Audit event logged: {EventType}", auditEvent?.EventType);
        await Task.CompletedTask;
    }

    public async Task<IEnumerable<AuditEvent>> GetAuditEventsAsync(DateTime startTime, DateTime endTime)
    {
        ThrowIfDisposed();
        return await Task.FromResult(Enumerable.Empty<AuditEvent>());
    }

    public async Task<IEnumerable<AuditEvent>> GetFlaggedEventsAsync(int limit = 100)
    {
        ThrowIfDisposed();
        return await Task.FromResult(Enumerable.Empty<AuditEvent>());
    }

    public async Task<IEnumerable<AuditEvent>> GetUserEventsAsync(string username)
    {
        ThrowIfDisposed();
        return await Task.FromResult(Enumerable.Empty<AuditEvent>());
    }

    public async Task ClearAuditLogsAsync(string reason)
    {
        ThrowIfDisposed();
        logger.LogWarning("Audit logs clear requested. Reason: {Reason}", reason);
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
        // Simple constructing of XPath query for filtering
        // Example: *[System[(EventID=4720 or EventID=4728)]]
        // Currently we only support hardcoded critical IDs for simplicity in this version
        return "*[System[(EventID=4720 or EventID=4732 or EventID=4728 or EventID=4672)]]"; 
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
            
            // Basic detection logic
            if (eventRecord.Id == 4720) // User Created
            {
                NotifyCriticalEvent(evt, "User Account Created");
            }
            else if (eventRecord.Id == 4732 || eventRecord.Id == 4728) // Added to group
            {
                NotifyCriticalEvent(evt, "Group Membership Changed");
            }
            else if (eventRecord.Id == 4672) // Admin login (noisy, but critical)
            {
                // Optionally filter admin noise
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
            MatchingFilter = new AuditEventFilter { FilterId = "event_" + evt.EventId, Description = description, EventId = int.Parse(evt.EventId) }
        });
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

    public async Task<int> GetEventCountAsync()
    {
        ThrowIfDisposed();
        return await Task.FromResult(0);
    }

    public async Task<long> GetAuditLogSizeAsync()
    {
        ThrowIfDisposed();
        return await Task.FromResult(0L);
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