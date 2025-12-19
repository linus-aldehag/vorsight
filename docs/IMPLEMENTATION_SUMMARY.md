# Vörsight Implementation Summary

## December 18, 2025

### Project Structure Complete ✅

The Vörsight PC management suite has been successfully scaffolded and implemented with the following architecture:

```
vorsight/
├── src/
│   ├── Vorsight.Service/          # Windows Service (LocalSystem) - Brain
│   │   ├── Program.cs             # Serilog + DI configuration
│   │   ├── Worker.cs              # Service orchestration loop
│   │   ├── Vorsight.Service.csproj
│   │   ├── appsettings.json       # Production config
│   │   └── appsettings.Development.json
│   ├── Vorsight.Agent/            # CLI Agent (wuapihost.exe) - Eye
│   │   ├── Program.cs             # IPC client + screenshot loop
│   │   └── Vorsight.Agent.csproj
│   ├── Vorsight.Core/             # Shared business logic
│   │   ├── IPC/
│   │   │   ├── INamedPipeServer.cs
│   │   │   ├── NamedPipeServer.cs        # ✅ Full implementation
│   │   │   ├── PipeMessage.cs            # ✅ Serialization support
│   │   │   └── ScreenshotPipeHandler.cs
│   │   ├── Screenshots/
│   │   │   └── IScreenshotService.cs     # ✅ GDI+ with retry logic
│   │   ├── Scheduling/
│   │   │   ├── AccessSchedule.cs
│   │   │   ├── IScheduleManager.cs
│   │   │   └── ScheduleManager.cs        # ✅ Full implementation
│   │   ├── Audit/
│   │   │   ├── AuditEventFilter.cs
│   │   │   ├── IAuditManager.cs
│   │   │   ├── AuditManager.cs           # ✅ Full implementation
│   │   │   └── AuditEvent.cs
│   │   ├── Models/
│   │   │   └── SessionInfo.cs
│   │   └── Vorsight.Core.csproj
│   ├── Vorsight.Native/           # P/Invoke wrappers
│   │   ├── ProcessInterop.cs      # ✅ CreateProcessAsUser, token management
│   │   ├── ProcessHelper.cs       # ✅ Safe wrapper utilities
│   │   ├── SessionInterop.cs      # ✅ WTS functions + WTSLogoffSession
│   │   ├── ShutdownInterop.cs     # ✅ ExitWindowsEx, session logoff
│   │   ├── ShutdownHelper.cs      # ✅ Safe shutdown wrappers
│   │   ├── TokenInterop.cs        # ✅ Privilege escalation
│   │   └── Vorsight.Native.csproj
│   └── Vorsight.Web/              # React frontend (future)
├── .gitignore                     # ✅ Updated with bin/, obj/
├── README.md                      # ✅ Comprehensive documentation
└── Vorsight.sln
```

---

## Core Features Implemented

### 1. Named Pipe IPC Server ✅
**File**: `src/Vorsight.Core/IPC/NamedPipeServer.cs`
- Bidirectional communication between Service and Agent
- Supports multiple concurrent sessions
- Binary message serialization with retry support
- Events: `SessionConnected`, `SessionDisconnected`, `MessageReceived`
- **Usage**: Service listens on "VorsightIPC" pipe for Agent connections

### 2. Screenshot Capture Service ✅
**File**: `src/Vorsight.Core/Screenshots/IScreenshotService.cs`
- GDI+ screen capture with multi-monitor support
- Semaphore-based thread synchronization
- Retry logic with exponential backoff (inspired by CloudGrabber)
- PNG compression + metadata tracking
- Fallback mechanism on capture failure
- **Returns**: `byte[]` PNG data or null on failure

### 3. Access Schedule Manager ✅
**File**: `src/Vorsight.Core/Scheduling/ScheduleManager.cs`
- Time-based access window enforcement
- Timezone-aware scheduling
- Daily/weekly schedule templates
- **Enforcement**: `ExitWindowsEx` for forced logoff when time expires
- 5-minute warning events before access expires
- JSON persistence to `%PROGRAMDATA%\Vorsight\schedules.json`
- **Events**: `AccessTimeExpiring`, `AccessTimeExpired`

