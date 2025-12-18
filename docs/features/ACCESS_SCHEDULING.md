# Access Scheduling & Enforcement

## Overview

Access Scheduling is the core feature that enables parents/administrators to define time-based restrictions on when a child user can access the system. The Vörsight Service enforces these restrictions by automatically terminating user sessions when schedule policies are violated.

## Architecture

### Components

```
ScheduleManager (Business Logic)
    ↓
AccessSchedule (Policy Model)
    ↓
Enforcement Engine
    ├── Time Window Validation
    ├── Daily Limit Tracking
    ├── Session Termination
    └── Re-login Prevention
```

## Schedule Model

### AccessSchedule Structure

```csharp
public class AccessSchedule
{
    // Identity
    public string ScheduleId { get; set; }           // Unique ID (GUID)
    public int UserId { get; set; }                  // Windows SID
    public string UserName { get; set; }             // Display name

    // Time Window
    public DateTime StartTime { get; set; }          // Daily start time
    public DateTime EndTime { get; set; }            // Daily end time
    public DayOfWeek[] AllowedDays { get; set; }     // Days when access is allowed

    // Policies
    public bool IsEnabled { get; set; }
    public bool AllowScreenTime { get; set; }
    public int DailyLimitMinutes { get; set; }       // Max minutes per day
    public bool AllowNetworkAccess { get; set; }
    public string[] BlockedApplications { get; set; }

    // Tracking
    public DateTime LastModified { get; set; }
    public string ModifiedBy { get; set; }
    public int ScreenTimeUsedToday { get; set; }     // Minutes
}
```

### Example Schedule

```csharp
var schedule = new AccessSchedule
{
    ScheduleId = Guid.NewGuid().ToString(),
    UserId = 1000,
    UserName = "john",
    
    // Allowed: 3:00 PM - 9:00 PM, M-F
    StartTime = DateTime.Today.AddHours(15),
    EndTime = DateTime.Today.AddHours(21),
    AllowedDays = new[] { 
        DayOfWeek.Monday, 
        DayOfWeek.Tuesday,
        DayOfWeek.Wednesday,
        DayOfWeek.Thursday,
        DayOfWeek.Friday
    },
    
    // Policies
    IsEnabled = true,
    AllowScreenTime = true,
    DailyLimitMinutes = 180,        // 3 hours max per day
    AllowNetworkAccess = false,     // No internet
    BlockedApplications = new[] { 
        "discord.exe", 
        "steam.exe",
        "valorant.exe"
    }
};
```

## Validation Logic

### IsAccessAllowed Decision Tree

```
Is schedule enabled?
    ├─ NO → ALLOW
    └─ YES
        ├─ Current time within StartTime/EndTime?
        │   ├─ NO → DENY
        │   └─ YES
        │       ├─ Current day in AllowedDays?
        │       │   ├─ NO → DENY
        │       │   └─ YES
        │       │       ├─ Daily limit exceeded?
        │       │       │   ├─ YES → DENY
        │       │       │   └─ NO
        │       │       │       ├─ Network access required & disallowed?
        │       │       │       │   ├─ YES → DENY
        │       │       │       │   └─ NO → ALLOW
        │       │       │   END
        │       │   END
        │   END
        │END
```

### Implementation

```csharp
public async Task<bool> IsAccessAllowedAsync(int userId, DateTime currentTime)
{
    ThrowIfDisposed();
    
    var schedule = await GetScheduleAsync(userId);
    if (schedule == null || !schedule.IsEnabled)
    {
        _logger.LogDebug("No schedule or disabled for user {UserId}", userId);
        return true;  // No restrictions
    }

    // 1. Check time window
    var timeOfDay = currentTime.TimeOfDay;
    var startTime = schedule.StartTime.TimeOfDay;
    var endTime = schedule.EndTime.TimeOfDay;

    if (timeOfDay < startTime || timeOfDay > endTime)
    {
        _logger.LogInformation(
            "Access denied: outside time window for {UserId}", userId);
        return false;
    }

    // 2. Check day of week
    if (!schedule.AllowedDays.Contains(currentTime.DayOfWeek))
    {
        _logger.LogInformation(
            "Access denied: {Day} not in allowed days for {UserId}",
            currentTime.DayOfWeek, userId);
        return false;
    }

    // 3. Check daily limit
    if (schedule.ScreenTimeUsedToday >= schedule.DailyLimitMinutes)
    {
        _logger.LogInformation(
            "Access denied: daily limit exceeded for {UserId}", userId);
        return false;
    }

    _logger.LogDebug("Access allowed for user {UserId}", userId);
    return true;
}
```

