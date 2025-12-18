# Vörsight Native (Vorsight.Native)

## Overview

Vörsight.Native provides P/Invoke (Platform Invoke) wrappers for Windows API functions. These low-level bindings enable the Service to interact with the Windows operating system at a privileged level for session management, process creation, and system shutdown operations.

## Project Structure

```
Vorsight.Native/
├── ProcessInterop.cs           # Process creation & management P/Invoke
├── ProcessHelper.cs            # Helper for process operations
├── SessionInterop.cs           # Session management P/Invoke
├── ShutdownInterop.cs          # System shutdown P/Invoke
├── ShutdownHelper.cs           # Helper for shutdown operations
├── TokenInterop.cs             # Token manipulation P/Invoke
└── Vorsight.Native.csproj      # Project file
```

## Core Modules

### 1. ProcessInterop.cs

**Purpose**: P/Invoke declarations for Windows process and session management

#### Key Structures

```csharp
[StructLayout(LayoutKind.Sequential)]
public struct PROCESS_INFORMATION
{
    public IntPtr hProcess;
    public IntPtr hThread;
    public uint dwProcessId;
    public uint dwThreadId;
}

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
public struct STARTUPINFO
{
    public uint cb;
    public string lpReserved;
    public string lpDesktop;
    public string lpTitle;
    public uint dwX;
    public uint dwY;
    public uint dwXSize;
    public uint dwYSize;
    public uint dwXCountChars;
    public uint dwYCountChars;
    public uint dwFillAttribute;
    public uint dwFlags;
    public ushort wShowWindow;
    public ushort cbReserved2;
    public IntPtr lpReserved2;
    public IntPtr hStdInput;
    public IntPtr hStdOutput;
    public IntPtr hStdError;
}
```

#### Constants

```csharp
public const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
public const uint NORMAL_PRIORITY_CLASS = 0x00000020;
public const uint CREATE_NEW_CONSOLE = 0x00000010;
public const uint DETACHED_PROCESS = 0x00000008;
```

#### Key Functions

##### CreateProcessAsUser

```csharp
[DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern bool CreateProcessAsUser(
    IntPtr hToken,                          // User token handle
    string lpApplicationName,               // Executable path
    string lpCommandLine,                   // Command arguments
    IntPtr lpProcessAttributes,             // Security attributes (null)
    IntPtr lpThreadAttributes,              // Security attributes (null)
    bool bInheritHandles,                   // Inherit parent handles
    uint dwCreationFlags,                   // Flags (CREATE_UNICODE_ENVIRONMENT)
    IntPtr lpEnvironment,                   // Environment block
    string lpCurrentDirectory,              // Working directory
    ref STARTUPINFO lpStartupInfo,          // Startup configuration
    out PROCESS_INFORMATION lpProcessInformation  // Output: process info
);
```

**Usage**: Launch the Agent process into the child user's session

**Example**:
```csharp
// Load user token
IntPtr userToken = GetUserToken(userId);

// Configure startup
STARTUPINFO startupInfo = new STARTUPINFO
{
    cb = (uint)Marshal.SizeOf(typeof(STARTUPINFO)),
    lpDesktop = "winsta0\\default",  // User's desktop
    dwFlags = STARTF_USESHOWWINDOW
};

// Create process
CreateProcessAsUser(
    userToken,
    "C:\\Windows\\wuapihost.exe",
    "wuapihost.exe",
    IntPtr.Zero,
    IntPtr.Zero,
    false,
    CREATE_UNICODE_ENVIRONMENT,
    IntPtr.Zero,
    "C:\\temp",
    ref startupInfo,
    out PROCESS_INFORMATION procInfo
);

Log.Information("Agent launched: PID {ProcessId}", procInfo.dwProcessId);
```

##### GetCurrentProcess / GetProcessId

```csharp
[DllImport("kernel32.dll", SetLastError = true)]
public static extern IntPtr GetCurrentProcess();

[DllImport("kernel32.dll", SetLastError = true)]
public static extern uint GetProcessId(IntPtr hProcess);
```