### 4. Audit Manager ✅
**File**: `src/Vorsight.Core/Audit/AuditManager.cs`
- Windows Event Log monitoring setup
- Filter-based event detection (Event IDs 4720, 4728, 4672)
- Tamper detection event hooks
- Extensible filter system
- **Events**: `CriticalEventDetected`, `TamperingDetected`

### 5. P/Invoke Layer ✅
**Files**: `src/Vorsight.Native/`
- **ProcessInterop.cs**: `CreateProcessAsUser`, `DuplicateTokenEx`, `OpenProcess`
- **SessionInterop.cs**: `WTSGetActiveConsoleSessionId`, `WTSLogoffSession`, `WTSEnumerateSessions`
- **ShutdownInterop.cs**: `ExitWindowsEx` with force flags, `InitiateSystemShutdownEx`
- **TokenInterop.cs**: `AdjustTokenPrivileges`, `LookupPrivilegeValue`, privilege constants
- **ProcessHelper.cs**: Safe wrapper utilities for error handling
- **ShutdownHelper.cs**: Safe shutdown/logoff wrappers

### 6. Service Orchestration ✅
**File**: `src/Vorsight.Service/Worker.cs`
- DI container initialization for all core services
- Main service loop with 30-second health checks
- Graceful shutdown coordination
- Audit event hookups for security alerts
- Serilog structured logging to `logs/vorsight-service-.log` (rolling daily)

### 7. Agent CLI ✅
**File**: `src/Vorsight.Agent/Program.cs`
- Named Pipe client connection to Service
- Message loop handling screenshot requests
- Screenshot capture on demand
- Ping/Pong keep-alive
- Graceful shutdown on command
- Logs to `%TEMP%\vorsight\logs\agent-.log` (7-day retention)

### 8. Configuration ✅
**Files**: `appsettings.json` and `appsettings.Development.json`
```json
{
  "Service": {
    "ListeningPort": 9443,
    "PresharedKey": "CHANGE_THIS_VALUE_IN_PRODUCTION",
    "MaxScreenshotInterval": 5000,
    "AuditLogRetention": 90
  },
  "ChildUser": {
    "Username": "child",
    "SessionId": 1
  },
  "Agent": {
    "ExecutablePath": "C:\\Windows\\System32\\wuapihost.exe",
    "TimeoutSeconds": 30,
    "AutoRestartOnCrash": true
  },
  "IPC": {
    "PipeName": "VorsightIPC",
    "MaxConnections": 10,
    "BufferSize": 65536
  }
}
```

---

## NuGet Dependencies

### Vorsight.Core
- `System.Drawing.Common` (10.0.0)
- `System.Diagnostics.EventLog` (10.0.0)
- `Microsoft.Extensions.Logging.Abstractions` (10.0.0)

### Vorsight.Service
- `Microsoft.Extensions.Hosting` (10.0.0)
- `Serilog` (4.2.0)
- `Serilog.Extensions.Hosting` (9.0.0)
- `Serilog.Sinks.File` (6.0.0)
- `Serilog.Sinks.Console` (6.1.0)

### Vorsight.Agent
- `Serilog` (4.2.0)
- `Serilog.Sinks.File` (6.0.0)
- `System.Drawing.Common` (10.0.0)

### Vorsight.Native
- (Native only - no external dependencies)

---

## Key Design Decisions

### 1. IPC Protocol
- Binary serialization with BinaryWriter/BinaryReader
- Format: `[Header][MetadataLength][Metadata][PayloadLength][Payload]`
- Session ID registration on first connection
- 64KB message buffer per connection

### 2. Screenshot Handling
- **OFF-DISK**: PNG bytes transmitted directly over IPC, never written to temp files
- Semaphore prevents concurrent captures
- 200ms delay to allow screen update before capture
- Configurable retry logic (3 attempts with exponential backoff)

### 3. Access Control ("The Threshold")
- Enforcement runs every 60 seconds
- 5-minute warning before forced logoff
- Uses `ExitWindowsEx(EWX_LOGOFF | EWX_FORCE)` for immediate termination
- No graceful save - terminates immediately when time expires
- Timezone-aware scheduling prevents cheating by clock adjustment

### 4. Privilege Escalation
- Service runs as LocalSystem (max privileges)
- Agent runs in child user context (unprivileged)
- Token duplication via `DuplicateTokenEx` for Session 1 launch
- Proper privilege elevation for shutdown operations

