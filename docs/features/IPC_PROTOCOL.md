# IPC Protocol Specification

## Overview

The Inter-Process Communication (IPC) protocol enables secure, bidirectional communication between the Vörsight Service (running as LocalSystem) and the Vörsight Agent (running in user session). The protocol uses Windows Named Pipes for local-machine-only communication with no network exposure.

## Connection Architecture

### Named Pipe Name

```
\\.\pipe\VorsightIPC
```

**Properties**:
- **Type**: Duplex (bidirectional)
- **Scope**: Local machine only (cannot be accessed remotely)
- **Security**: Named pipe ACLs (inherited from Service process)
- **Buffer Size**: 65536 bytes (configurable)
- **Instances**: 10 concurrent clients (configurable)

### Connection Sequence

```
1. Service startup
   ↓
   NamedPipeServer.StartAsync()
   ↓
   CreateNamedPipe(\\.\pipe\VorsightIPC)
   ↓
   Listen for connections
   
2. Agent startup
   ↓
   NamedPipeClientStream(".", "VorsightIPC", PipeDirection.InOut)
   ↓
   await pipeClient.ConnectAsync(5000)  // 5-second timeout
   ↓
   Send SessionId registration: [int32 sessionId]
   ↓
   Wait for command messages
```

## Message Protocol

### Frame Structure

All messages follow a consistent frame format:

```
┌────────────────────────────────────────────────────────┐
│ HEADER (5 bytes)                                       │
├─────────────────┬─────────────────────────────────────┤
│ Message Type    │ Payload Size                        │
│ (1 byte)        │ (4 bytes, big-endian uint32)        │
├────────────────────────────────────────────────────────┤
│ PAYLOAD (variable, 0 to 16MB)                         │
├────────────────────────────────────────────────────────┤
```

### Serialization

```csharp
public class PipeMessage
{
    public byte MessageType { get; set; }
    public int PayloadSize { get; set; }
    public byte[] Payload { get; set; }

    public byte[] Serialize()
    {
        var buffer = new byte[5 + PayloadSize];
        buffer[0] = MessageType;
        Buffer.BlockCopy(
            BitConverter.GetBytes(PayloadSize), 0,
            buffer, 1, 4);
        if (PayloadSize > 0)
            Buffer.BlockCopy(Payload, 0, buffer, 5, PayloadSize);
        return buffer;
    }

    public static PipeMessage Deserialize(byte[] data)
    {
        var message = new PipeMessage
        {
            MessageType = data[0],
            PayloadSize = BitConverter.ToInt32(data, 1)
        };

        if (message.PayloadSize > 0)
        {
            message.Payload = new byte[message.PayloadSize];
            Buffer.BlockCopy(data, 5, message.Payload, 0, message.PayloadSize);
        }

        return message;
    }
}
```

## Message Types

### 0x00 - Reserved

**Not used. Reserved for future protocol extensions.**

### 0x01 - Screenshot Request

**Direction**: Service → Agent

**Purpose**: Request screenshot capture

**Payload Format**:
```
┌─────────────────────────────────┐
│ Interval (uint32)               │  // Capture interval in ms
├─────────────────────────────────┤
│ Quality (byte)                  │  // 0=PNG, 1=JPEG(85%), 2=JPEG(95%)
├─────────────────────────────────┤
│ Flags (byte)                    │  // Bit 0: Include metadata
└─────────────────────────────────┘
```

**Example**:
```csharp
var payload = new byte[6];
BitConverter.GetBytes(5000).CopyTo(payload, 0);  // 5-second interval
payload[4] = 0;  // PNG quality
payload[5] = 1;  // Include metadata
```

**Response Expected**: 0x81 (Screenshot Response)

### 0x02 - Heartbeat

**Direction**: Bidirectional

**Purpose**: Keep-alive signal, verify connection health

**Payload Format**: Empty (0 bytes)

**Response**: Echo back 0x02

**Timing**:
- Service sends every 30 seconds
- Agent responds within 5 seconds
- Timeout → connection considered dead

### 0x03 - Activity Report

**Direction**: Agent → Service

**Purpose**: Report user activity metrics

**Payload Format**:
```
┌─────────────────────────────────┐
│ Session ID (uint32)             │
├─────────────────────────────────┤
│ Timestamp (int64)               │  // Unix ms timestamp
├─────────────────────────────────┤
│ Active Applications (uint16)     │  // Count
├─────────────────────────────────┤
│ Key Presses (uint32)            │  // Since last report
├─────────────────────────────────┤
│ Mouse Clicks (uint32)           │  // Since last report
├─────────────────────────────────┤
│ Network Activity (uint64)       │  // Bytes transferred
└─────────────────────────────────┘
```

### 0x04 - Configuration Update

**Direction**: Service → Agent

**Purpose**: Update agent configuration

