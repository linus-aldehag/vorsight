# Vörsight Core (Vorsight.Core)

## Overview

Vörsight.Core is the shared library containing business logic, interfaces, and utilities used by both the Service and Agent components. It provides:

- IPC (Named Pipes) protocol implementation
- Audit event monitoring and filtering
- Access scheduling and enforcement logic
- Data models and interfaces
- Screenshot metadata handling

## Project Structure

```
Vorsight.Core/
├── Audit/
│   ├── AuditEvent.cs           # Event data model
│   ├── AuditEventFilter.cs     # Event filtering logic
│   ├── AuditManager.cs         # Event log monitoring
│   └── IAuditManager.cs        # Interface for audit operations
├── IPC/
│   ├── INamedPipeServer.cs     # Server interface
│   ├── NamedPipeServer.cs      # Named pipes implementation
│   ├── PipeMessage.cs          # Message protocol
│   └── ScreenshotPipeHandler.cs # Screenshot transmission
├── Models/
│   └── SessionInfo.cs          # Session metadata
├── Scheduling/
│   ├── AccessSchedule.cs       # Schedule policy model
│   ├── IScheduleManager.cs     # Scheduling interface
│   └── ScheduleManager.cs      # Enforcement logic
├── Screenshots/
│   ├── IScreenshotService.cs   # Screenshot interface
│   └── ScreenshotMetadata.cs   # Screenshot metadata
└── Vorsight.Core.csproj        # Project file
```

## Core Modules

### 1. Audit System (Audit/)

#### IAuditManager Interface

```csharp
public interface IAuditManager : IAsyncDisposable
{
    bool IsMonitoring { get; }
    Task InitializeAsync();
    Task StartMonitoringAsync();
    Task StopMonitoringAsync();
    Task AddFilterAsync(AuditEventFilter filter);
    Task RemoveFilterAsync(string filterId);
    event EventHandler<AuditEventDetectedEventArgs> CriticalEventDetected;
    event EventHandler<TamperingDetectedEventArgs> TamperingDetected;
}
```

#### AuditManager Implementation

**Purpose**: Real-time Windows Event Log monitoring for security events

**Features**:
- Event ID filtering
- Event source filtering
- Critical event detection
- Tamper attempt tracking
- Async event processing

**Default Filters**:

| Filter ID | Event ID | Description | Severity |
|-----------|----------|-------------|----------|
| filter_user_creation | 4720 | User Account Created | CRITICAL |
| filter_group_modification | 4728 | User Added to Group | CRITICAL |
| filter_admin_privs | 4672 | Admin Privileges Used | HIGH |
| filter_account_lockout | 4740 | Account Lockout | MEDIUM |
| filter_policy_change | 4719 | Audit Policy Changed | CRITICAL |

#### AuditEventFilter

```csharp
public class AuditEventFilter
{
    public string FilterId { get; set; }
    public string Description { get; set; }
    public EventLogSource Source { get; set; }  // "Security", "System", etc.
    public int EventId { get; set; }
    public bool IsEnabled { get; set; }
    
    public static class CriticalEventIds
    {
        public const int UserAccountCreated = 4720;
        public const int GroupMembershipAdded = 4728;
        public const int PasswordReset = 4724;
        public const int SpecialPrivileges = 4672;
    }
}
```

### 2. IPC System (IPC/)

#### INamedPipeServer Interface

```csharp
public interface INamedPipeServer : IAsyncDisposable
{
    bool IsListening { get; }
    Task StartAsync();
    Task StopAsync();
    event EventHandler<PipeMessageReceivedEventArgs> MessageReceived;
    Task SendMessageAsync(string clientId, PipeMessage message);
}
```

#### NamedPipeServer Implementation

**Purpose**: Central IPC communication hub for Service ↔ Agent communication

**Features**:
- Multiple client support
- Async message processing
- Connection timeout handling
- Message queuing
- Graceful client disconnect

#### PipeMessage Protocol

