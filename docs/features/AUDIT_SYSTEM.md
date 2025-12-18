# Audit System

## Overview

The Audit System provides real-time monitoring of Windows Security Event Log for detecting critical security events and potential tampering attempts. It serves as a tamper detection and activity tracking mechanism for the Vörsight Service.

## Architecture

### Audit Components

```
Windows Event Log (Security)
    ↓
AuditManager (Event Log Monitor)
    ├─ Event Filters
    ├─ Event Detection
    └─ Event Notifications
    ↓
Event Handlers
├─ CriticalEventDetected
└─ TamperingDetected
    ↓
Audit Log Storage
└─ Database / File Log
```

## Event Monitoring

### AuditManager Interface

```csharp
public interface IAuditManager : IAsyncDisposable
{
    bool IsMonitoring { get; }
    
    Task InitializeAsync();
    Task StartMonitoringAsync();
    Task StopMonitoringAsync();
    
    Task AddFilterAsync(AuditEventFilter filter);
    Task RemoveFilterAsync(string filterId);
    Task<IEnumerable<AuditEvent>> GetEventsAsync(
        DateTime from, DateTime to, string severity);
    
    event EventHandler<AuditEventDetectedEventArgs> CriticalEventDetected;
    event EventHandler<TamperingDetectedEventArgs> TamperingDetected;
}
```

### AuditManager Implementation

```csharp
public class AuditManager(ILogger<AuditManager> logger) : IAuditManager
{
    private readonly List<AuditEventFilter> _filters = new();
    private bool _disposed;
    private EventLogWatcher _eventLogWatcher;

    public bool IsMonitoring { get; private set; }

    public async Task InitializeAsync()
    {
        ThrowIfDisposed();

        _logger.LogInformation("Initializing audit manager");

        // Add default critical event filters
        await AddFilterAsync(new AuditEventFilter
        {
            FilterId = "filter_user_creation",
            Description = "User Account Creation",
            Source = AuditEventFilter.EventLogSource.Security,
            EventId = 4720,
            IsEnabled = true
        });

        await AddFilterAsync(new AuditEventFilter
        {
            FilterId = "filter_group_modification",
            Description = "Group Membership Change",
            Source = AuditEventFilter.EventLogSource.Security,
            EventId = 4728,
            IsEnabled = true
        });

        _logger.LogInformation("Audit manager initialized with {FilterCount} filters",
            _filters.Count);
    }

    public async Task StartMonitoringAsync()
    {
        ThrowIfDisposed();

        if (IsMonitoring)
            return;

        _logger.LogInformation("Starting audit event monitoring");

        try
        {
            // Create event log query
            var query = new EventLogQuery("Security", PathType.LogName,
                BuildEventLogXPathQuery());
            
            _eventLogWatcher = new EventLogWatcher(query)
            {
                Enabled = true
            };

            _eventLogWatcher.EventRecordWritten += OnEventRecordWritten;
            _eventLogWatcher.Enabled = true;

            IsMonitoring = true;
            _logger.LogInformation("Audit event monitoring started");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start audit monitoring");
            throw;
        }
    }

    private void OnEventRecordWritten(object sender, EventRecordWrittenEventArgs e)
    {
        try
        {
            if (e.EventRecord is EventLogRecord record)
            {
                ProcessEvent(record);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing event record");
        }
    }

    private void ProcessEvent(EventLogRecord record)
    {
        // Check if event matches any filters
        var matchingFilter = _filters.FirstOrDefault(f =>
            f.IsEnabled &&
            f.EventId == record.Id &&
            f.Source == AuditEventFilter.EventLogSource.Security);

        if (matchingFilter == null)
            return;

        var auditEvent = new AuditEvent
        {
            EventId = record.Id.ToString(),
            Timestamp = record.TimeCreated ?? DateTime.UtcNow,
            Source = record.ProviderName,
            Message = record.FormatDescription(),
            Severity = DetermineSeverity(record.Id)
        };

        _logger.LogWarning(
            "Critical event detected: {Description} (EventId: {EventId})",
            matchingFilter.Description, record.Id);

        // Raise event notifications
        CriticalEventDetected?.Invoke(this, new AuditEventDetectedEventArgs
        {
            Event = auditEvent,
            Filter = matchingFilter
        });

        // Check for tamper patterns
        CheckForTamperingPatterns(auditEvent);
    }

    private void CheckForTamperingPatterns(AuditEvent evt)
    {
        // Detect multiple failed audits
        if (evt.EventId == "4719")  // Audit Policy Changed
        {
            _logger.LogError("TAMPER DETECTED: Audit policy changed! {Event}", evt);
            
            TamperingDetected?.Invoke(this, new TamperingDetectedEventArgs
            {
                TamperType = TamperType.AuditPolicyModification,
                Event = evt,
                Severity = AuditEventSeverity.Critical
            });
        }
    }
}
```

## Event Filters

### AuditEventFilter Structure