**Payload Format**:
```
┌─────────────────────────────────┐
│ Config Type (byte)              │  // 0=screenshot, 1=monitoring
├─────────────────────────────────┤
│ Config Data (JSON, variable)    │
└─────────────────────────────────┘
```

**Example JSON**:
```json
{
  "captureInterval": 5000,
  "imageQuality": "png",
  "enableMonitoring": true,
  "monitoringLevel": "full"
}
```

### 0x81 - Screenshot Response

**Direction**: Agent → Service

**Purpose**: Send captured screenshot

**Payload Format**:
```
┌─────────────────────────────────┐
│ Image Size (uint32)             │  // Bytes
├─────────────────────────────────┤
│ Image Data (variable)           │  // PNG/JPEG binary
├─────────────────────────────────┤
│ Metadata Size (uint32)          │  // 0 if no metadata
├─────────────────────────────────┤
│ Metadata JSON (variable)        │
└─────────────────────────────────┘
```

**Metadata JSON**:
```json
{
  "timestamp": 1734592725000,
  "width": 1920,
  "height": 1080,
  "format": "png",
  "compressionLevel": 6,
  "imageHash": "sha256:abc123...",
  "sessionId": 1,
  "fileSizeBytes": 123456
}
```

### 0x82 - Error Response

**Direction**: Agent → Service

**Purpose**: Report error condition

**Payload Format**:
```
┌─────────────────────────────────┐
│ Error Code (uint32)             │  // Custom error code
├─────────────────────────────────┤
│ Error Message (string, variable)│  // UTF-8 null-terminated
└─────────────────────────────────┘
```

**Common Error Codes**:
- `0x00000001` - Screenshot capture failed
- `0x00000002` - Display locked
- `0x00000003` - Memory allocation failed
- `0x00000004` - Invalid configuration
- `0xFFFFFFFF` - Generic error

### 0xFF - Shutdown

**Direction**: Service → Agent

**Purpose**: Gracefully terminate agent

**Payload Format**: Empty (0 bytes)

**Agent Response**: Agent exits with code 0 within 5 seconds

## Message Flow Sequences

### Typical Screenshot Capture

```
Service                          Agent
   |                              |
   |-------- 0x01 (Request) ----->|
   |                          Capture
   |                         Screenshot
   |<------ 0x81 (Response) ------|
   |<---- Screenshot Binary ------|
Process
   |
```

### Connection Heartbeat

```
Service                          Agent
   |                              |
   |-------- 0x02 (Heartbeat)---->|
   |                              |
   |<------- 0x02 (Echo) ---------|
   |                              |
   | [30 seconds later...]        |
   |                              |
   |-------- 0x02 (Heartbeat)---->|
   |                              |
   |<------- 0x02 (Echo) ---------|
```

### Configuration Update

```
Service                          Agent
   |                              |
   |------ 0x04 (Config) -------->|
   |<------ 0x02 (ACK) -----------|
Agent applies new configuration
```

### Error Recovery

```
Service                          Agent
   |                              |
   |-------- 0x01 (Request) ----->|
   |                          Error!
   |<------ 0x82 (Error) ---------|
   | "Screenshot capture failed"  |
   |                              |
   | [Retry logic...]             |
   |-------- 0x01 (Request) ----->|
   |<------ 0x81 (Response) ------|
```

## Session Registration

### Initial Connection

When Agent connects, it must register its session ID:

```csharp
// Agent side
await using (var bw = new BinaryWriter(pipeClient, Encoding.UTF8, leaveOpen: true))
{
    bw.Write(sessionId);  // uint32
    bw.Flush();
}

// Service side
await using (var br = new BinaryReader(pipeStream, Encoding.UTF8, leaveOpen: true))
{
    uint sessionId = br.ReadUInt32();
    RegisterClient(sessionId);
}
```

**Registration Tracking**:
```csharp
private Dictionary<uint, NamedPipeServerStream> _clientSessions = new();

private void RegisterClient(uint sessionId, NamedPipeServerStream stream)
{
    _clientSessions[sessionId] = stream;
    _logger.LogInformation("Client registered: Session {SessionId}", sessionId);
}
```

## Buffer Management

### Read Buffer

```csharp
private const int MaxBufferSize = 65536;  // 64 KB
private byte[] _readBuffer = new byte[MaxBufferSize];

public async Task<PipeMessage> ReadMessageAsync(NamedPipeServerStream stream)
{
    // Read header (5 bytes)
    int headerRead = 0;
    while (headerRead < 5)
    {
        headerRead += await stream.ReadAsync(_readBuffer, headerRead, 5 - headerRead);
    }

    byte messageType = _readBuffer[0];
    int payloadSize = BitConverter.ToInt32(_readBuffer, 1);

    if (payloadSize > MaxBufferSize - 5)
        throw new InvalidOperationException("Payload too large");

    // Read payload
    int payloadRead = 0;
    while (payloadRead < payloadSize)
    {
        payloadRead += await stream.ReadAsync(
            _readBuffer, 5 + payloadRead, payloadSize - payloadRead);
    }

    // Parse message
    var payload = new byte[payloadSize];
    Buffer.BlockCopy(_readBuffer, 5, payload, 0, payloadSize);

    return new PipeMessage
    {
        MessageType = messageType,
        PayloadSize = payloadSize,
        Payload = payload
    };
}
```

