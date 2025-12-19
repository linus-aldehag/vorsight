using Serilog;
using System.IO.Pipes;
using Vorsight.Core.Screenshots;
using Microsoft.Extensions.Logging;
using Vorsight.Agent;
using System.Text;
using System.Text.Json;
using Vorsight.Core.IPC;

// Configure Serilog for the Agent (one-shot execution model)
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    // Console output for debugging
    .WriteTo.Console(
        outputTemplate: "[{Level:u3}] {Message:lj}{NewLine}{Exception}")
    // File output for diagnostics
    .WriteTo.File(
        path: Path.Combine(Path.GetTempPath(), "vorsight", "logs", "agent-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("Vörsight Agent starting...");

    // Parse command-line arguments
    var commandLineArgs = Environment.GetCommandLineArgs();
    
    if (commandLineArgs.Length < 2)
    {
        Log.Error("Usage: wuapihost.exe <command> [options]");
        Log.Error("Commands:");
        Log.Error("  screenshot [--format png|jpeg] [--quality 0-100]");
        Log.Error("  activity [--interval seconds]");
        Log.Error("  ping");
        Environment.Exit(1);
    }

    var command = commandLineArgs[1].ToLowerInvariant();
    var sessionId = GetSessionId();

    Log.Debug("Command: {Command}, Session: {SessionId}", command, sessionId);

    // Connect to IPC server
    await ExecuteCommand(command, commandLineArgs, sessionId);

    Log.Information("Vörsight Agent completed successfully");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Vörsight Agent failed");
    Environment.Exit(1);
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
        Log.Debug("Session ID from environment: {SessionId}", sessionId);
        return sessionId;
    }

    // Fallback: use current process session
    if (Vorsight.Native.ShutdownInterop.ProcessIdToSessionId((uint)Environment.ProcessId, out sessionId))
    {
        Log.Debug("Session ID from process: {SessionId}", sessionId);
        return sessionId;
    }

    // Default to 1 (interactive session)
    Log.Debug("Using default session ID: 1");
    return 1;
}

async Task ExecuteCommand(string command, string[] args, uint sessionId)
{
    const string pipeName = "VorsightIPC";
    const int pipeTimeout = 5000; // 5 seconds
    const int maxRetries = 3;

    try
    {
        Log.Information("Connecting to IPC pipe: {PipeName}", pipeName);
        
        NamedPipeClientStream pipeClient = null;
        int attempt = 0;
        
        while (attempt < maxRetries && pipeClient == null)
        {
            attempt++;
            try
            {
                pipeClient = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut);
                await pipeClient.ConnectAsync(pipeTimeout);
                
                // Send session ID as first message to register
                await pipeClient.WriteAsync(BitConverter.GetBytes(sessionId));
                await pipeClient.FlushAsync();
                
                Log.Debug("Connected to IPC server on attempt {Attempt}", attempt);
            }
            catch (TimeoutException)
            {
                Log.Warning("Connection timeout on attempt {Attempt}/{MaxRetries}", attempt, maxRetries);
                pipeClient?.Dispose();
                pipeClient = null;
                
                if (attempt < maxRetries)
                {
                    int backoffMs = 500 * attempt; // 500ms, 1000ms, 1500ms
                    Log.Debug("Waiting {BackoffMs}ms before retry", backoffMs);
                    await Task.Delay(backoffMs);
                }
                else
                {
                    throw;
                }
            }
            catch (FileNotFoundException)
            {
                Log.Warning("Pipe not found on attempt {Attempt}/{MaxRetries}", attempt, maxRetries);
                pipeClient?.Dispose();
                pipeClient = null;
                
                if (attempt < maxRetries)
                {
                    int backoffMs = 500 * attempt;
                    Log.Debug("Waiting {BackoffMs}ms before retry", backoffMs);
                    await Task.Delay(backoffMs);
                }
                else
                {
                    throw;
                }
            }
        }

        if (pipeClient == null)
        {
            throw new InvalidOperationException("Failed to connect to IPC pipe after all retries");
        }

        await using (pipeClient)
        {
            Log.Debug("Connected to IPC server");

            switch (command)
            {
                case "screenshot":
                    await ExecuteScreenshot(pipeClient, args, sessionId);
                    break;

                case "activity":
                    await ExecuteActivity(pipeClient, args, sessionId);
                    break;

                case "ping":
                    await ExecutePing(pipeClient, sessionId);
                    break;

                default:
                    Log.Error("Unknown command: {Command}", command);
                    Environment.Exit(1);
                    break;
            }
        }
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to execute command: {Command}", command);
        throw;
    }
}

