using Serilog;
using Vorsight.Contracts.Audit;
using Vorsight.Contracts.IPC;
using Vorsight.Contracts.Scheduling;
using Vorsight.Infrastructure.Scheduling;
using Vorsight.Infrastructure.Audit;
using Vorsight.Infrastructure.Contracts;
using Vorsight.Service;
using Vorsight.Service.Agents;
using Vorsight.Service.IPC;
using Vorsight.Service.Server;
using Vorsight.Service.Monitoring;
using Vorsight.Service.Storage;
using Vorsight.Service.SystemOperations;
using Vorsight.Service.Auditing;
using Serilog.Events;
using Serilog.Sinks.PeriodicBatching;
using Vorsight.Infrastructure.IO;
using Vorsight.Infrastructure.IPC;
using Vorsight.Infrastructure.Settings;
using Vorsight.Infrastructure.Uptime;
using Vorsight.Service.Logging;
using Vorsight.Service.Utilities;

// Configure Serilog for structured logging
var configuration = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? "Production"}.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(configuration)
    .MinimumLevel.Information() // Default if not in config
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information) 
    .WriteTo.File(
        path: Path.Combine(PathConfiguration.GetServiceLogPath(), "vorsight-service-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 3,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .WriteTo.Console(
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    // Add Server Sink for remote logging (Warning+ by default)
    .WriteTo.Sink(new PeriodicBatchingSink(
        new ServerSink(LogEventLevel.Warning),
        new PeriodicBatchingSinkOptions 
        { 
            BatchSizeLimit = 50, 
            Period = TimeSpan.FromSeconds(5) 
        }))
    .CreateLogger();

try
{
    // Handle command-line arguments for service installation
    if (args.Length > 0)
    {
        var command = args[0].ToLowerInvariant();
        
        if (command == "install")
        {
            var serviceName = "VorsightService";
            var displayName = "Vörsight Service";
            var description = "Vörsight monitoring and management service";
            
            var exePath = Path.Combine(AppContext.BaseDirectory, "Vorsight.Service.exe");
            
            // Use sc.exe to create the service
            var startInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "sc.exe",
                Arguments = $"create \"{serviceName}\" binPath= \"\\\"{exePath}\\\"\" DisplayName= \"{displayName}\" start= auto",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            
            using var process = System.Diagnostics.Process.Start(startInfo);
            if (process != null)
            {
                process.WaitForExit();
                var output = process.StandardOutput.ReadToEnd();
                var error = process.StandardError.ReadToEnd();
                
                if (process.ExitCode == 0)
                {
                    Console.WriteLine($"Service '{serviceName}' installed successfully.");
                    
                    // Set description
                    var descStartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "sc.exe",
                        Arguments = $"description \"{serviceName}\" \"{description}\"",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    using var descProcess = System.Diagnostics.Process.Start(descStartInfo);
                    descProcess?.WaitForExit();
                }
                else
                {
                    Console.WriteLine($"Failed to install service: {error}");
                    return 1;
                }
            }
            return 0;
        }
        else if (command == "uninstall")
        {
            var serviceName = "VorsightService";
            
            // Check for custom service name
            for (int i = 1; i < args.Length; i++)
            {
                if (args[i] == "--service-name" && i + 1 < args.Length)
                    serviceName = args[i + 1];
            }
            
            var startInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "sc.exe",
                Arguments = $"delete \"{serviceName}\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            
            using var process = System.Diagnostics.Process.Start(startInfo);
            if (process != null)
            {
                process.WaitForExit();
                if (process.ExitCode == 0)
                {
                    Console.WriteLine($"Service '{serviceName}' uninstalled successfully.");
                }
                else
                {
                    var error = process.StandardError.ReadToEnd();
                    Console.WriteLine($"Failed to uninstall service: {error}");
                    return 1;
                }
            }
            return 0;
        }
    }

    Log.Information("Vörsight Service starting...");
    Log.Information("Application directory: {Directory}", AppContext.BaseDirectory);

    var builder = WebApplication.CreateBuilder(args);
    
    // Enable Windows Service support
    builder.Host.UseWindowsService();

    Log.Debug($"Environment: {builder.Environment.EnvironmentName}");
    Log.Debug($"ContentRootPath: {builder.Environment.ContentRootPath}");
    Log.Debug($"Agent Path from Config: {builder.Configuration["Agent:ExecutablePath"]}");

    // Add services to the container.
    builder.Services.AddSerilog();

    // Configure core services
    builder.Services.AddCors();
    builder.Services.AddSingleton<INamedPipeServer>(sp =>
        new NamedPipeServer(sp.GetRequiredService<ILogger<NamedPipeServer>>(), "VorsightIPC"));

    builder.Services.AddSingleton<IScheduleManager>(sp =>
#pragma warning disable CA1416 // Validate platform compatibility - entire service is Windows-only
        new ScheduleManager(
            sp.GetRequiredService<ILogger<ScheduleManager>>(),
            sp.GetRequiredService<IHttpClientFactory>(),
            sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>()));
#pragma warning restore CA1416

    builder.Services.AddSingleton<IAuditManager, AuditManager>();
    builder.Services.AddSingleton<IHealthAuditManager, HealthAuditManager>();

    // Screenshot Upload Services (Direct to Drive with server credentials)
    builder.Services.AddSingleton<IGoogleDriveService, GoogleDriveService>();
    builder.Services.AddSingleton<IShutdownCoordinator, ShutdownCoordinator>();
    builder.Services.AddSingleton<IUploadQueueProcessor, UploadQueueProcessor>();
    builder.Services.AddSingleton<ITempFileManager, TempFileManager>();
    builder.Services.AddSingleton<IHealthMonitor, HealthMonitor>();
    builder.Services.AddSingleton<UptimeMonitor>();

    
    // Server Connection (Node.js server)
    builder.Services.AddHttpClient();
    builder.Services.AddSingleton<ICredentialStore, FileCredentialStore>();
    builder.Services.AddSingleton<IServerConnection, ServerConnection>();
    builder.Services.AddSingleton<IAgentLauncher, AgentLauncher>();
    
    // Scavenged Services
    builder.Services.AddSingleton<IActivityCoordinator, ActivityCoordinator>();
    builder.Services.AddSingleton<ISessionSummaryManager, SessionSummaryManager>();
    builder.Services.AddSingleton<ICommandExecutor, CommandExecutor>();
    builder.Services.AddSingleton<ISettingsManager, SettingsManager>();
    builder.Services.AddSingleton<IPerceptualHashService, PerceptualHashService>();

    // Agents and IPC Handlers
    builder.Services.AddSingleton<ScreenshotHandler>();
    builder.Services.AddSingleton<ActivityLogHandler>();
    builder.Services.AddSingleton<IIpcMessageRouter, IpcMessageRouter>();
    builder.Services.AddSingleton<IServerCommandProcessor, ServerCommandProcessor>();

    // Add hosted service
    builder.Services.AddHostedService<Worker>();


    // Build and run
    var app = builder.Build();
    
    // Map API Endpoints
    app.UseCors(policy => policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost").AllowAnyMethod().AllowAnyHeader());
    app.MapApiEndpoints();

    // Initialize Global Exception Handling
    var sessionManager = app.Services.GetRequiredService<ISessionSummaryManager>();
    // Session initialization moved to Worker.cs to ensure ServerConnection is ready
    
    AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
    {
        sessionManager.RegisterException((Exception)e.ExceptionObject);
        if (e.IsTerminating)
        {
            Log.Fatal((Exception)e.ExceptionObject, "AppDomain Unhandled Exception");
            // Attempt to upload sync? or just rely on lock file
        }
    };

    try 
    {
        await app.RunAsync();
        // Session completion moved to Worker.StopServiceAsync to ensure safe disposal
    }
    catch (Exception ex)
    {
        sessionManager.RegisterException(ex);
        // await sessionManager.CompleteSessionAsync("Crash", null); // Might fail if tearing down
        throw;
    }
}
catch (Exception ex)
{
    Log.Fatal(ex, "Vörsight Service terminated unexpectedly");
    return 1;
}
finally
{
    Log.CloseAndFlush();
}

return 0;