```csharp
public class AuditEventFilter
{
    public string FilterId { get; set; }
    public string Description { get; set; }
    public EventLogSource Source { get; set; }
    public int EventId { get; set; }
    public bool IsEnabled { get; set; }

    public enum EventLogSource
    {
        Security,
        System,
        Application,
        Custom
    }

    public static class CriticalEventIds
    {
        // Account Management
        public const int UserAccountCreated = 4720;
        public const int UserAccountDeleted = 4726;
        public const int UserAccountModified = 4738;
        public const int PasswordReset = 4724;

        // Group Management
        public const int GroupMembershipAdded = 4728;
        public const int GroupMembershipRemoved = 4729;
        public const int BuiltinGroupModified = 4735;

        // Privilege & Access
        public const int SpecialPrivilegesAssigned = 4672;
        public const int AdminLogon = 4648;
        public const int SecurityGroupModification = 4755;

        // Audit & Policy
        public const int AuditPolicyChanged = 4719;
        public const int AuditLogCleared = 1102;
        public const int ObjectAccessDenied = 4625;

        // Session Management
        public const int AccountLogon = 4624;
        public const int AccountLogoff = 4647;
        public const int SessionReconnect = 4826;
    }
}
```

### Default Filters

```csharp
public static class DefaultAuditFilters
{
    public static List<AuditEventFilter> GetCriticalFilters()
    {
        return new List<AuditEventFilter>
        {
            // User account creation (someone creating new accounts)
            new()
            {
                FilterId = "critical_user_creation",
                Description = "User Account Created",
                EventId = 4720,
                IsEnabled = true
            },
            
            // Group membership modification (escalating privileges)
            new()
            {
                FilterId = "critical_group_modification",
                Description = "User Added to Group",
                EventId = 4728,
                IsEnabled = true
            },
            
            // Special privileges (admin accessing)
            new()
            {
                FilterId = "critical_special_privs",
                Description = "Special Privileges Assigned",
                EventId = 4672,
                IsEnabled = true
            },
            
            // Audit policy changes (tampering detection)
            new()
            {
                FilterId = "critical_audit_policy_change",
                Description = "Audit Policy Changed",
                EventId = 4719,
                IsEnabled = true
            },
            
            // Audit log cleared (tampering detection)
            new()
            {
                FilterId = "critical_audit_log_cleared",
                Description = "Audit Log Cleared",
                EventId = 1102,
                IsEnabled = true
            }
        };
    }
}
```

## Event Data Models

### AuditEvent

```csharp
public class AuditEvent
{
    public string EventId { get; set; }           // Windows Event ID
    public DateTime Timestamp { get; set; }
    public string Source { get; set; }            // Provider name (Security, etc.)
    public string Message { get; set; }
    public AuditEventSeverity Severity { get; set; }
    public Dictionary<string, string> Properties { get; set; }  // Additional data
}

public enum AuditEventSeverity
{
    Low,
    Medium,
    High,
    Critical
}
```

### Event Examples

#### User Account Creation (Event 4720)

```
Event ID: 4720
Severity: CRITICAL
Message: A user account was created.
Properties:
  - TargetUserName: "backdoor"
  - TargetUserPrincipalName: "DOMAIN\backdoor"
  - TargetSid: "S-1-5-21-123456789-123456789-123456789-1001"
  - SubjectUserName: "administrator"
```

#### Group Membership Modified (Event 4728)

```
Event ID: 4728
Severity: CRITICAL
Message: A member was added to a security-enabled global group.
Properties:
  - MemberName: "john"
  - TargetGroupName: "Administrators"
  - SubjectUserName: "administrator"
```

#### Audit Policy Changed (Event 4719)

```
Event ID: 4719
Severity: CRITICAL
Message: The system audit policy was changed.
Properties:
  - AuditPolicyCategoryGUID: "{6997984b-797a-11d9-bed3-505054503030}"
  - AuditPolicyChanges: "Removed: Success, Failure"
  - SubjectUserName: "administrator"
```

## Query Integration

### XPath Query for Event Log

```csharp
private string BuildEventLogXPathQuery()
{
    var eventIds = _filters
        .Where(f => f.IsEnabled)
        .Select(f => f.EventId)
        .Distinct();

    var eventIdQuery = string.Join(" or ", 
        eventIds.Select(id => $"System/EventID={id}"));

    return $"*[System[({eventIdQuery})]]";
}
```

### EventLogQuery Example

```csharp
// Query for all critical events in past 24 hours
var query = new EventLogQuery("Security", PathType.LogName,
    "*[System[EventID=4720 or EventID=4728 or EventID=4719 or EventID=1102]]" +
    " and " +
    $"*[System[TimeCreated[@SystemTime >= '{DateTime.UtcNow.AddDays(-1):O}']]]");

var searcher = new EventLogReader(query);
EventRecord record = null;

while ((record = searcher.ReadEvent()) != null)
{
    _logger.LogInformation("Event: {EventID} - {Message}",
        record.Id, record.FormatDescription());
}
```

## Tamper Detection

### TamperingDetectedEventArgs

