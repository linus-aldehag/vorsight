using Serilog;
using Vorsight.Core.Audit;
using Vorsight.Core.IPC;
using Vorsight.Core.Scheduling;
using Vorsight.Service;

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

    var builder = Host.CreateApplicationBuilder(args);

    // Configure Serilog
    builder.Services.AddSerilog();

    // Configure core services
    builder.Services.AddSingleton<INamedPipeServer>(sp =>
        new NamedPipeServer(sp.GetRequiredService<ILogger<NamedPipeServer>>(), "VorsightIPC"));

    builder.Services.AddSingleton<IScheduleManager>(sp =>
        new ScheduleManager(sp.GetRequiredService<ILogger<ScheduleManager>>()));

    builder.Services.AddSingleton<IAuditManager, AuditManager>();

    // Add hosted service
    builder.Services.AddHostedService<Worker>();


    // Build and run
    var host = builder.Build();

    Log.Information("Starting Vörsight Service host...");
    await host.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Vörsight Service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
