﻿# Vörsight Agent (Vorsight.Agent)

## Overview

The Vörsight Agent is a lightweight CLI application (`wuapihost.exe`) that runs in the child user's interactive session (Session 1). It serves as the "eye" of the system, capturing screenshots and user activity data.

## Key Responsibilities

1. **Screenshot Capture** - Captures GDI+ screenshots of the user session
2. **IPC Client** - Communicates with the Service via Named Pipes
3. **Activity Monitoring** - Transmits activity data to the Service
4. **Session Management** - Operates within the user's session context
5. **Graceful Shutdown** - Responds to service commands for clean termination

## Command-Line Interface

The Agent is a one-shot command-line tool that accepts parameters to control behavior:

```bash
wuapihost.exe <command> [options]
```

### Available Commands

#### screenshot - Capture and send screenshot
```bash
wuapihost.exe screenshot [--format png|jpeg] [--quality 0-100]
```
- Captures current screen
- Sends screenshot via IPC pipe (0x81 message type)
- Exits immediately after transmission

#### activity - Report user activity
```bash
wuapihost.exe activity [--interval seconds]
```
- Gathers activity metrics (applications, keypresses, clicks, network)
- Sends activity data via IPC pipe (0x03 message type)
- Exits after transmission

#### ping - Connectivity check
```bash
wuapihost.exe ping
```
- Sends heartbeat response via IPC pipe (0x02 message type)
- Returns timestamp and status
- Used by Service to verify Agent responsiveness

## Architecture

### Agent Execution Flow

```
Command Line Arguments
    ↓
Program.cs (Main Entry Point)
    ↓
Serilog Configuration (Console + File Logging)
    ↓
Parse Command & Session ID
    ↓
Connect to IPC Pipe (VorsightIPC)
    ↓
Execute Command:
  ├─ screenshot → Capture, encode, send
  ├─ activity → Gather metrics, serialize, send
  └─ ping → Generate response, send
    ↓
Log Results & Exit (0=success, 1=error)
```

### Key Components

#### ScreenshotService
- **Purpose**: Captures screenshots using GDI+
- **Location**: `ScreenshotService.cs`
- **Key Features**:
  - GDI+ rendering pipeline
  - Semaphore-protected resources
  - Binary PNG/JPEG encoding
  - Timestamp metadata
  - Resolution detection

#### IPC Client
- **Purpose**: Named Pipes communication with Service
- **Location**: `Program.cs` (uses Core/IPC/NamedPipeClientStream)
- **Key Features**:
  - Bi-directional message passing
  - Binary protocol support
  - 5-second connection timeout
  - Automatic reconnection on disconnect
  - Session ID registration

#### Logger Configuration
- **Purpose**: Structured logging for debugging
- **Location**: `Program.cs` (Serilog setup)
- **Features**:
  - **Console output** for real-time debugging
  - Daily rolling logs for diagnostics
  - 7-day retention
  - Debug minimum level
  - Dual output (console + file)

**Note**: The Agent is designed as a **one-off command-line tool**, not a long-lived daemon. It executes, captures/reports via IPC pipes, and terminates. Console logging enables immediate visibility into Agent operations.

## Session Management

### Session ID Detection

The Agent determines its session ID through multiple methods:

```csharp
// Method 1: Environment variable (set by Service)
var sessionId = int.Parse(Environment.GetEnvironmentVariable("VORSIGHT_SESSION_ID") ?? "-1");

// Method 2: Current process session ID
if (sessionId < 0)
{
    sessionId = GetSessionId();  // Uses P/Invoke to query session
}
```

### Execution Context

The Agent operates as a **one-off command-line tool**, not a long-lived daemon:

- **Lifetime**: Launches, processes requests, terminates
- **Invocation**: Service calls `CreateProcessAsUser` with `wuapihost.exe` arguments
- **Reporting**: Returns results via IPC Named Pipes (not stdout)
- **Exit**: Cleanly terminates after handling requests or on shutdown command
- **User Context**: Child user account (not System)
- **Session**: Session 1 (interactive session)
- **Privileges**: Limited to child user capabilities
- **Desktop**: User's active desktop (visible session)
- **Isolation**: Cannot access system-level resources

