# Ö rsight - PC Management Suite for Child Safety

A comprehensive Windows-based PC management system designed to provide parental oversight, access scheduling, and activity auditing for child user accounts.

## Project Overview

Ö rsight (spelled `vorsight` for GitHub compatibility) is a sophisticated client-server architecture built in C# and designed to run on Windows systems. It operates at the system level to manage access schedules, capture user activity, and maintain audit logs for a designated child user account.

### Core Components

- **Vorsight.Service** - The "Brain": A Windows Service running as LocalSystem, hosting a Kestrel web server with a React frontend
- **Vorsight.Agent** - The "Eye": A lightweight CLI tool (`wuapihost.exe`) that captures screenshots and activity data in the interactive user session
- **Vorsight.Core** - Shared business logic, IPC handling, audit management, and scheduling
- **Vorsight.Native** - P/Invoke wrappers for Windows API calls (session management, process creation, shutdown)
- **Vorsight.Web** - React frontend served by the Kestrel web server

## Architecture

### System Service (Vorsight.Service)

- Runs as **LocalSystem** for maximum privileges
- Hosts a **Kestrel web server** on a high-numbered port
- **Requires PSK header authentication** for all API requests
- Manages access schedules and enforces time-based restrictions
- Orchestrates the Agent via Named Pipes IPC
- Monitors Windows Event Logs for security events

### Client Agent (Vorsight.Agent)

- Lightweight CLI tool named **wuapihost.exe**
- Launched by the Service into the **interactive user session (Session 1)**
- Communicates with Service via Named Pipes
- Captures screenshots and activity data
- Stays **off-disk** (binary data transmitted over IPC)

### Key Features

#### 1. **IPC (Named Pipes)**
- Secure communication between Service and Agent
- Transmits screenshot data (`byte[]`) without writing to disk
- Bi-directional messaging for control and telemetry

#### 2. **The Pulse**
- Service-driven scheduling logic
- Triggers Agent at configurable intervals for screenshots
- Real-time activity monitoring

#### 3. **Access Scheduling & Enforcement**
- Time-based access control policies
- Automatic session termination when time expires
- Force logoff via `ExitWindowsEx` P/Invoke
- Session monitoring to prevent re-login

#### 4. **Audit Logging**
- Real-time Windows Event Log monitoring
- Tracks security events (Event IDs 4720, 4728, etc.)
- Detects admin tampering attempts
- Maintains audit trail in Service database

#### 5. **Agent Execution**
- Service launches Agent using `CreateProcessAsUser`
- Runs in child user's interactive session
- Automatic restart on crash/exit
- Graceful shutdown on schedule enforcement

## Project Structure

```
vorsight/
├── src/
│   ├── Vorsight.Service/           # Windows Service (LocalSystem)
│   │   ├── Program.cs
│   │   ├── Worker.cs               # Service worker loop
│   │   ├── Vorsight.Service.csproj
│   │   ├── appsettings.json
│   │   └── appsettings.Development.json
│   ├── Vorsight.Agent/             # CLI Agent (wuapihost.exe)
│   │   ├── Program.cs
│   │   └── Vorsight.Agent.csproj
│   ├── Vorsight.Core/              # Shared business logic
│   │   ├── Audit/
│   │   │   ├── AuditEventFilter.cs
│   │   │   └── IAuditManager.cs
│   │   ├── IPC/
│   │   │   ├── INamedPipeServer.cs
│   │   │   ├── PipeMessage.cs
│   │   │   └── ScreenshotPipeHandler.cs
│   │   ├── Models/
│   │   │   └── SessionInfo.cs
│   │   ├── Scheduling/
│   │   │   ├── AccessSchedule.cs
│   │   │   └── IScheduleManager.cs
│   │   └── Vorsight.Core.csproj
│   ├── Vorsight.Native/            # P/Invoke signatures
│   │   ├── ProcessInterop.cs       # CreateProcessAsUser, etc.
│   │   ├── SessionInterop.cs       # Session management
│   │   ├── ShutdownInterop.cs      # ExitWindowsEx, etc.
│   │   ├── TokenInterop.cs         # Token manipulation
│   │   └── Vorsight.Native.csproj
│   └── Vorsight.Web/               # React frontend + API
│       ├── Program.cs
│       ├── Vorsight.Web.csproj
│       ├── appsettings.json
│       └── appsettings.Development.json
├── Vorsight.sln
└── README.md
```

## Key P/Invoke Signatures

### ProcessInterop.cs - Process Creation

```csharp
/// <summary>
/// Creates a process in the specified user session
/// </summary>
[DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern bool CreateProcessAsUser(
    IntPtr hToken,
    string lpApplicationName,
    string lpCommandLine,
    IntPtr lpProcessAttributes,
    IntPtr lpThreadAttributes,
    bool bInheritHandles,
    uint dwCreationFlags,
    IntPtr lpEnvironment,
    string lpCurrentDirectory,
    ref STARTUPINFO lpStartupInfo,
    out PROCESS_INFORMATION lpProcessInformation);

/// <summary>
/// Retrieves the primary access token for a process
/// </summary>
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool OpenProcessToken(
    IntPtr ProcessHandle,
    uint DesiredAccess,
    out IntPtr TokenHandle);

public const uint TOKEN_DUPLICATE = 0x0002;
public const uint TOKEN_QUERY = 0x0008;
```