async Task ExecuteScreenshot(NamedPipeClientStream pipe, string[] args, uint sessionId)
{
    try
    {
        Log.Information("Executing screenshot command");

        // Parse options
        var format = "png";
        var quality = 100;

        for (int i = 2; i < args.Length; i++)
        {
            if (args[i] == "--format" && i + 1 < args.Length)
                format = args[++i].ToLowerInvariant();
            else if (args[i] == "--quality" && i + 1 < args.Length)
                int.TryParse(args[++i], out quality);
        }

        Log.Debug("Screenshot options: Format={Format}, Quality={Quality}", format, quality);

        // Capture screenshot
        var logger = new SimpleLogger();
        var screenshotService = new ScreenshotService(logger);
        
        Log.Debug("Capturing screenshot...");
        var screenshotData = await screenshotService.CaptureScreenAsync();

        if (screenshotData == null || screenshotData.Length == 0)
        {
            Log.Error("Screenshot capture failed: null or empty data");
            Environment.Exit(1);
        }

        Log.Information("Screenshot captured: {SizeBytes} bytes", screenshotData.Length);

        // Send through IPC
        await SendScreenshotThroughIpc(pipe, screenshotData, sessionId);

        Log.Information("Screenshot sent successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Screenshot command failed");
        throw;
    }
}

async Task ExecuteActivity(NamedPipeClientStream pipe, string[] args, uint sessionId)
{
    try
    {
        Log.Information("Executing activity command");

        // Parse options
        var interval = 5;

        for (int i = 2; i < args.Length; i++)
        {
            if (args[i] == "--interval" && i + 1 < args.Length)
                int.TryParse(args[++i], out interval);
        }

        Log.Debug("Activity options: Interval={Interval}s", interval);

        // Gather activity data
        var activityData = new
        {
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            sessionId = sessionId,
            activeApplications = 0,
            keyPresses = 0,
            mouseClicks = 0,
            networkActivity = 0L
        };

        var json = JsonSerializer.Serialize(activityData);
        var payload = Encoding.UTF8.GetBytes(json);

        Log.Information("Activity data: {Json}", json);

        // Send through IPC
        await SendActivityThroughIpc(pipe, payload, sessionId);

        Log.Information("Activity data sent successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Activity command failed");
        throw;
    }
}

async Task ExecutePing(NamedPipeClientStream pipe, uint sessionId)
{
    try
    {
        Log.Information("Executing ping command");

        var pong = new
        {
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            sessionId = sessionId,
            status = "alive"
        };

        var json = JsonSerializer.Serialize(pong);
        var payload = Encoding.UTF8.GetBytes(json);

        Log.Debug("Ping response: {Json}", json);

        // Send through IPC
        await SendPingThroughIpc(pipe, payload, sessionId);

        Log.Information("Ping response sent successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Ping command failed");
        throw;
    }
}

async Task SendScreenshotThroughIpc(NamedPipeClientStream pipe, byte[] screenshotData, uint sessionId)
{
    try
    {
        var pipeMessage = new PipeMessage(PipeMessage.MessageType.Screenshot, sessionId)
        {
            Payload = screenshotData
        };

        var data = pipeMessage.Serialize();

        Log.Debug("Sending {SizeBytes} bytes through IPC", data.Length);
        
        await pipe.WriteAsync(data, 0, data.Length);
        await pipe.FlushAsync();

        Log.Debug("IPC send complete");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to send screenshot through IPC");
        throw;
    }
}