```csharp
public class PipeMessage
{
    public byte MessageType { get; set; }    // 0x01=Screenshot, 0x02=Heartbeat, 0xFF=Shutdown
    public int PayloadSize { get; set; }    // Size of payload in bytes
    public byte[] Payload { get; set; }     // Binary payload data
    
    public byte[] Serialize() { ... }
    public static PipeMessage Deserialize(byte[] data) { ... }
}
```

**Message Types**:

| Type | Hex | Purpose | Direction |
|------|-----|---------|-----------|
| Screenshot Request | 0x01 | Request screenshot capture | Service → Agent |
| Heartbeat | 0x02 | Keep-alive check | Bidirectional |
| Activity Data | 0x03 | Send activity info | Agent → Service |
| Shutdown | 0xFF | Terminate Agent | Service → Agent |

#### ScreenshotPipeHandler

**Purpose**: Handles large binary screenshot data transfer

**Key Methods**:
- `SendScreenshotAsync(screenshot: byte[], metadata: ScreenshotMetadata)`
- `ReceiveScreenshotAsync() → (screenshot: byte[], metadata: ScreenshotMetadata)`
- `HandleStreamAsync(stream: Stream)`

### 3. Scheduling System (Scheduling/)

#### IScheduleManager Interface

```csharp
public interface IScheduleManager
{
    Task<IEnumerable<AccessSchedule>> GetSchedulesAsync();
    Task<AccessSchedule> GetScheduleAsync(string scheduleId);
    Task CreateScheduleAsync(AccessSchedule schedule);
    Task UpdateScheduleAsync(AccessSchedule schedule);
    Task DeleteScheduleAsync(string scheduleId);
    Task<bool> IsAccessAllowedAsync(int userId, DateTime currentTime);
    Task EnforceAccessAsync(int userId);
}
```

#### AccessSchedule Model

```csharp
public class AccessSchedule
{
    public string ScheduleId { get; set; }
    public int UserId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public DayOfWeek[] AllowedDays { get; set; }
    public bool IsEnabled { get; set; }
    
    // Policy options
    public bool AllowScreenTime { get; set; } = true;
    public int DailyLimitMinutes { get; set; } = 180;
    public bool AllowNetworkAccess { get; set; } = true;
    public string[] BlockedApplications { get; set; }
}
```

#### ScheduleManager Implementation

**Purpose**: Enforces time-based access restrictions

**Features**:
- Schedule validation
- Access control decisions
- Session termination
- Force logoff via `ExitWindowsEx`
- Schedule overlap detection
- Time zone support

**Enforcement Logic**:

```csharp
public async Task<bool> IsAccessAllowedAsync(int userId, DateTime currentTime)
{
    var schedule = await GetScheduleAsync(userId);
    if (!schedule.IsEnabled) return true;
    
    // Check time window
    if (currentTime < schedule.StartTime || currentTime > schedule.EndTime)
        return false;
        
    // Check day of week
    if (!schedule.AllowedDays.Contains(currentTime.DayOfWeek))
        return false;
        
    // Check daily limit
    if (schedule.ScreenTimeUsed >= schedule.DailyLimitMinutes)
        return false;
        
    return true;
}
```

### 4. Screenshot System (Screenshots/)

#### IScreenshotService Interface

```csharp
public interface IScreenshotService : IAsyncDisposable
{
    Task<byte[]> CaptureScreenAsync();
    Task<(byte[] image, ScreenshotMetadata metadata)> CaptureScreenWithMetadataAsync();
    ScreenshotMetadata GetLastMetadata();
}
```

#### ScreenshotMetadata

```csharp
public class ScreenshotMetadata
{
    public long Timestamp { get; set; }           // Unix ms timestamp
    public int Width { get; set; }
    public int Height { get; set; }
    public string Format { get; set; }            // "PNG" or "JPEG"
    public int CompressionLevel { get; set; }     // 0-9
    public string ImageHash { get; set; }         // SHA256
    public int SessionId { get; set; }
    public long FileSizeBytes { get; set; }
}
```