## IPC Protocol

### Connection Sequence

1. **Client Initialization**
   ```
   Agent starts → Creates NamedPipeClientStream
   ```

2. **Connect to Server**
   ```
   await pipeClient.ConnectAsync(5000);  // 5-second timeout
   ```

3. **Register Session**
   ```
   Send: [SessionId (int32)]
   ```

4. **Wait for Commands**
   ```
   Listen on pipe for incoming messages
   ```

### Message Format

Each message follows this format:

```
┌─────────────────────────────────────┐
│ Message Type (1 byte)               │
├─────────────────────────────────────┤
│ Payload Size (4 bytes, int32)       │
├─────────────────────────────────────┤
│ Payload Data (variable length)      │
└─────────────────────────────────────┘
```

### Supported Commands

| Command | Type | Payload | Response |
|---------|------|---------|----------|
| Capture Screenshot | `0x01` | `{ interval: int }` | `{ image: byte[], timestamp: long }` |
| Heartbeat | `0x02` | (empty) | `{ status: "alive", sessionId: int }` |
| Shutdown | `0xFF` | (empty) | (none - process exits) |

## Screenshot Capture

### Process Flow

```
Service sends CAPTURE_SCREENSHOT command
    ↓
Agent calls ScreenshotService.CaptureScreenAsync()
    ↓
Semaphore acquires render lock
    ↓
GDI+ captures screen to Bitmap
    ↓
Bitmap encoded to PNG/JPEG byte[]
    ↓
Metadata added (timestamp, resolution, hash)
    ↓
Binary data transmitted over IPC
    ↓
Bitmap disposed, memory released
```

### Screenshot Metadata

```csharp
public class ScreenshotMetadata
{
    public long Timestamp { get; set; }           // Unix timestamp (ms)
    public int Width { get; set; }                // Screen width in pixels
    public int Height { get; set; }               // Screen height in pixels
    public string Format { get; set; }            // "PNG" or "JPEG"
    public int CompressionLevel { get; set; }     // 0-9 for PNG, 85-95 for JPEG
    public string ImageHash { get; set; }         // SHA256 hash for verification
    public int SessionId { get; set; }            // Session ID
}
```

### Performance Characteristics

- **Capture Time**: ~50-200ms depending on resolution
- **PNG Compression**: 70-90% smaller than raw pixels
- **JPEG Quality**: 85% quality balances size vs. fidelity
- **Memory Usage**: ~50-100MB during capture (released immediately)
- **Frequency**: Configurable (typically 1-5 seconds)

## Logging

### Serilog Configuration

```csharp
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.File(
        path: Path.Combine(Path.GetTempPath(), "vorsight", "logs", "agent-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();
```

### Log Location

- **Path**: `%TEMP%\vorsight\logs\agent-*.log`
- **Retention**: 7 days
- **Rotation**: Daily
- **Level**: Debug (all events logged)

### Log Examples

**Console Output** (real-time):
```
[INF] Vörsight Agent starting...
[INF] Agent running in session 1
[INF] Connecting to IPC server on pipe: VorsightIPC
[INF] Connected to IPC server
[DBG] Message received: CaptureScreenshot (size: 1024)
[INF] Screenshot captured: 1920x1080, 124 KB, SHA256: abc123...
[INF] Screenshot sent: 262144 bytes
[INF] Vörsight Agent terminated
```

