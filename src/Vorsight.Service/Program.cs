using Serilog;
using Vorsight.Core.Audit;
using Vorsight.Core.IPC;
using Vorsight.Core.Scheduling;
using Vorsight.Service;
using Vorsight.Service.Services;

// Configure Serilog for structured logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Debug) // Enable Microsoft logs for debugging startup
    .WriteTo.File(
        path: Path.Combine(AppContext.BaseDirectory, "logs", "vorsight-service-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .WriteTo.Console(
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("Vörsight Service starting...");
    Log.Information("Application directory: {Directory}", AppContext.BaseDirectory);

    var builder = WebApplication.CreateBuilder(args);

    // Add services to the container.
    builder.Services.AddSerilog();

    // Configure core services
    builder.Services.AddCors();
    builder.Services.AddSingleton<INamedPipeServer>(sp =>
        new NamedPipeServer(sp.GetRequiredService<ILogger<NamedPipeServer>>(), "VorsightIPC"));

    builder.Services.AddSingleton<IScheduleManager>(sp =>
        new ScheduleManager(sp.GetRequiredService<ILogger<ScheduleManager>>()));

    builder.Services.AddSingleton<IAuditManager, AuditManager>();

    // Cloud Upload Services
    builder.Services.AddSingleton<IGoogleDriveService, GoogleDriveService>();
    builder.Services.AddSingleton<IShutdownCoordinator, ShutdownCoordinator>();
    builder.Services.AddSingleton<IUploadQueueProcessor, UploadQueueProcessor>();
    builder.Services.AddSingleton<ITempFileManager, TempFileManager>();
    builder.Services.AddSingleton<IHealthMonitor, HealthMonitor>();
    builder.Services.AddSingleton<Vorsight.Core.Uptime.UptimeMonitor>();
    builder.Services.AddSingleton<Vorsight.Service.Services.Analytics.IActivityRepository, Vorsight.Service.Services.Analytics.JsonFileActivityRepository>();
    builder.Services.AddSingleton<Vorsight.Service.Services.Auditing.IAuditManager, Vorsight.Service.Services.Auditing.AuditManager>();
    
    // Server Connection (Node.js server)
    builder.Services.AddHttpClient();
    builder.Services.AddSingleton<IServerConnection, ServerConnection>();
    
    // Scavenged Services
    builder.Services.AddSingleton<IActivityCoordinator, ActivityCoordinator>();
    builder.Services.AddSingleton<ISessionSummaryManager, SessionSummaryManager>();
    builder.Services.AddSingleton<ICommandExecutor, CommandExecutor>();
    builder.Services.AddSingleton<Vorsight.Core.Settings.ISettingsManager, Vorsight.Core.Settings.SettingsManager>();

    // Add hosted service
    builder.Services.AddHostedService<Worker>();


    // Build and run
    var app = builder.Build();
    
    // Map API Endpoints
    app.UseCors(policy => policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost").AllowAnyMethod().AllowAnyHeader());
    app.MapApiEndpoints();

    // Initialize Global Exception Handling
    var sessionManager = app.Services.GetRequiredService<ISessionSummaryManager>();
    await sessionManager.InitializeAsync(); // Check for previous crashes
    
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
}
finally
{
    Log.CloseAndFlush();
}