## Enforcement Engine

### Continuous Monitoring

The Service runs a monitoring loop that checks schedules every 30 seconds:

```csharp
public class Worker : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Check all active sessions
                var activeSessions = GetActiveSessions();
                foreach (var session in activeSessions)
                {
                    // Check if access is still allowed
                    var allowed = await _scheduleManager.IsAccessAllowedAsync(
                        session.UserId, DateTime.Now);

                    if (!allowed && session.HasActiveSchedule)
                    {
                        _logger.LogWarning(
                            "Enforcing schedule termination for user {UserId}",
                            session.UserId);
                        
                        await _scheduleManager.EnforceAccessAsync(session.UserId);
                    }
                }

                await Task.Delay(30000, stoppingToken);  // 30 seconds
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in schedule enforcement loop");
            }
        }
    }
}
```

### Session Termination

When access is denied, the Service terminates the user's session:

```csharp
public async Task EnforceAccessAsync(int userId)
{
    ThrowIfDisposed();

    try
    {
        // Get user's session
        var session = GetUserSession(userId);
        if (session == null)
        {
            _logger.LogWarning("Cannot enforce: user session not found {UserId}", userId);
            return;
        }

        _logger.LogInformation(
            "Enforcing session termination for user {UserId}, session {SessionId}",
            userId, session.SessionId);

        // Graceful termination: ExitWindowsEx with logoff flag
        ShutdownHelper.LogoffUser(session.SessionId, force: false);

        // Wait 10 seconds for graceful shutdown
        await Task.Delay(10000);

        // If still active, force terminate
        if (IsSessionActive(session.SessionId))
        {
            _logger.LogWarning(
                "Forceful termination after timeout for user {UserId}",
                userId);
            ShutdownHelper.LogoffUser(session.SessionId, force: true);
        }

        // Record enforcement event
        var auditEvent = new AuditEvent
        {
            EventId = "SCHEDULE_ENFORCED",
            Timestamp = DateTime.UtcNow,
            UserId = userId,
            Details = $"Access schedule enforced for user {userId}",
            Severity = AuditEventSeverity.High
        };
        
        await _auditManager.LogEventAsync(auditEvent);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to enforce access for user {UserId}", userId);
        throw;
    }
}
```

### Re-login Prevention

After termination, prevent the user from immediately re-logging in:

```csharp
private Dictionary<int, DateTime> _recentTerminations = new();
private const int ReloginLockoutMinutes = 15;

public bool CanUserLogin(int userId)
{
    if (_recentTerminations.TryGetValue(userId, out var terminationTime))
    {
        var lockoutExpiry = terminationTime.AddMinutes(ReloginLockoutMinutes);
        if (DateTime.UtcNow < lockoutExpiry)
        {
            _logger.LogWarning(
                "Login blocked: user {UserId} still in lockout period until {Expiry}",
                userId, lockoutExpiry);
            return false;
        }
        
        _recentTerminations.Remove(userId);
    }

    return true;
}

private void RecordTermination(int userId)
{
    _recentTerminations[userId] = DateTime.UtcNow;
}
```

## Usage Examples

### Create a Simple Schedule

```csharp
// Weekdays 3-9 PM, max 3 hours/day
var schedule = new AccessSchedule
{
    ScheduleId = Guid.NewGuid().ToString(),
    UserId = 1000,
    UserName = "john",
    StartTime = DateTime.Today.AddHours(15),
    EndTime = DateTime.Today.AddHours(21),
    AllowedDays = new[] { 
        DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
        DayOfWeek.Thursday, DayOfWeek.Friday
    },
    DailyLimitMinutes = 180,
    IsEnabled = true
};

await scheduleManager.CreateScheduleAsync(schedule);
```

### Strict Weekend-Only Schedule

