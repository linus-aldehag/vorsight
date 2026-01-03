using Serilog;
using Vorsight.Agent.Services;
using Vorsight.Core.IPC;
using Vorsight.Core.Screenshots;

namespace Vorsight.Agent.Cli;

public class CommandDispatcher(
    IScreenshotService screenshotService,
    IActivityService activityService,
    IIpcService ipcService)
{
    public async Task<int> DispatchAsync(string[] args)
    {
        if (args.Length < 1)
        {
            ShowUsage();
            return 1;
        }

        var command = args[0].ToLowerInvariant();
        // Shift args for command-specific options
        var options = args.Length > 1 ? args[1..] : [];

        var sessionId = GetSessionId();

        try
        {
            switch (command)
            {
                case "screenshot":
                    return await HandleScreenshotAsync(sessionId, options);
                
                case "activity":
                    return await HandleActivityAsync(sessionId, options);
                


                default:
                    Log.Error("Unknown command: {Command}", command);
                    ShowUsage();
                    return 1;
            }
        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "Command {Command} failed", command);
            return 1;
        }
    }

    private async Task<int> HandleActivityAsync(uint sessionId, string[] options)
    {
        Log.Debug("Executing activity check for session {SessionId}", sessionId);
        // Interval is ignored as it is one-shot now, but we accept args for compatibility if needed.
        await activityService.CollectAndReportAsync(sessionId);
        return 0;
    }

    private async Task<int> HandleScreenshotAsync(uint sessionId, string[] options)
    {
        Log.Debug("Capturing screenshot for session {SessionId}", sessionId);
        var bytes = await screenshotService.CaptureScreenAsync();
        
        // Option 1 is metadata string if present
        string? metadata = options.Length > 0 ? options[0] : null;

        if (bytes != null && bytes.Length > 0)
        {
            Log.Debug("Sending screenshot ({Size} bytes)", bytes.Length);
            await ipcService.SendMessageAsync(PipeMessage.MessageType.Screenshot, bytes, sessionId, metadata);
            return 0;
        }
        else
        {
            Log.Error("Screenshot capture returned empty/null");
            return 1;
        }
    }

    private static void ShowUsage()
    {
        Log.Information("Usage: wuapihost.exe <command> [options]");
        Log.Information("Commands:");
        Log.Information("  activity   - Capture and report current activity");
        Log.Information("  screenshot - Capture and report screenshot");
    }

    private static uint GetSessionId()
    {
        // Use P/Invoke to get Session ID
        if (Vorsight.Native.ProcessInterop.ProcessIdToSessionId(Vorsight.Native.ProcessInterop.GetCurrentProcessId(), out var sessionId))
        {
            return sessionId;
        }
        return 0;
    }
}