### 2. SessionInterop.cs

**Purpose**: P/Invoke declarations for Windows session management

#### Key Functions

##### WTSGetActiveConsoleSessionId

```csharp
[DllImport("kernel32.dll", SetLastError = true)]
public static extern uint WTSGetActiveConsoleSessionId();
```

**Usage**: Determine which session is the interactive console session

**Returns**: Session ID (typically 1 for user sessions, 0 for system)

##### WTSEnumerateSessions

```csharp
[DllImport("wtsapi32.dll", SetLastError = true)]
public static extern bool WTSEnumerateSessions(
    IntPtr hServer,                // Server handle (WTS_CURRENT_SERVER = IntPtr.Zero)
    uint Reserved,                 // Reserved (0)
    uint Version,                  // Version (1)
    out IntPtr ppSessionInfo,      // Output: session array
    out uint pCount                // Output: session count
);
```

**Usage**: Enumerate all active sessions on the system

**Example**:
```csharp
WTSEnumerateSessions(
    IntPtr.Zero,                   // Local server
    0,
    1,
    out IntPtr ppSessionInfo,
    out uint sessionCount
);

// Iterate and free
for (int i = 0; i < sessionCount; i++)
{
    var sessionInfo = Marshal.PtrToStructure<WTS_SESSION_INFO>(
        ppSessionInfo + Marshal.SizeOf<WTS_SESSION_INFO>() * i
    );
    
    Log.Information("Session {SessionId}: {SessionName}", 
        sessionInfo.SessionId, sessionInfo.pWinStationName);
}

WTSFreeMemory(ppSessionInfo);
```

##### WTSSessionInfo Structure

```csharp
[StructLayout(LayoutKind.Sequential)]
public struct WTS_SESSION_INFO
{
    public uint SessionId;
    public IntPtr pWinStationName;  // Session name (e.g., "RDP-Tcp#1")
    public WTS_CONNECTSTATE_CLASS State;
}

public enum WTS_CONNECTSTATE_CLASS
{
    Active,
    Connected,
    ConnectQuery,
    Shadow,
    Disconnected,
    Idle,
    Listen,
    Reset,
    Down,
    Init
}
```

### 3. ShutdownInterop.cs

**Purpose**: P/Invoke declarations for system shutdown and session termination

#### Key Functions

##### ExitWindowsEx

```csharp
[DllImport("user32.dll", SetLastError = true)]
public static extern bool ExitWindowsEx(uint uFlags, uint dwReason);
```

**Flags**:
- `EWX_LOGOFF = 0x0` - Log off user (graceful)
- `EWX_SHUTDOWN = 0x1` - Shutdown system
- `EWX_REBOOT = 0x2` - Reboot system
- `EWX_FORCE = 0x4` - Force termination
- `EWX_POWEROFF = 0x8` - Power off system

**Usage**: Force logout of child user when schedule expires

**Example**:
```csharp
// Graceful logoff
ExitWindowsEx(EWX_LOGOFF, SHTDN_REASON_FLAG_USER_DEFINED);

// Or forceful logout (if user doesn't respond in time)
ExitWindowsEx(EWX_LOGOFF | EWX_FORCE, SHTDN_REASON_FLAG_USER_DEFINED);
```

##### InitiateSystemShutdown

```csharp
[DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern uint InitiateSystemShutdown(
    string lpMachineName,              // Machine name (null = local)
    string lpMessage,                  // Shutdown message (shown to user)
    uint dwTimeout,                    // Timeout in seconds
    bool bForceAppsClosed,             // Force close applications
    bool bRebootAfterShutdown          // Reboot after shutdown
);
```

##### AdjustTokenPrivileges

```csharp
[DllImport("advapi32.dll", SetLastError = true)]
public static extern bool AdjustTokenPrivileges(
    IntPtr TokenHandle,
    bool DisableAllPrivileges,
    ref TOKEN_PRIVILEGES NewState,
    uint BufferLength,
    IntPtr PreviousState,
    IntPtr ReturnLength
);
```

