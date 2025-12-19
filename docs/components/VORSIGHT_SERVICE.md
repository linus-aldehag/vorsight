﻿# Vörsight Service (Vorsight.Service)

## Overview

The Vörsight Service is the core Windows Service component that runs with **LocalSystem** privileges. It serves as the "brain" of the system, orchestrating all management and monitoring operations.

## Key Responsibilities

1. **Windows Service Host** - Runs as a background service with maximum privileges
2. **Web Server** - Hosts a Kestrel web server for API and frontend access
3. **IPC Server** - Manages Named Pipes communication with client agents
4. **Schedule Enforcement** - Applies time-based access restrictions
5. **Audit Monitoring** - Monitors Windows Event Logs for security events
6. **Agent Management** - Launches and manages Agent processes in user sessions

## Architecture

### Service Startup Flow

```
Program.cs (Main Entry Point)
    ↓
Serilog Configuration (Logging)
    ↓
Host Builder Setup
    ↓
Dependency Injection Configuration
    ├─ INamedPipeServer (IPC communication)
    ├─ IScheduleManager (Access enforcement)
    ├─ IAuditManager (Security monitoring)
    └─ Worker (Orchestration)
    ↓
Worker.cs (ExecuteAsync)
    ├─ Initialize components
    ├─ Start IPC server
    ├─ Hook up event handlers
    ├─ Start schedule enforcement
    ├─ Start audit monitoring
    └─ Health checks (Every 30s)
```

### Message Reception Flow

```
Agent Connects
    ↓
OnSessionConnected event
    └─ Log: [INF] Agent session connected
    ↓
Agent Sends Message (0x81, 0x03, or 0x02)
    ↓
OnMessageReceived event
    ├─ Log: [INF] Agent message received: Type=X, Size=Y
    └─ Route by message type:
        ├─ Screenshot (0x81)
        │  └─ HandleScreenshotMessage()
        │     └─ Log: [INF] Screenshot received: {size} bytes
        ├─ Activity/AuditLog (0x03)
        │  └─ HandleAuditLog()
        │     └─ Log: [INF] Audit log received: {size} bytes
        └─ Ping/Heartbeat (0x02)
           └─ HandlePingResponse()
              └─ Log: [DBG] Heartbeat response received
    ↓
Agent Disconnects
    ↓
OnSessionDisconnected event
    └─ Log: [INF] Agent session disconnected
```

### Core Services

#### INamedPipeServer (IPC)
- **Purpose**: Bi-directional communication with Agent
- **Location**: `Core/IPC/`
- **Key Features**:
  - Named pipe named `VorsightIPC`
  - Binary message protocol
  - Screenshot data transmission
  - Command distribution

#### ScheduleManager
- **Purpose**: Manages access schedules and enforces restrictions
- **Location**: `Core/Scheduling/`
- **Key Features**:
  - Time-based access policies
  - Session termination via `ExitWindowsEx`
  - Force logoff enforcement
  - Re-login prevention

#### AuditManager
- **Purpose**: Windows Event Log monitoring
- **Location**: `Core/Audit/`
- **Key Features**:
  - Security event filtering
  - Critical event detection
  - Tamper attempt identification
  - Event ID monitoring (4720, 4728, 4672, etc.)

#### Worker Service
- **Purpose**: Main service loop and orchestration
- **Location**: `Worker.cs`
- **Key Features**:
  - 30-second health check interval
  - Component initialization
  - Graceful shutdown handling
  - Continuous monitoring

## Configuration

### Application Settings