### 5. Logging
- **Service**: `logs/vorsight-service-.log` (rolling daily, 30-day retention)
- **Agent**: `%TEMP%/vorsight/logs/agent-.log` (rolling daily, 7-day retention)
- Serilog structured logging with context properties
- Critical events trigger immediate console output

---

## Security Considerations

### Implemented ✅
1. P/Invoke wrappers with error handling and null reference checks
2. Named Pipe communication (local-only, no network exposure)
3. Privilege elevation validation before shutdown operations
4. SemaphoreSlim for thread-safe resource access
5. Graceful disposal and cleanup in all IDisposable implementations

### Future Enhancements 📋
1. PSK header authentication middleware for web API
2. TLS/encryption for Named Pipe communication
3. Event Log tampering detection and alerting
4. Account lockout policies after failed access attempts
5. Encrypted schedule/audit storage

---

## Build Instructions

```bash
# Clean and rebuild
dotnet clean
dotnet build Vorsight.sln -c Debug

# Build for production
dotnet build Vorsight.sln -c Release

# Build Agent as wuapihost.exe
dotnet build src/Vorsight.Agent -c Release
# Output: src/Vorsight.Agent/bin/Release/net10.0/win-x64/wuapihost.exe

# Run Service (local testing, no installation required)
cd src/Vorsight.Service
dotnet run
```

---

## Installation (Production)

```powershell
# As Administrator

# Build release binaries
dotnet build Vorsight.sln -c Release

# Install Service
$ServicePath = "C:\Program Files\Vorsight\Vorsight.Service.exe"
sc create VorsightService binPath= "$ServicePath" start= auto

# Start Service
net start VorsightService

# View logs
Get-Content "C:\Program Files\Vorsight\logs\vorsight-service-*.log" -Tail 50 -Wait
```

---

## Testing Checklist

- [ ] Service starts without errors
- [ ] IPC pipe accepts Agent connections
- [ ] Screenshot capture returns valid PNG data
- [ ] Schedule enforcement triggers logoff at correct time
- [ ] Audit filters detect security events
- [ ] Agent process launched in Session 1
- [ ] Graceful shutdown completes within timeout
- [ ] Log files created with correct retention policy
- [ ] All P/Invoke calls handle Win32 errors properly
- [ ] Null reference checks pass static analysis

---

## File Modifications Summary

### Created (16 files)
1. `ProcessHelper.cs` - Safe P/Invoke wrappers
2. `ShutdownHelper.cs` - Safe shutdown wrappers
3. `IScreenshotService.cs` - Screenshot capture implementation
4. `NamedPipeServer.cs` - IPC server implementation
5. `ScheduleManager.cs` - Schedule enforcement implementation
6. `AuditManager.cs` - Audit event implementation
7. `AuditEvent.cs` - Audit event model
8. Plus 9 more configuration/implementation files

### Updated (8 files)
1. `.gitignore` - Added bin/, obj/
2. `README.md` - Comprehensive documentation
3. `PipeMessage.cs` - Added Serialize/Deserialize methods
4. `SessionInterop.cs` - Added WTSLogoffSession
5. `Worker.cs` - Complete service orchestration
6. `Program.cs` (Service) - DI + Serilog setup
7. `Program.cs` (Agent) - IPC client implementation
8. All `.csproj` files - NuGet dependency configuration

### Project Files
- All targeted to `.NET 10.0`
- Nullable reference types enabled
- Implicit usings enabled
- Windows x64 runtime identifier

---

## Next Steps (Phase 2)

1. **Web API Layer** (Vorsight.Web)
   - Kestrel server embedded in Service
   - PSK header authentication middleware
   - REST endpoints for schedules, audit logs, screenshots

2. **React Frontend**
   - Dashboard for schedule management
   - Live audit log viewer
   - Screenshot gallery

3. **Advanced Features**
   - Database migration (SQLite or SQL Server)
   - Encrypted screenshot history
   - Network-based audit trail
   - Mobile notifications

4. **Testing**
   - Unit tests for business logic
   - Integration tests for IPC
   - End-to-end scheduling tests
   - P/Invoke error handling tests

---

**Status**: ✅ **READY FOR INITIAL TESTING**

The core architecture is complete and ready for local testing. All critical components are implemented with proper error handling, logging, and resource cleanup. The project is structured for easy extension and maintains separation of concerns across layers.