**Usage**: Enable privileges needed for shutdown operations

**Example**:
```csharp
// Enable SE_SHUTDOWN_NAME privilege
LookupPrivilegeValue(null, SE_SHUTDOWN_NAME, out LUID luid);
var privilege = new TOKEN_PRIVILEGES
{
    PrivilegeCount = 1,
    Privileges = new[] {
        new LUID_AND_ATTRIBUTES
        {
            Luid = luid,
            Attributes = SE_PRIVILEGE_ENABLED
        }
    }
};

AdjustTokenPrivileges(
    GetCurrentProcessToken(),
    false,
    ref privilege,
    0,
    IntPtr.Zero,
    IntPtr.Zero
);
```

### 4. TokenInterop.cs

**Purpose**: P/Invoke declarations for token manipulation and privilege escalation

#### Key Functions

##### OpenProcessToken

```csharp
[DllImport("advapi32.dll", SetLastError = true)]
public static extern bool OpenProcessToken(
    IntPtr ProcessHandle,
    uint DesiredAccess,
    out IntPtr TokenHandle
);
```

**Desired Access Constants**:
- `TOKEN_QUERY = 0x0008`
- `TOKEN_QUERY_SOURCE = 0x0010`
- `TOKEN_ADJUST_PRIVILEGES = 0x0020`
- `TOKEN_ASSIGN_PRIMARY = 0x0001`
- `TOKEN_DUPLICATE = 0x0002`
- `TOKEN_ALL_ACCESS = 0xF01FF`

##### DuplicateTokenEx

```csharp
[DllImport("advapi32.dll", SetLastError = true)]
public static extern bool DuplicateTokenEx(
    IntPtr hExistingToken,
    uint dwDesiredAccess,
    IntPtr lpTokenAttributes,
    SECURITY_IMPERSONATION_LEVEL ImpersonationLevel,
    TOKEN_TYPE TokenType,
    out IntPtr phNewToken
);
```

**Token Types**:
- `TokenPrimary = 1` - Primary token (for CreateProcessAsUser)
- `TokenImpersonation = 2` - Impersonation token

##### CreateEnvironmentBlock

```csharp
[DllImport("userenv.dll", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern bool CreateEnvironmentBlock(
    out IntPtr lpEnvironment,
    IntPtr hToken,
    bool bInherit
);

[DllImport("userenv.dll", SetLastError = true)]
public static extern bool DestroyEnvironmentBlock(IntPtr lpEnvironment);
```

**Usage**: Create environment variables for the target user

### 5. ProcessHelper.cs

**Purpose**: High-level helper methods for common process operations

#### Key Methods

##### LaunchProcessInSession

```csharp
public static ProcessInfo LaunchProcessInSession(
    int sessionId,
    string applicationName,
    string arguments = null,
    string workingDirectory = null
)
{
    // Get session user token
    var userToken = GetSessionUserToken(sessionId);
    
    // Create environment block for user
    CreateEnvironmentBlock(out IntPtr envBlock, userToken, false);
    
    // Configure process startup
    var startupInfo = new STARTUPINFO
    {
        cb = (uint)Marshal.SizeOf(typeof(STARTUPINFO)),
        lpDesktop = "winsta0\\default",
        dwFlags = STARTF_USESHOWWINDOW,
        wShowWindow = SW_SHOW
    };
    
    // Launch process as user
    CreateProcessAsUser(
        userToken,
        applicationName,
        arguments,
        IntPtr.Zero,
        IntPtr.Zero,
        false,
        CREATE_UNICODE_ENVIRONMENT,
        envBlock,
        workingDirectory,
        ref startupInfo,
        out PROCESS_INFORMATION procInfo
    );
    
    // Cleanup
    DestroyEnvironmentBlock(envBlock);
    CloseHandle(userToken);
    
    return new ProcessInfo { ProcessId = procInfo.dwProcessId };
}
```

### 6. ShutdownHelper.cs

**Purpose**: High-level helper methods for shutdown operations

#### Key Methods