**File**: `appsettings.json` / `appsettings.Development.json`

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://localhost:5443",
        "Certificate": {
          "Path": "path/to/cert.pfx"
        }
      }
    }
  }
}
```

### Environment Variables

- `VORSIGHT_LOG_PATH` - Log file directory (default: `bin/logs/`)
- `VORSIGHT_IPC_PIPE` - Named pipe name (default: `VorsightIPC`)
- `VORSIGHT_PORT` - Web server port (default: 9443 prod, 5443 dev)
- `ASPNETCORE_ENVIRONMENT` - Environment (Development/Production)

## Logging

### Serilog Configuration

The service uses Serilog for structured logging with:
- **File output**: Rolling daily logs with 30-day retention
- **Console output**: Real-time log streaming in debug mode
- **Minimum level**: Debug (configurable)
- **Format**: Timestamp, Level, Source Context, Message, Exception details

### Log Locations

- **Debug**: `bin/Debug/logs/vorsight-service-*.log`
- **Release**: `bin/Release/logs/vorsight-service-*.log`
- **Custom**: Via environment variable `VORSIGHT_LOG_PATH`

### Log Examples

## Message Handlers

The Service receives and processes messages from connected Agent instances via IPC. All message reception is logged.

### Handler: OnMessageReceived

Called when any message arrives from an Agent.

```csharp
private void OnMessageReceived(object sender, PipeMessageReceivedEventArgs e)
{
    // Logs: [INF] Agent message received from session X: Type=Y, Size=Z bytes
    // Routes to handler based on message type
}
```

**Logging Output:**
```
[INF] Agent message received from session 1: Type=Screenshot, Size=262144 bytes
[INF] Screenshot received from session 1: 262144 bytes, ID=12345678-1234-1234-1234-123456789012
```

### Handler: HandleScreenshotMessage

Processes screenshot data from Agent.

```csharp
private void HandleScreenshotMessage(uint sessionId, PipeMessage message)
{
    // Logs: [INF] Screenshot received from session X: {SizeBytes} bytes, ID={MessageId}
    // TODO: Store screenshot to database or file system
}
```

**Typical Usage:**
- Called when Agent sends message type 0x81 (Screenshot)
- Logs size and message ID for audit trail
- Ready for screenshot storage/processing implementation

### Handler: HandlePingResponse

Processes heartbeat/ping responses from Agent.

```csharp
private void HandlePingResponse(uint sessionId, PipeMessage message)
{
    // Logs: [DBG] Heartbeat response from session X: ID={MessageId}, Time={CreatedUtc}
    // TODO: Update session last-seen timestamp for monitoring
}
```

**Typical Usage:**
- Called when Agent sends message type 0x02 (Ping)
- Used to verify Agent is alive and responsive
- Updates session health status

### Handler: HandleAuditLog

Processes activity/audit log entries from Agent.

```csharp
private void HandleAuditLog(uint sessionId, PipeMessage message)
{
    // Logs: [INF] Audit log from session X: {SizeBytes} bytes, ID={MessageId}
    // TODO: Parse and store audit events
}
```

**Typical Usage:**
- Called when Agent sends message type 0x03 (Activity/Audit)
- Contains JSON payload with activity metrics
- Ready for event parsing and storage implementation

### Handler: OnSessionConnected

Called when an Agent connects to the IPC pipe.

```csharp
private void OnSessionConnected(object sender, SessionConnectedEventArgs e)
{
    // Logs: [INF] Agent session connected: SessionId=X, User=Y
}
```

**Logging Output:**
```
[INF] Agent session connected: SessionId=1, User=(unknown)
```

### Handler: OnSessionDisconnected

Called when an Agent disconnects from the IPC pipe.

```csharp
private void OnSessionDisconnected(object sender, SessionDisconnectedEventArgs e)
{
    // Logs: [INF] Agent session disconnected: SessionId=X, Reason=Y
}
```

**Logging Output:**
```
[INF] Agent session disconnected: SessionId=1, Reason=normal
```

## API Endpoints

### Authentication

All API endpoints require PSK (Pre-Shared Key) header authentication:

```
Authorization: PSK {shared-secret}
```

### Core Endpoints

#### Health Check
```
GET /api/health
Response: { "status": "healthy", "uptime": "01:23:45", "activeAgents": 2 }
```

#### Schedule Management
```
GET    /api/schedules
POST   /api/schedules
PUT    /api/schedules/{id}
DELETE /api/schedules/{id}
```

#### Audit Events
```
GET /api/audit/events
GET /api/audit/events/{id}
GET /api/audit/events?filter=critical
```

## Deployment

### Installation as Windows Service

```powershell
# Build the service
cd src\Vorsight.Service
dotnet build -c Release

# Install as service
sc.exe create Vorsight binPath= "C:\vorsight\Vorsight.Service.exe"

# Or using PowerShell
New-Service -Name "Vorsight" -BinaryPathName "C:\vorsight\Vorsight.Service.exe" -StartupType Automatic
```

### Running in Console Mode (Development)

```powershell
cd src\Vorsight.Service
dotnet run --configuration Debug
```

### Service Management

```powershell
# Start service
Start-Service -Name Vorsight

# Stop service
Stop-Service -Name Vorsight

# Query status
Get-Service -Name Vorsight

# View recent logs
Get-EventLog -LogName Application -Source Vorsight -Newest 50
```

## Troubleshooting

### Service Won't Start

1. Check Windows Event Viewer for errors
2. Verify LocalSystem permissions
3. Check log files in `bin/logs/`
4. Ensure port 9443 (or 5443 dev) is not in use

### IPC Connection Issues

1. Verify Named Pipe named `VorsightIPC` is accessible
2. Check Agent process is running in user session
3. Review IPC logs for connection timeouts
4. Ensure firewall allows IPC communication

### Audit Events Not Detected

1. Verify Windows Event Log permissions
2. Check audit policies are enabled
3. Review AuditManager logs
4. Ensure Event Log subscriptions are active

## Performance Considerations

- **Health Check Interval**: 30 seconds (adjustable in Worker.cs)
- **IPC Buffer Size**: 65536 bytes (adjustable in ScreenshotPipeHandler.cs)
- **Log Retention**: 30 days (adjustable in Serilog config)
- **Concurrent Sessions**: Limited by IPC thread pool

## Security

- Runs as **LocalSystem** for privilege escalation
- PSK header authentication for API
- SSL/TLS for HTTPS endpoints
- No sensitive data logged to console
- Event Log monitoring for tampering

## Related Documentation

- [IPC Protocol Specification](../features/IPC_PROTOCOL.md)
- [Access Scheduling](../features/ACCESS_SCHEDULING.md)
- [Audit System](../features/AUDIT_SYSTEM.md)
- [Installation Guide](../INSTALLATION.md)

