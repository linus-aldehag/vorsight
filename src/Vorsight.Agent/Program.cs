using Serilog;
using System.IO.Pipes;
using Microsoft.Extensions.Logging;
using Vorsight.Core.IPC;
using Vorsight.Core.Screenshots;
using Vorsight.Agent;

// Configure Serilog for the Agent
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.File(
        path: Path.Combine(Path.GetTempPath(), "vorsight", "logs", "agent-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("Vörsight Agent starting...");
    
    // Get session ID from environment or current process
    var sessionId = GetSessionId();
    Log.Information("Agent running in session {SessionId}", sessionId);

    // Create screenshot service
    var logger = new ConsoleLogger<IScreenshotService>();
    var screenshotService = new ScreenshotService(logger);

    // Connect to IPC server
    var pipeName = $"VorsightIPC";
    await using (var pipeClient = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut))
    {
        try
        {
            Log.Information("Connecting to IPC server on pipe: {PipeName}", pipeName);
            await pipeClient.ConnectAsync(5*1000); // 5 second timeout
            
            // Send session ID to server
            await using (var bw = new BinaryWriter(pipeClient, System.Text.Encoding.UTF8, leaveOpen: true))
            {
                bw.Write(sessionId);
                bw.Flush();
            }

            Log.Information("Connected to IPC server");

            // Message loop
            var buffer = new byte[65536];
            while (true)
            {
                try
                {
                    // Read incoming message
                    var bytesRead = await pipeClient.ReadAsync(buffer, 0, buffer.Length);
                    
                    if (bytesRead == 0)
                    {
                        Log.Information("Server disconnected");
                        break;
                    }

                    // Deserialize message
                    var message = PipeMessage.Deserialize(buffer, bytesRead);
                    Log.Debug("Received message: {MessageType}", message.Type);

                    switch (message.Type)
                    {
                        case PipeMessage.MessageType.ScreenshotRequest:
                            await HandleScreenshotRequest(pipeClient, screenshotService, sessionId);
                            break;

                        case PipeMessage.MessageType.PingRequest:
                            await HandlePingRequest(pipeClient, sessionId);
                            break;

                        case PipeMessage.MessageType.ShutdownCommand:
                            Log.Information("Shutdown command received");
                            return;

                        default:
                            Log.Warning("Unknown message type: {MessageType}", message.Type);
                            break;
                    }
                }
                catch (OperationCanceledException)
                {
                    Log.Information("Agent operation cancelled");
                    break;
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "Error in message loop");
                }
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to connect to IPC server");
        }
    }

    Log.Information("Vörsight Agent terminated");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Vörsight Agent failed");
}
finally
{
    Log.CloseAndFlush();
}

static uint GetSessionId()
{
    // Try to get from environment variable first
    if (uint.TryParse(Environment.GetEnvironmentVariable("SESSIONID"), out var sessionId))
    {
        return sessionId;
    }

    // Fallback: use current process session
    return Vorsight.Native.ShutdownInterop.ProcessIdToSessionId((uint)Environment.ProcessId, out sessionId) ? sessionId : (uint)
        // Default to 1 (interactive session)
        1;
}

async Task HandleScreenshotRequest(NamedPipeClientStream pipe, IScreenshotService screenshotService, uint sessionId)
{
    try
    {
        Log.Debug("Capturing screenshot for session {SessionId}", sessionId);
        
        var screenshotData = await screenshotService.CaptureScreenAsync();
        
        if (screenshotData != null)
        {
            var response = new PipeMessage(PipeMessage.MessageType.Screenshot, sessionId)
            {
                Payload = screenshotData
            };

            var serialized = response.Serialize();
            await pipe.WriteAsync(serialized, 0, serialized.Length);
            await pipe.FlushAsync();

            Log.Information("Screenshot sent: {SizeBytes} bytes", screenshotData.Length);
        }
        else
        {
            Log.Warning("Screenshot capture returned null");
        }
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error handling screenshot request");
    }
}

async Task HandlePingRequest(NamedPipeClientStream pipe, uint sessionId)
{
    try
    {
        var response = new PipeMessage(PipeMessage.MessageType.PingResponse, sessionId)
        {
            Metadata = $"{{\"timestamp\": \"{DateTime.UtcNow:O}\"}}"
        };

        var serialized = response.Serialize();
        await pipe.WriteAsync(serialized, 0, serialized.Length);
        await pipe.FlushAsync();

        Log.Debug("Ping response sent");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error handling ping request");
    }
}

/// <summary>
/// Simple console logger for Agent
/// </summary>
class ConsoleLogger<T> : ILogger<T>
{
    private readonly NullDisposable _nullDisposable = new();

    public IDisposable? BeginScope<TState>(TState state) => _nullDisposable;
    
    public bool IsEnabled(LogLevel logLevel) => true;
    
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        var message = formatter(state, exception);
        Console.WriteLine($"[{logLevel}] {message}");
    }

    /// <summary>
    /// Null-safe disposable for BeginScope
    /// </summary>
    private class NullDisposable : IDisposable
    {
        public void Dispose() { }
    }
}