**File Output** (diagnostic logs in `%TEMP%\vorsight\logs\`):
```
2025-12-18 14:23:45.123 +00:00 [INF] Vörsight Agent starting...
2025-12-18 14:23:45.456 +00:00 [INF] Agent running in session 1
2025-12-18 14:23:46.789 +00:00 [INF] Connecting to IPC server on pipe: VorsightIPC
2025-12-18 14:23:47.012 +00:00 [INF] Connected to IPC server
2025-12-18 14:23:48.345 +00:00 [DBG] Message received: CaptureScreenshot (size: 1024)
2025-12-18 14:23:48.567 +00:00 [INF] Screenshot captured: 1920x1080, 124 KB, SHA256: abc123...
```

## Deployment

### Build Configuration

The Agent is built as a self-contained executable:

```powershell
# Build for x64 Windows
cd src\Vorsight.Agent
dotnet build -c Release -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

### Output

```
bin/Release/net10.0/win-x64/wuapihost.exe
```

### Filename Strategy

The executable is intentionally named `wuapihost.exe` to blend in with legitimate Windows Update Agent processes. This helps avoid user suspicion and provides some operational security benefit.

### Installation

The Service automatically launches the Agent using `CreateProcessAsUser`:

```csharp
ProcessInterop.CreateProcessAsUser(
    childProcessHandle: userToken,
    applicationName: "C:\\Windows\\wuapihost.exe",  // System path
    commandLine: $"wuapihost.exe",
    currentDirectory: null,
    sessionId: 1
);
```

## Error Handling

### IPC Connection Failures

```csharp
try
{
    await pipeClient.ConnectAsync(5*1000);
}
catch (TimeoutException)
{
    Log.Error("Failed to connect to IPC server within timeout period");
    Environment.Exit(1);
}
catch (IOException ex)
{
    Log.Error(ex, "IPC connection error");
    // Retry with exponential backoff
}
```

### Screenshot Capture Failures

```csharp
try
{
    var screenshot = await screenshotService.CaptureScreenAsync();
}
catch (InvalidOperationException ex)
{
    Log.Warning(ex, "Screenshot capture unavailable (locked screen?)");
    // Send error status to Service
}
catch (Exception ex)
{
    Log.Error(ex, "Unexpected screenshot error");
    // Continue operation, will retry on next interval
}
```

### Graceful Shutdown

```csharp
// Service sends SHUTDOWN command
// Agent catches it and:
// 1. Closes IPC connection
// 2. Disposes screenshot service
// 3. Calls Environment.Exit(0)
```

## Troubleshooting

### Agent Won't Start

1. Verify IPC pipe name matches Service (`VorsightIPC`)
2. Check user session is active (Session 1)
3. Review Agent logs in `%TEMP%\vorsight\logs\`
4. Ensure Service is running and IPC server is listening

### Screenshots Not Captured

1. Check log for screenshot errors
2. Verify GDI+ is accessible in user session
3. Test manual screenshot with Print Screen
4. Check display driver compatibility

### IPC Connection Drops

1. Verify Service IPC server is still running
2. Check Windows event log for pipe errors
3. Review firewall rules for named pipes
4. Monitor memory usage (may indicate resource exhaustion)

### High Memory Usage

1. Check screenshot resolution and compression
2. Monitor capture interval (too frequent?)
3. Verify image disposal is happening
4. Consider JPEG over PNG for larger captures

## Performance Optimization

### Capture Frequency

- **Fast refresh**: 1-2 seconds for real-time monitoring
- **Balanced**: 5-10 seconds for normal monitoring
- **Low-bandwidth**: 30+ seconds for remote connections

### Compression Settings

- **PNG**: Best compression, slower encoding, better quality
- **JPEG**: Smaller size, faster encoding, quality loss

### Resolution Handling

```csharp
// Auto-detection
var screen = Screen.PrimaryScreen;
int width = screen.Bounds.Width;
int height = screen.Bounds.Height;

// Optional: Downscaling for bandwidth
if (totalPixels > 2000000)  // > 1920x1080
{
    width = (int)(width * 0.75);
    height = (int)(height * 0.75);
}
```

## Related Documentation

- [IPC Protocol Specification](../features/IPC_PROTOCOL.md)
- [Screenshot Capture System](../features/SCREENSHOT_CAPTURE.md)
- [Vorsight.Native API](./VORSIGHT_NATIVE.md)
- [Installation Guide](../INSTALLATION.md)