### SessionInterop.cs - Session Management

```csharp
/// <summary>
/// Enumerates sessions on the terminal server
/// </summary>
[DllImport("wtsapi32.dll", SetLastError = true)]
public static extern bool WTSEnumerateSessions(
    IntPtr hServer,
    uint Reserved,
    uint Version,
    out IntPtr ppSessionInfo,
    out uint pCount);

/// <summary>
/// Queries session information
/// </summary>
[DllImport("wtsapi32.dll", SetLastError = true)]
public static extern bool WTSQuerySessionInformation(
    IntPtr hServer,
    uint SessionId,
    WTS_INFO_CLASS WTSInfoClass,
    out IntPtr ppBuffer,
    out uint pBytesReturned);

public const uint WTS_CURRENT_SERVER_HANDLE = 0;
```

### ShutdownInterop.cs - System Shutdown

```csharp
/// <summary>
/// Terminates user sessions and optionally shuts down the system
/// </summary>
[DllImport("user32.dll", SetLastError = true)]
public static extern bool ExitWindowsEx(
    ExitWindowsFlags uFlags,
    uint dwReason);

[Flags]
public enum ExitWindowsFlags : uint
{
    EWX_LOGOFF = 0,
    EWX_SHUTDOWN = 1,
    EWX_REBOOT = 2,
    EWX_FORCE = 4,
    EWX_POWEROFF = 8,
    EWX_FORCEIFHUNG = 16
}

/// <summary>
/// Forces termination of a specific session (requires admin)
/// </summary>
[DllImport("wtsapi32.dll", SetLastError = true)]
public static extern bool WTSLogoffSession(
    IntPtr hServer,
    uint SessionId,
    bool bWait);
```

### TokenInterop.cs - Token Manipulation

```csharp
/// <summary>
/// Duplicates a token for process creation
/// </summary>
[DllImport("advapi32.dll", SetLastError = true)]
public static extern bool DuplicateTokenEx(
    IntPtr hExistingToken,
    uint dwDesiredAccess,
    IntPtr lpTokenAttributes,
    SECURITY_IMPERSONATION_LEVEL ImpersonationLevel,
    TOKEN_TYPE TokenType,
    out IntPtr phNewToken);

public enum SECURITY_IMPERSONATION_LEVEL
{
    SecurityAnonymous,
    SecurityIdentification,
    SecurityImpersonation,
    SecurityDelegation
}

public enum TOKEN_TYPE
{
    TokenPrimary = 1,
    TokenImpersonation = 2
}
```

## Installation & Setup

### Prerequisites

- **Windows 10/11** (x64 or x86)
- **.NET 6.0+** runtime
- Administrator privileges for initial installation

### Configuration

The Service reads configuration from `appsettings.json`:

```json
{
  "Service": {
    "ListeningPort": 9443,
    "PresharedKey": "your-psk-here",
    "MaxScreenshotInterval": 5000,
    "AuditLogRetention": 90
  },
  "ChildUser": {
    "Username": "child",
    "SessionId": 1
  }
}
```

**Important Notes:**
- The PSK should be extracted at installation and stored securely
- Session ID for interactive user is typically **1**
- Port should be high-numbered and non-standard for security

### Agent Build

The Agent is built as `wuapihost.exe` for obfuscation purposes:

```bash
dotnet build src/Vorsight.Agent -c Release
# Output: bin/Release/wuapihost.exe
```

The Service locates this executable via configuration:

```json
{
  "Agent": {
    "ExecutablePath": "C:\\Windows\\System32\\wuapihost.exe"
  }
}
```

## Service Installation

To install the service (requires admin):

```powershell
# Using sc.exe
sc create VorsightService binPath= "C:\Path\To\Vorsight.Service.exe" start= auto

# Start the service
net start VorsightService
```

To uninstall:

```powershell
net stop VorsightService
sc delete VorsightService
```

## Security Considerations

### Privilege Escalation

- Service runs as **LocalSystem** to access Session 1
- Agent runs in child user's context (unprivileged)
- Token duplication strictly controlled

### Communication Security

- All web API calls require **PSK header authentication**
- Named Pipe communication is **local-only** (same machine)
- No credentials transmitted over IPC

### Audit Trail

- All authentication attempts logged to Windows Event Log
- Admin actions trigger immediate audit alert
- Real-time monitoring for tampering detection

### Agent Protection

- Agent executable is **not deletable** by child user
- File ACLs prevent modification
- Automatic restart on crash ensures continuous monitoring

## Development

### Building

```bash
dotnet build Vorsight.sln -c Debug
```

### Running the Service (Local Testing)

Use the test harness in `Vorsight.Service` (not yet implemented):

```bash
cd src/Vorsight.Service
dotnet run
```

This runs without requiring Windows Service installation.

### Running the Agent

```bash
cd src/Vorsight.Agent
dotnet run -- --pipe-name "VorsightPipe_{SessionId}"
```

## Future Enhancements

- [ ] Persistent screenshot history with encryption
- [ ] Custom alert notifications to parent device
- [ ] Network-based monitoring (off-device audit logs)
- [ ] Geofencing via client IP tracking
- [ ] Advanced reporting dashboard
- [ ] Scheduled maintenance windows
- [ ] Graceful shutdown notifications before enforcement

## License

[To be determined]

## Contributing

[To be determined]

---

**Status**: Early Development  
**Last Updated**: December 18, 2025

