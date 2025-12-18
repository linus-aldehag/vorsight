# Vörsight Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      WINDOWS SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         VORSIGHT SERVICE (LocalSystem)                   │   │
│  │         Running as Background Windows Service           │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐     │   │
│  │  │  KESTREL WEB SERVER                            │     │   │
│  │  │  • Port 9443 (production) / 5443 (dev)        │     │   │
│  │  │  • PSK Header Authentication                  │     │   │
│  │  │  • React Frontend (future)                    │     │   │
│  │  └────────────────────────────────────────────────┘     │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐     │   │
│  │  │  SERVICE WORKER (ExecuteAsync Loop)            │     │   │
│  │  │  • Health checks every 30 seconds              │     │   │
│  │  │  • Graceful shutdown coordination              │     │   │
│  │  └────────────────────────────────────────────────┘     │   │
│  │         ↓          ↓          ↓          ↓              │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┐          │   │
│  │  │  IPC     │Schedule  │ Audit    │Screenshot│          │   │
│  │  │ Server   │Manager   │Manager   │Service   │          │   │
│  │  ├──────────┼──────────┼──────────┼──────────┤          │   │
│  │  │ Named    │Enforce   │Event Log │ GDI+     │          │   │
│  │  │ Pipes    │Logoff    │Monitoring│ Capture  │          │   │
│  │  │ Handler  │(Via      │(Events   │ Semaphore│          │   │
│  │  │          │ExitWin   │4720,4728)│ Protected│          │   │
│  │  │          │-dowsEx)  │          │          │          │   │
│  │  └──────────┴──────────┴──────────┴──────────┘          │   │
│  │         ↓ Named Pipe          ↓ ExitWindowsEx           │   │
│  └─────────┼──────────────────────┼──────────────────────────┘  │
│            ↓                      ↓                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │    SESSION 1 (Child User Account)                       │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │   ┌──────────────────────────────────────────────┐     │    │
│  │   │  VORSIGHT AGENT (wuapihost.exe)             │     │    │
│  │   │  Launched via CreateProcessAsUser           │     │    │
│  │   │  Running in child user context              │     │    │
│  │   ├──────────────────────────────────────────────┤     │    │
│  │   │                                              │     │    │
│  │   │  ┌──────────────────────────────────────┐   │     │    │
│  │   │  │  IPC Client                          │   │     │    │
│  │   │  │  • Named Pipe Connection             │   │     │    │
│  │   │  │  • Session ID Registration           │   │     │    │
│  │   │  │  • Message Loop Handler              │   │     │    │
│  │   │  └──────────────────────────────────────┘   │     │    │
│  │   │         ↓ Screenshot Request                 │     │    │
│  │   │  ┌──────────────────────────────────────┐   │     │    │
│  │   │  │  Screenshot Capture                  │   │     │    │
│  │   │  │  • Captures display (all monitors)  │   │     │    │
│  │   │  │  • PNG compression                  │   │     │    │
│  │   │  │  • Retry logic (3 attempts)         │   │     │    │
│  │   │  │  • Sends via Named Pipe             │   │     │    │
│  │   │  └──────────────────────────────────────┘   │     │    │
│  │   │         ↓ Screenshot Data (bytes)            │     │    │
│  │   │  ┌──────────────────────────────────────┐   │     │    │
│  │   │  │  Message Serialization               │   │     │    │
│  │   │  │  Format: [Type][SessionId][Payload] │   │     │    │
│  │   │  └──────────────────────────────────────┘   │     │    │
│  │   └──────────────────────────────────────────────┘     │    │
│  │                                                         │    │
│  │   (User Desktop, Applications)                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Service Startup Sequence

```
Program.cs
    ↓
Serilog Configuration
    ↓
Host Builder Setup
    ↓ (Dependency Injection)
    ├─ INamedPipeServer (Singleton)
    ├─ IScheduleManager (Singleton)
    ├─ IAuditManager (Singleton)
    ├─ IScreenshotService (Singleton)
    └─ Worker (BackgroundService)
    ↓
Worker.ExecuteAsync()
    ↓
Initialize Components:
    ├─ await scheduleManager.InitializeAsync()      [Load schedules from disk]
    ├─ await auditManager.InitializeAsync()          [Setup Event Log filters]
    ├─ await ipcServer.StartAsync()                  [Open Named Pipe listener]
    ├─ await scheduleManager.StartEnforcementAsync() [Start enforcement loop]
    └─ Main Service Loop (30-sec health checks)
```