##### LogoffUser

```csharp
public static bool LogoffUser(int sessionId, bool force = false)
{
    uint flags = EWX_LOGOFF;
    if (force)
        flags |= EWX_FORCE;
    
    // Enable shutdown privilege
    EnableShutdownPrivilege();
    
    // Execute logoff for session
    return ExitWindowsEx(flags, SHTDN_REASON_FLAG_USER_DEFINED);
}
```

## Common Patterns

### Safe P/Invoke Wrapper

```csharp
public static T SafeCall<T>(Func<T> operation, string operationName) where T : bool
{
    try
    {
        if (!operation())
        {
            int errorCode = Marshal.GetLastWin32Error();
            throw new Win32Exception(errorCode, 
                $"{operationName} failed: {new Win32Exception(errorCode).Message}");
        }
        return true;
    }
    catch (Exception ex)
    {
        Log.Error(ex, "{OperationName} failed", operationName);
        throw;
    }
}
```

### Resource Cleanup

```csharp
// Always clean up unmanaged resources
try
{
    // Use P/Invoke
    CreateEnvironmentBlock(out IntPtr envBlock, token, false);
    
    // Use envBlock
    CreateProcessAsUser(..., envBlock, ...);
}
finally
{
    if (envBlock != IntPtr.Zero)
        DestroyEnvironmentBlock(envBlock);
}
```

## Error Handling

### Win32Exception Translation

```csharp
try
{
    CreateProcessAsUser(...);
}
catch (Win32Exception ex)
{
    // Common errors:
    // ERROR_ACCESS_DENIED (5) - Insufficient privileges
    // ERROR_FILE_NOT_FOUND (2) - Executable not found
    // ERROR_INVALID_HANDLE (6) - Invalid token handle
    
    Log.Error(ex, "CreateProcessAsUser failed: {ErrorCode}", ex.NativeErrorCode);
}
```

### Privilege Requirements

Certain operations require specific privileges to be enabled:

| Operation | Required Privilege | Enabled By |
|-----------|-------------------|-----------|
| ExitWindowsEx | SE_SHUTDOWN_NAME | AdjustTokenPrivileges |
| CreateProcessAsUser | SE_IMPERSONATE_NAME | LocalSystem context |
| Session enumeration | Read session info | LocalSystem context |
| Token manipulation | SE_TCB_NAME | LocalSystem context |

## Performance Considerations

- **P/Invoke overhead**: Minimal (~1-10μs per call)
- **Process creation**: 500-2000ms (includes environment setup)
- **Session enumeration**: 10-100ms (depends on session count)
- **Token operations**: 100-500ms (privilege adjustment)

## Security Implications

### Privilege Escalation

Native interop enables the Service (LocalSystem) to:
- Create processes as any user
- Terminate user sessions
- Access privileged resources
- Modify system configuration

### Mitigation Strategies

- Only enabled for Vörsight Service running as LocalSystem
- Privilege escalation logged and audited
- Session termination requires schedule verification
- No remote execution capability

## Platform Support

- **Target**: Windows 10+, Windows Server 2016+
- **Architecture**: x86-64 (win-x64)
- **Framework**: .NET 10.0
- **Runtime**: Windows-only (P/Invoke requires Windows APIs)

## Related Documentation

- [Vorsight.Service](./VORSIGHT_SERVICE.md)
- [Vorsight.Agent](./VORSIGHT_AGENT.md)
- [Access Scheduling](../features/ACCESS_SCHEDULING.md)
- [Architecture Overview](../ARCHITECTURE.md)

## Additional Resources

- [Microsoft P/Invoke Documentation](https://docs.microsoft.com/en-us/dotnet/framework/interop/consuming-unmanaged-dll-functions)
- [Windows API Reference](https://docs.microsoft.com/en-us/windows/win32/api/)
- [Session Management](https://docs.microsoft.com/en-us/windows/win32/termserv/terminal-services-api)
- [Token Privileges](https://docs.microsoft.com/en-us/windows/win32/secauthz/privilege-constants)