```csharp
var schedule = new AccessSchedule
{
    ScheduleId = Guid.NewGuid().ToString(),
    UserId = 1000,
    UserName = "john",
    StartTime = DateTime.Today.AddHours(12),
    EndTime = DateTime.Today.AddHours(18),
    AllowedDays = new[] { DayOfWeek.Saturday, DayOfWeek.Sunday },
    DailyLimitMinutes = 120,  // 2 hours max
    AllowNetworkAccess = true,
    BlockedApplications = new[] { "steam.exe", "discord.exe" },
    IsEnabled = true
};

await scheduleManager.CreateScheduleAsync(schedule);
```

### No Access Schedule

```csharp
var schedule = new AccessSchedule
{
    ScheduleId = Guid.NewGuid().ToString(),
    UserId = 1000,
    UserName = "john",
    AllowedDays = Array.Empty<DayOfWeek>(),  // No days allowed
    DailyLimitMinutes = 0,
    IsEnabled = true
};

await scheduleManager.CreateScheduleAsync(schedule);
```

## REST API Integration

### Get Schedule

```
GET /api/schedules/{userId}

Response:
{
  "success": true,
  "data": {
    "scheduleId": "abc-123",
    "userId": 1000,
    "userName": "john",
    "startTime": "2025-12-18T15:00:00Z",
    "endTime": "2025-12-18T21:00:00Z",
    "allowedDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "dailyLimitMinutes": 180,
    "isEnabled": true,
    "screenTimeUsedToday": 45
  }
}
```

### Update Schedule

```
PUT /api/schedules/{userId}

Request:
{
  "startTime": "15:00",
  "endTime": "21:00",
  "allowedDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "dailyLimitMinutes": 120
}

Response:
{
  "success": true,
  "message": "Schedule updated successfully"
}
```

### Enforce Schedule Immediately

```
POST /api/schedules/{userId}/enforce

Response:
{
  "success": true,
  "message": "Schedule enforced for user 1000",
  "sessionTerminated": true
}
```

## Audit Trail

Every schedule change and enforcement is logged:

```csharp
public class ScheduleAuditEvent
{
    public string EventId { get; set; }     // SCHEDULE_CREATED, SCHEDULE_UPDATED, SCHEDULE_ENFORCED
    public DateTime Timestamp { get; set; }
    public int UserId { get; set; }
    public string ModifiedBy { get; set; }  // Admin user
    public string Details { get; set; }     // JSON of changes
    public AuditEventSeverity Severity { get; set; }
}
```

## Troubleshooting

### Schedule Not Enforcing

1. **Check if enabled**: `schedule.IsEnabled == true`
2. **Verify time window**: Current time between StartTime and EndTime?
3. **Check day of week**: Current day in AllowedDays array?
4. **Review logs**: Check Service logs for enforcement attempts
5. **Check daily limit**: ScreenTimeUsedToday < DailyLimitMinutes?

### User Can Re-login After Termination

1. **Check lockout time**: Verify ReloginLockoutMinutes (default 15 min)
2. **Check termination recording**: Log level to DEBUG to verify RecordTermination() called
3. **Verify session termination**: Check Event Viewer for logoff events
4. **Reset lockout**: Manually clear _recentTerminations if needed

### Graceful Termination Failing

1. **Check privileges**: Service running as LocalSystem?
2. **Verify session**: Session ID valid and active?
3. **Force termination**: Falls back to EWX_FORCE if grace timeout occurs
4. **Review logs**: Check for Win32 error codes in logs

## Performance Considerations

- **Check interval**: 30 seconds (configurable)
- **Schedule queries**: Cached for 5 minutes
- **Termination delay**: 10 seconds grace period
- **Concurrent enforcement**: Non-blocking async/await

## Security Considerations

- **Privilege escalation**: Only LocalSystem can enforce
- **Audit logging**: All changes logged and tracked
- **Session validation**: Verifies session exists before termination
- **Replay prevention**: Timestamps prevent schedule replay attacks

## Related Documentation

- [Vorsight.Core Scheduling](../components/VORSIGHT_CORE.md#3-scheduling-system-scheduling)
- [API Reference - Schedules](../API_REFERENCE.md#schedule-management)
- [Architecture](../ARCHITECTURE.md)