### 2. Screenshot Capture Request Flow

```
Service Requests Screenshot
    ↓ (via IPC Message)
Message: type=ScreenshotRequest, sessionId=1
    ↓ (NamedPipeServer routes to Agent)
Agent Receives Message
    ↓
HandleScreenshotRequest()
    ↓
screenshotService.CaptureScreenAsync()
    ↓
SemaphoreSlim.WaitAsync() [Ensure only one capture at a time]
    ↓
Wait 200ms for screen update
    ↓
GetCombinedScreenBounds() [Get all monitors]
    ↓
new Bitmap(bounds.Width, bounds.Height)
    ↓
Graphics.CopyFromScreen() [Capture pixels]
    ↓
bitmap.Save(memoryStream, ImageFormat.Png) [Compress]
    ↓
byte[] pngData = memoryStream.ToArray() [Extract bytes]
    ↓ (Never touches disk!)
Create PipeMessage with Payload=pngData
    ↓
await pipe.WriteAsync(serialized) [Send via Named Pipe]
    ↓
Service Receives Screenshot
    ↓
Stores in memory cache / sends to dashboard
```

### 3. Access Schedule Enforcement Flow

```
ScheduleManager.EnforceSchedulesAsync() [Runs every 60 seconds]
    ↓
foreach (schedule in _schedules.Values)
    ↓
schedule.GetTimeRemaining() [Check if within access window]
    ↓
├─ If TimeRemaining > 5 min
│   └─ Continue (access allowed)
│
├─ If TimeRemaining < 5 min AND > 0
│   ├─ Raise AccessTimeExpiring event
│   └─ Log warning (triggers parent notification)
│
└─ If TimeRemaining <= 0 (Access expired)
    ├─ Raise AccessTimeExpired event
    ├─ Call ForceLogoffAsync()
    │   ├─ ProcessHelper.TryEnablePrivilege(SE_SHUTDOWN_NAME)
    │   ├─ ShutdownHelper.TryForceLogoff()
    │   │   └─ ExitWindowsEx(EWX_LOGOFF | EWX_FORCE)
    │   └─ [Session 1 terminated immediately - NO SAVE]
    └─ Call PreventReloginAsync() [Future: Account lockout]
```

### 4. Audit Event Detection Flow

```
Windows Security Event Log
    ↓ (Event ID 4720, 4728, 4672 occurs)
    ↓
AuditManager.StartMonitoringAsync()
    ├─ Create EventLogQuery("Security")
    ├─ Create EventLogWatcher()
    └─ Register EventRecordWritten handler
    ↓
OnEventRecordWritten()
    ↓
CheckEventAgainstFilters(record)
    ↓
foreach (filter in _filters)
    ├─ If record.Id == filter.EventId
    │   ├─ Log SECURITY ALERT
    │   └─ Raise AdminActivityDetected event
    │       └─ (Could trigger remote notification, account lock)
    └─ Continue
```

## Data Flow Diagram: Screenshot Capture

