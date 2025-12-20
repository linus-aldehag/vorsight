using Microsoft.Extensions.Logging;
using Serilog;
using Vorsight.Agent.Cli;
using Vorsight.Agent.Services;

namespace Vorsight.Agent;

static class Program
{
    [STAThread]
    static async Task<int> Main(string[] args)
    {
        SetupLogging();

        try
        {
            Log.Information("Vörsight Agent starting...");

            // Setup DI (Manual for simplicity in this CLI tool)
            using var loggerFactory = LoggerFactory.Create(builder =>
            {
                builder.AddSerilog(); 
                builder.SetMinimumLevel(LogLevel.Debug);
            });

            var ipcService = new IpcService();
            
            // Create typed logger for ScreenshotService
            var screenshotLogger = loggerFactory.CreateLogger<Core.Screenshots.IScreenshotService>();
            var screenshotService = new ScreenshotService(screenshotLogger);
            
            var userActivityMonitor = new Vorsight.Native.UserActivityMonitor();
            var activityService = new ActivityService(ipcService, userActivityMonitor);
            
            var dispatcher = new CommandDispatcher(screenshotService, activityService, ipcService);

            var result = await dispatcher.DispatchAsync(args);
            
            Log.Information("Vörsight Agent exiting with code {Code}", result);
            return result;
        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "Unhandled exception in Vörsight Agent");
            return 1;
        }
        finally
        {
            Log.CloseAndFlush();
        }
    }

    private static void SetupLogging()
    {
        var logDir = Path.Combine(Path.GetTempPath(), "Vorsight", "Logs");
        Directory.CreateDirectory(logDir);
        var logPath = Path.Combine(logDir, "agent-.log");

        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .WriteTo.Console()
            .WriteTo.File(logPath, rollingInterval: RollingInterval.Day)
            .CreateLogger();
    }
}