### 5. Models (Models/)

#### SessionInfo

```csharp
public class SessionInfo
{
    public int SessionId { get; set; }
    public string SessionName { get; set; }       // "Services", "Console", etc.
    public uint ProcessId { get; set; }
    public string UserName { get; set; }
    public DateTime LoginTime { get; set; }
    public long SessionUptime { get; set; }       // Milliseconds
    public bool IsInteractive { get; set; }       // Session 1 = true
    public SessionState State { get; set; }       // Active, Idle, etc.
}

public enum SessionState
{
    Active,
    Connected,
    ConnectQuery,
    Shadow,
    Disconnected,
    Idle,
    Listen,
    Reset
}
```

## Dependency Injection

Core services are registered in the Service's Dependency Injection container:

```csharp
// In Vorsight.Service/Program.cs
builder.Services.AddSingleton<INamedPipeServer>(sp =>
    new NamedPipeServer(sp.GetRequiredService<ILogger<NamedPipeServer>>(), "VorsightIPC"));

builder.Services.AddSingleton<IScheduleManager>(sp =>
    new ScheduleManager(sp.GetRequiredService<ILogger<ScheduleManager>>()));

builder.Services.AddSingleton<IAuditManager, AuditManager>();
```

## Error Handling

### Common Exceptions

| Exception | Scenario | Handling |
|-----------|----------|----------|
| `IOException` | IPC pipe disconnected | Attempt reconnect with backoff |
| `InvalidOperationException` | Screenshot capture unavailable | Log warning, retry next cycle |
| `UnauthorizedAccessException` | Insufficient privileges | Log error, skip operation |
| `TimeoutException` | IPC operation timeout | Abort operation, continue loop |

### Async Patterns

All I/O operations use async/await:

```csharp
// Good: Async IPC
var message = await server.ReceiveMessageAsync();

// Good: Async screenshot
var screenshot = await screenshotService.CaptureScreenAsync();

// Good: Async disposal
await using (var manager = new AuditManager(...))
{
    await manager.InitializeAsync();
}
```

## Logging Integration

All Core classes accept `ILogger<T>` via dependency injection:

```csharp
public class AuditManager(ILogger<AuditManager> logger) : IAuditManager
{
    public async Task InitializeAsync()
    {
        logger.LogInformation("Initializing audit manager");
        // ...
    }
}
```

## Performance Characteristics

| Component | Operation | Time | Notes |
|-----------|-----------|------|-------|
| Audit Manager | Event log scan | 100-500ms | First scan, then incremental |
| IPC Send | Transmit screenshot | 50-200ms | Depends on compression |
| Schedule Manager | Access check | 10-50ms | Cached schedule queries |
| Screenshot Service | Capture | 50-200ms | Varies by resolution |

## Testing Strategy

### Unit Test Coverage

- `AuditManager`: Filter matching, event detection
- `ScheduleManager`: Time window logic, enforcement rules
- `PipeMessage`: Serialization/deserialization
- `ScreenshotMetadata`: Hash verification

### Integration Test Scenarios

- IPC bidirectional communication
- Service-to-Agent message flow
- Schedule enforcement with mocked time
- Audit event filtering with event log

## Security Considerations

- **Audit Events**: Real-time monitoring prevents tampering
- **IPC**: Named pipes limited to local machine
- **Access Control**: Schedule enforcement at system level
- **Privilege Escalation**: Service runs as LocalSystem

## Related Documentation

- [IPC Protocol Specification](../features/IPC_PROTOCOL.md)
- [Audit System Details](../features/AUDIT_SYSTEM.md)
- [Access Scheduling](../features/ACCESS_SCHEDULING.md)
- [Vorsight.Service](./VORSIGHT_SERVICE.md)
- [Vorsight.Agent](./VORSIGHT_AGENT.md)

