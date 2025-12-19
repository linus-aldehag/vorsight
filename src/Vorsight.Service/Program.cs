using Serilog;
using Vorsight.Core.Audit;
using Vorsight.Core.IPC;
using Vorsight.Core.Scheduling;
using Vorsight.Service;
using Vorsight.Service.Services;

// Configure Serilog for structured logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
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
    
    // Scavenged Services
    builder.Services.AddSingleton<Vorsight.Native.IUserActivityMonitor, Vorsight.Native.UserActivityMonitor>();
    builder.Services.AddSingleton<IActivityCoordinator, ActivityCoordinator>();
    builder.Services.AddSingleton<ICommandExecutor, CommandExecutor>();

    // Add hosted service
    builder.Services.AddHostedService<Worker>();


    // Build and run
    var app = builder.Build();
    
    // Map API Endpoints
    app.UseCors(policy => policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost").AllowAnyMethod().AllowAnyHeader());
    app.MapApiEndpoints();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Vörsight Service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