async Task SendActivityThroughIpc(NamedPipeClientStream pipe, byte[] payload, uint sessionId)
{
    try
    {
        var pipeMessage = new PipeMessage(PipeMessage.MessageType.AuditLog, sessionId) // Activity maps to AuditLog for now? Or should be added? Service checks specific types.
        {
             // NOTE: The previous code sent type 0x03. The Server expects MessageType enum.
             // Looking at PipeMessage.cs:
             // Screenshot = 1,
             // ScreenshotRequest = 2,
             // ShutdownCommand = 3,
             // PingRequest = 4,
             // PingResponse = 5,
             // ConfigurationUpdate = 6,
             // AuditLog = 7
             //
             // The old code "Activity Report" 0x03 conflicts with ShutdownCommand. 
             // Assuming Activity matches "AuditLog" (7) based on context or we need to add a type.
             // For now, let's map it to AuditLog as that seems most appropriate for "Activity".
             // Wait, let's double check what the service handles.
            Type = PipeMessage.MessageType.AuditLog, 
            Payload = payload
        };
        
        // Actually, let's check what the service handles in OnMessageReceived
        // It handles: Screenshot, PingResponse, AuditLog. 
        // 0x03 was sent before.. 0x03 is ShutdownCommand in the enum.
        // The service logs "Unknown message type" default.
        // So "Activity" was likely unimplemented/wrong on service side too or mapped to AuditLog.
        // I will map it to AuditLog (7) since we are sending JSON activity data.

        var data = pipeMessage.Serialize();

        Log.Debug("Sending {SizeBytes} bytes through IPC", data.Length);
        
        await pipe.WriteAsync(data, 0, data.Length);
        await pipe.FlushAsync();

        Log.Debug("IPC send complete");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to send activity through IPC");
        throw;
    }
}

async Task SendPingThroughIpc(NamedPipeClientStream pipe, byte[] payload, uint sessionId)
{
    try
    {
        var pipeMessage = new PipeMessage(PipeMessage.MessageType.PingResponse, sessionId)
        {
            Payload = payload
        };

        var data = pipeMessage.Serialize();

        Log.Debug("Sending {SizeBytes} bytes through IPC", data.Length);
        
        await pipe.WriteAsync(data, 0, data.Length);
        await pipe.FlushAsync();

        Log.Debug("IPC send complete");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to send ping through IPC");
        throw;
    }
}

/// <summary>
/// Simple logger for screenshot service
/// </summary>
class SimpleLogger : ILogger<IScreenshotService>
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter) where TState : notnull
    {
        var message = formatter(state, exception);
        var level = ConvertLogLevel(logLevel);
        
        switch (level)
        {
            case Serilog.Events.LogEventLevel.Verbose:
                Serilog.Log.Verbose(exception, message);
                break;
            case Serilog.Events.LogEventLevel.Debug:
                Serilog.Log.Debug(exception, message);
                break;
            case Serilog.Events.LogEventLevel.Information:
                Serilog.Log.Information(exception, message);
                break;
            case Serilog.Events.LogEventLevel.Warning:
                Serilog.Log.Warning(exception, message);
                break;
            case Serilog.Events.LogEventLevel.Error:
                Serilog.Log.Error(exception, message);
                break;
            case Serilog.Events.LogEventLevel.Fatal:
                Serilog.Log.Fatal(exception, message);
                break;
        }
    }

    private static Serilog.Events.LogEventLevel ConvertLogLevel(LogLevel level) => level switch
    {
        LogLevel.Trace => Serilog.Events.LogEventLevel.Verbose,
        LogLevel.Debug => Serilog.Events.LogEventLevel.Debug,
        LogLevel.Information => Serilog.Events.LogEventLevel.Information,
        LogLevel.Warning => Serilog.Events.LogEventLevel.Warning,
        LogLevel.Error => Serilog.Events.LogEventLevel.Error,
        LogLevel.Critical => Serilog.Events.LogEventLevel.Fatal,
        _ => Serilog.Events.LogEventLevel.Information
    };
}