```csharp
public class TamperingDetectedEventArgs : EventArgs
{
    public TamperType TamperType { get; set; }
    public AuditEvent Event { get; set; }
    public AuditEventSeverity Severity { get; set; }
    public string Details { get; set; }
}

public enum TamperType
{
    AuditPolicyModification,
    AuditLogCleared,
    AdminPrivilegeEscalation,
    UnauthorizedGroupModification,
    SuspiciousAccountCreation,
    Unknown
}
```

### Tamper Detection Logic

```csharp
private void CheckForTamperingPatterns(AuditEvent evt)
{
    switch (evt.EventId)
    {
        case "4719":  // Audit policy changed
            _logger.LogError("TAMPER DETECTED: Audit policy modified");
            RaiseTamperingAlert(TamperType.AuditPolicyModification, evt);
            break;

        case "1102":  // Audit log cleared
            _logger.LogError("TAMPER DETECTED: Audit log was cleared");
            RaiseTamperingAlert(TamperType.AuditLogCleared, evt);
            break;

        case "4728":  // Group membership added
            // Check if adding to admin group
            if (evt.Properties.TryGetValue("TargetGroupName", out var group)
                && (group.Contains("Administrators") || group.Contains("Domain Admins")))
            {
                _logger.LogError("TAMPER DETECTED: Admin group modification");
                RaiseTamperingAlert(TamperType.UnauthorizedGroupModification, evt);
            }
            break;

        case "4720":  // User account created
            // Check if creating during restricted hours
            var hour = evt.Timestamp.Hour;
            if (hour < 6 || hour > 18)  // Outside normal hours
            {
                _logger.LogWarning("SUSPICIOUS: User account created at unusual time");
                RaiseTamperingAlert(TamperType.SuspiciousAccountCreation, evt);
            }
            break;
    }
}

private void RaiseTamperingAlert(TamperType type, AuditEvent evt)
{
    TamperingDetected?.Invoke(this, new TamperingDetectedEventArgs
    {
        TamperType = type,
        Event = evt,
        Severity = AuditEventSeverity.Critical,
        Details = $"Potential tampering detected: {type}"
    });
}
```

## Event Handlers

### Service Registration

```csharp
// In Vorsight.Service/Program.cs
var auditManager = builder.Services
    .BuildServiceProvider()
    .GetRequiredService<IAuditManager>();

auditManager.CriticalEventDetected += OnCriticalEventDetected;
auditManager.TamperingDetected += OnTamperingDetected;

void OnCriticalEventDetected(object sender, AuditEventDetectedEventArgs e)
{
    _logger.LogWarning(
        "Critical event detected: {Description}",
        e.Filter.Description);

    // Trigger response
    HandleCriticalEvent(e.Event);
}

void OnTamperingDetected(object sender, TamperingDetectedEventArgs e)
{
    _logger.LogCritical(
        "TAMPER ALERT: {TamperType}",
        e.TamperType);

    // Immediate response
    LockdownSystem(e);
}
```

## REST API Integration

### Get Audit Events

```
GET /api/audit/events?from=2025-12-18&to=2025-12-19&severity=critical

Response:
{
  "success": true,
  "data": [
    {
      "eventId": "4720",
      "timestamp": "2025-12-18T14:23:45Z",
      "source": "Microsoft-Windows-Security-Auditing",
      "message": "A user account was created.",
      "severity": "critical",
      "properties": {
        "targetUserName": "backdoor",
        "subjectUserName": "administrator"
      }
    }
  ],
  "total": 1,
  "pageSize": 50
}
```

### Get Tamper Incidents

```
GET /api/audit/tamper-incidents

Response:
{
  "success": true,
  "data": [
    {
      "incidentId": "tamper-001",
      "tamperType": "AuditPolicyModification",
      "timestamp": "2025-12-18T14:23:45Z",
      "severity": "critical",
      "details": "Audit policy was modified",
      "event": { ... }
    }
  ]
}
```

## Performance Considerations

- **Event log polling**: Every 5-10 seconds
- **Filter matching**: O(n) where n = filter count
- **Query execution**: 50-200ms depending on event log size
- **Memory**: ~1-5MB for filter cache

## Troubleshooting

### Events Not Detected

1. Check Windows Event Log enabled:
   ```powershell
   Get-EventLog -List | Where-Object {$_.Log -eq "Security"}
   ```

2. Verify audit policies enabled:
   ```powershell
   auditpol /get /category:*
   ```

3. Confirm filters added and enabled
4. Check logs for query errors

### High CPU Usage

1. Reduce number of filters
2. Increase event log polling interval
3. Archive old events to reduce log size

### Missing Events

1. Check event log retention policy
2. Verify Service has Security event log read permissions
3. Ensure Event Log service is running

## Security Considerations

- Audit events are tamper evidence
- Audit log clearing is itself an event (4719)
- Service must have read-only access to Security log
- Critical events must trigger immediate response

## Related Documentation

- [Vorsight.Core Audit Module](../components/VORSIGHT_CORE.md#1-audit-system-audit)
- [Vorsight.Service](../components/VORSIGHT_SERVICE.md)
- [Architecture](../ARCHITECTURE.md)