## Timeout & Retry Logic

### Connection Timeout (Agent Side)

```csharp
var pipeClient = new NamedPipeClientStream(".", "VorsightIPC", PipeDirection.InOut);

try
{
    await pipeClient.ConnectAsync(5000);  // 5-second timeout
}
catch (TimeoutException)
{
    _logger.LogError("Failed to connect to IPC server");
    
    // Retry with exponential backoff
    int retries = 0;
    int maxRetries = 5;
    while (retries < maxRetries)
    {
        await Task.Delay(1000 * (int)Math.Pow(2, retries));
        try
        {
            await pipeClient.ConnectAsync(5000);
            break;
        }
        catch
        {
            retries++;
        }
    }
}
```

### Message Timeout

```csharp
private async Task<PipeMessage> ReadMessageWithTimeoutAsync(
    Stream stream, TimeSpan timeout)
{
    var cts = new CancellationTokenSource(timeout);
    
    try
    {
        return await ReadMessageAsync(stream, cts.Token);
    }
    catch (OperationCanceledException)
    {
        _logger.LogWarning("Message read timeout after {Timeout}ms", timeout.TotalMilliseconds);
        throw;
    }
}
```

## Performance Characteristics

| Aspect | Value | Notes |
|--------|-------|-------|
| Max payload size | 16 MB | Configurable |
| Typical screenshot | 100-500 KB | Compressed |
| Header overhead | 5 bytes | Per message |
| Connection latency | 10-50 ms | Named pipe overhead |
| Throughput | 100+ MB/s | Theoretical |
| Buffer size | 64 KB | Per-instance |

## Security Considerations

### Named Pipe ACLs

```csharp
var pipeSecurity = new PipeSecurity();
pipeSecurity.AddAccessRule(new PipeAccessRule(
    new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null),
    PipeAccessRights.FullControl,
    AccessControlType.Allow));

pipeSecurity.AddAccessRule(new PipeAccessRule(
    new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null),
    PipeAccessRights.ReadWrite,
    AccessControlType.Allow));
```

### Data Encryption

Messages are transmitted in plaintext over named pipes (encrypted by OS). For highly sensitive data, add application-level encryption:

```csharp
// Future enhancement
public byte[] EncryptPayload(byte[] payload, string encryptionKey)
{
    using (var aes = Aes.Create())
    {
        aes.Key = Convert.FromBase64String(encryptionKey);
        using (var encryptor = aes.CreateEncryptor())
        {
            return encryptor.TransformFinalBlock(payload, 0, payload.Length);
        }
    }
}
```

### Message Validation

```csharp
public bool ValidateMessage(PipeMessage message)
{
    // Type check
    if (!IsValidMessageType(message.MessageType))
        return false;

    // Size check
    if (message.PayloadSize > MaxPayloadSize)
        return false;

    // Payload integrity (if applicable)
    if (message.MessageType == MessageTypes.ScreenshotResponse)
    {
        // Verify image hash
        var imageHash = ComputeSHA256(message.Payload);
        var metadataHash = ExtractHashFromMetadata(message.Payload);
        if (imageHash != metadataHash)
            return false;
    }

    return true;
}
```

## Diagnostics & Monitoring

### Protocol Logging

```csharp
private void LogMessage(PipeMessage message, string direction)
{
    _logger.LogDebug(
        "{Direction} Message: Type=0x{Type:X2}, Size={Size} bytes",
        direction, message.MessageType, message.PayloadSize);

    if (message.MessageType == 0x01)
        _logger.LogDebug("Screenshot request for interval {Interval}ms",
            BitConverter.ToInt32(message.Payload, 0));
}
```

### Connection Monitoring

```csharp
public class IPCMetrics
{
    public int ActiveConnections { get; set; }
    public long MessagesReceived { get; set; }
    public long MessagesSent { get; set; }
    public long BytesReceived { get; set; }
    public long BytesSent { get; set; }
    public TimeSpan AverageLatency { get; set; }
}
```

## Related Documentation

- [Vorsight.Core IPC Module](../components/VORSIGHT_CORE.md#2-ipc-system-ipc)
- [Vorsight.Service](../components/VORSIGHT_SERVICE.md)
- [Vorsight.Agent](../components/VORSIGHT_AGENT.md)

