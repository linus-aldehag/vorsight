using Microsoft.Extensions.Logging;
using Serilog;
using Vorsight.Agent.Cli;
using Vorsight.Agent.Contracts;
using Vorsight.Agent.Services;
using Vorsight.Interop;
using Vorsight.Infrastructure.IO;
using Vorsight.Infrastructure.Monitoring;

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
                builder.SetMinimumLevel(LogLevel.Warning);
            });

            var ipcService = new IpcService();
            
            // Create typed logger for ScreenshotService
            var screenshotLogger = loggerFactory.CreateLogger<IScreenshotService>();
            var screenshotService = new ScreenshotService(screenshotLogger);
            
            var userActivityMonitor = new UserActivityMonitor();
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
        var logDir = PathConfiguration.GetAgentLogPath();
        var logPath = Path.Combine(logDir, "agent-.log");

        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Warning()
            .WriteTo.Console()
            .WriteTo.File(logPath, rollingInterval: RollingInterval.Day, retainedFileCountLimit: 3)
            .CreateLogger();
    }
}