```
┌─────────────────────────────────────────────────────────────────┐
│ Service (LocalSystem)                                            │
│                                                                  │
│ IPC Server listening on \\.\pipe\VorsightIPC                   │
│                                                                  │
│  Sends: PipeMessage {                                           │
│    Type: ScreenshotRequest,                                     │
│    SessionId: 1,                                                │
│    MessageId: "abc-123"                                         │
│  }                                                               │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Named Pipe (binary)
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ Agent (wuapihost.exe in Session 1)                              │
│                                                                  │
│ Receives: ScreenshotRequest message                             │
│                                                                  │
│ ScreenshotService.CaptureScreenAsync()                          │
│   │                                                              │
│   ├─ Acquire SemaphoreSlim (thread-safe)                        │
│   ├─ Sleep 200ms (let screen update)                            │
│   ├─ CaptureScreenInternal()                                    │
│   │   ├─ Rectangle bounds = GetCombinedScreenBounds()           │
│   │   ├─ new Bitmap(bounds.Width, bounds.Height)                │
│   │   ├─ Graphics.CopyFromScreen(bounds...)                     │
│   │   └─ return bitmap                                          │
│   ├─ MemoryStream memoryStream                                  │
│   ├─ bitmap.Save(memoryStream, ImageFormat.Png)                 │
│   ├─ byte[] pngData = memoryStream.ToArray()                    │
│   └─ Release SemaphoreSlim                                      │
│                                                                  │
│ Create Response Message:                                        │
│   Type: Screenshot                                              │
│   Payload: pngData (← PNG bytes, never on disk!)                │
│   SessionId: 1                                                  │
│                                                                  │
│ Serialize message                                               │
│ Write to Named Pipe                                             │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Named Pipe (binary)
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ Service Receives Response                                        │
│                                                                  │
│ NamedPipeServer.MessageReceived event fires                    │
│                                                                  │
│ Extract Payload (PNG bytes)                                     │
│   ├─ Store in memory cache                                      │
│   ├─ Optional: Serve via web API                               │
│   └─ Log successful capture                                     │
│                                                                  │
│ Update ScreenshotMetadata:                                      │
│   Width: 1920                                                    │
│   Height: 1080                                                   │
│   SizeBytes: 245632                                              │
│   CaptureTime: 2025-12-18T15:30:45.123Z                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## P/Invoke Privilege Elevation Chain

```
User Initiates Enforcement
    ↓
ScheduleManager.ForceLogoffAsync()
    ↓
ShutdownHelper.TryForceLogoff()
    ├─ ProcessHelper.TryEnablePrivilege("SeShutdownPrivilege")
    │   │
    │   ├─ GetCurrentProcess() → IntPtr processHandle
    │   ├─ OpenProcessToken(processHandle, TOKEN_ADJUST_PRIVILEGES, out tokenHandle)
    │   ├─ LookupPrivilegeValue(null, "SeShutdownPrivilege", out luid)
    │   ├─ Create TOKEN_PRIVILEGES with LUID
    │   ├─ AdjustTokenPrivileges(tokenHandle, false, tokenPrivileges, ...)
    │   └─ Return success
    │
    └─ ExitWindowsEx(EWX_LOGOFF | EWX_FORCE, SHTDN_REASON_FLAG_PLANNED)
        └─ [Session 1 terminated]
```

## Session ID Routing

```
Service (Session 0)                    Agent (Session 1)
  │                                      │
  ├─ Listen on \\.\pipe\VorsightIPC     │
  │   (LocalSystem has access)           │
  │                                      │
  └─ Detect Agent connect                │
     │                                    │
     └────→ Read SessionId (4 bytes) ←──┤
     │      (Agent sends: 0x01000000)    │
     │                                    │
     ├─ Map ConnectionId → SessionId     │
     │   _sessions[1] = pipStream        │
     │                                    │
     └────→ Route messages to SessionId 1
            All screenshots from Agent
            get cached under Session[1]
```

## Graceful Shutdown Sequence

```
Host receives SIGTERM / User presses Ctrl+C
    ↓
IHostApplicationLifetime.ApplicationStopping triggers
    ↓
Worker.StopAsync(cancellationToken)
    ↓
await scheduleManager.StopEnforcementAsync()
    ├─ Set _isEnforcementRunning = false
    ├─ Cancel _enforcementCts
    └─ await _enforcementTask (waits for loop to exit)
    ↓
await ipcServer.StopAsync()
    ├─ Cancel _cancellationTokenSource
    ├─ await _listenerTask
    ├─ Close all _sessions[].Dispose()
    └─ Clear _sessions dictionary
    ↓
auditManager.Dispose()
    └─ Stop EventLog watchers
    ↓
screenshotService.Dispose()
    └─ Clean up Bitmap resources
    ↓
Log "Vörsight Service stopped cleanly"
    ↓
[Service exits]
```

## Configuration Hierarchy

```
appsettings.json (Base)
    ↓
appsettings.Development.json (Overrides for dev)
    ↓
Environment variables (Highest priority)
    ↓
IConfiguration injected into:
    ├─ Worker
    ├─ ScheduleManager
    ├─ NamedPipeServer
    ├─ ScreenshotService
    └─ AuditManager
```

---

**Last Updated**: December 18, 2025
**Architecture Version**: 1.0
**Status**: Production Ready (Phase 1)

