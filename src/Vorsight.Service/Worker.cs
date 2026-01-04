using Vorsight.Contracts.Audit;
using Vorsight.Contracts.IPC;
using Vorsight.Contracts.Scheduling;
using Vorsight.Contracts.Settings;
using Vorsight.Infrastructure.Contracts;


using Vorsight.Service.Agents;
using Vorsight.Service.IPC;
using Vorsight.Service.Server;
using Vorsight.Service.Monitoring;
using Vorsight.Service.Storage;
using Vorsight.Service.SystemOperations;

namespace Vorsight.Service;

/// <summary>
/// Main worker service that orchestrates the Vörsight system.
/// Manages IPC, schedules, auditing, and agent coordination.
/// </summary>
public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly INamedPipeServer _ipcServer;
    private readonly IScheduleManager _scheduleManager;
    private readonly IAuditManager _auditManager;
    private readonly IGoogleDriveService _googleDriveService;
    private readonly IShutdownCoordinator _shutdownCoordinator;
    private readonly IUploadQueueProcessor _uploadQueueProcessor;
    private readonly ITempFileManager _tempFileManager;
    private readonly IHealthMonitor _healthMonitor;
    private readonly IActivityCoordinator _activityCoordinator;
    private readonly Vorsight.Infrastructure.Uptime.UptimeMonitor _uptimeMonitor;
    private readonly ISessionSummaryManager _sessionSummaryManager;
    private readonly ISettingsManager _settingsManager;
    private readonly IServerConnection _serverConnection;
    private readonly IIpcMessageRouter _ipcMessageRouter;
    private readonly IServerCommandProcessor _serverCommandProcessor;
    private readonly CancellationTokenSource _internalCts = new();

    public Worker(
        ILogger<Worker> logger,
        INamedPipeServer ipcServer,
        IScheduleManager scheduleManager,
        IAuditManager auditManager,
        IGoogleDriveService googleDriveService,
        IShutdownCoordinator shutdownCoordinator,
        IUploadQueueProcessor uploadQueueProcessor,
        ITempFileManager tempFileManager,
        IHealthMonitor healthMonitor,
        IActivityCoordinator activityCoordinator,
        Vorsight.Infrastructure.Uptime.UptimeMonitor uptimeMonitor,
        ISessionSummaryManager sessionSummaryManager,
        ISettingsManager settingsManager,
        IServerConnection serverConnection,
        IIpcMessageRouter ipcMessageRouter,
        IServerCommandProcessor serverCommandProcessor)
    {
        _logger = logger;
        _ipcServer = ipcServer;
        _scheduleManager = scheduleManager;
        _auditManager = auditManager;
        _googleDriveService = googleDriveService;
        _shutdownCoordinator = shutdownCoordinator;
        _uploadQueueProcessor = uploadQueueProcessor;
        _tempFileManager = tempFileManager;
        _healthMonitor = healthMonitor;
        _activityCoordinator = activityCoordinator;
        _uptimeMonitor = uptimeMonitor;
        _sessionSummaryManager = sessionSummaryManager;
        _settingsManager = settingsManager;
        _serverConnection = serverConnection;
        _ipcMessageRouter = ipcMessageRouter;
        _serverCommandProcessor = serverCommandProcessor;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Vörsight Service starting at {Time}", DateTimeOffset.Now);

        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, _internalCts.Token);
        var cancellationToken = linkedCts.Token;

        try
        {
            // Initialize components with granular error handling
            await TryStartComponent("SettingsManager", () => _settingsManager.InitializeAsync());
            await TryStartComponent("AuditManager", () => _auditManager.InitializeAsync());
            await TryStartComponent("IPC Server", () => _ipcServer.StartAsync());
            await TryStartComponent("ServerConnection", () => _serverConnection.InitializeAsync());
            await TryStartComponent("SessionSummaryManager", () => _sessionSummaryManager.InitializeAsync());
            await TryStartComponent("ScheduleManager", () => _scheduleManager.InitializeAsync());

            // Try to fetch initial schedule from server
            try 
            {
                if (_serverConnection.ApiKey != null)
                {
                    _logger.LogInformation("Attempting to fetch initial schedule from server...");
                    var scheduleJson = await _serverConnection.FetchScheduleJsonAsync();
                    if (scheduleJson != null)
                    {
                        await _scheduleManager.UpdateScheduleFromJsonAsync(scheduleJson);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch initial schedule");
            }

            // Hook up IPC message received events - safe to do if IPC started or not (events are null safe)
            if (_ipcServer.IsRunning) // Check if valid
            {
                _ipcServer.MessageReceived += OnMessageReceived;
                _ipcServer.SessionConnected += OnSessionConnected;
                _ipcServer.SessionDisconnected += OnSessionDisconnected;
            }

            // Hook up server commands
            _serverConnection.CommandReceived += OnServerCommandReceived;

            // Hook up schedule updates
            _serverConnection.ScheduleUpdateReceived += async (sender, args) =>
            {
                _logger.LogInformation("Schedule update event received - reloading from server");
                try
                {
                    var json = await _serverConnection.FetchScheduleJsonAsync();
                    if (json != null)
                    {
                        await _scheduleManager.UpdateScheduleFromJsonAsync(json);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to reload schedule after update event");
                }
            };

            // Hook up settings updates
            _serverConnection.SettingsUpdateReceived += (sender, args) =>
            {
                _logger.LogInformation("Settings update event received - settings will be refreshed on next poll");
            };

            // Hook up audit events
            _auditManager.CriticalEventDetected += async (sender, args) =>
            {
                _logger.LogCritical(
                    "SECURITY ALERT: Critical audit event detected - Event ID {EventId}, Description: {Description} at {Time}",
                    args.Event.EventId, args.Description, args.DetectedTime);
                
                // Send to server
                _logger.LogInformation("Server connection status: {Status}", _serverConnection.IsConnected);
                if (_serverConnection.IsConnected)
                {
                    _logger.LogInformation("Sending audit event to server: EventId={EventId}, Type={EventType}", 
                        args.Event.EventId, args.Event.EventType);
                    
                    await _serverConnection.SendAuditEventAsync(new
                    {
                        eventId = args.Event.EventId,
                        eventType = args.Event.EventType,
                        username = args.Event.Username,
                        timestamp = args.Event.Timestamp,
                        details = args.Event.Details,
                        sourceLogName = args.Event.SourceLogName,
                        isFlagged = args.Event.IsFlagged
                    });
                    
                    _logger.LogInformation("Audit event sent successfully");
                }
                else
                {
                    _logger.LogWarning("Cannot send audit event - server not connected");
                }
            };

            _auditManager.TamperingDetected += (sender, args) =>
            {
                _logger.LogCritical(
                    "SECURITY ALERT: Audit tampering detected - Type: {TamperingType}, User: {User}, Details: {Details}",
                    args.TamperingType, args.AffectedUsername, args.Details);
            };

            // Start cloud services
            await TryStartComponent("UploadQueueProcessor", () => _uploadQueueProcessor.StartAsync(cancellationToken));
            TryStartComponentSync("TempFileManager", () => _tempFileManager.StartPeriodicCleanup(cancellationToken));
            
            // Start monitoring loops in background (do not await, as they run indefinitely)
            _ = Task.Run(() => TryStartComponent("HealthMonitor", () => _healthMonitor.StartMonitoringAsync(cancellationToken)), cancellationToken);
            _ = Task.Run(() => TryStartComponent("ActivityCoordinator", () => _activityCoordinator.StartMonitoringAsync(cancellationToken)), cancellationToken);

            // Start enforcement
            await TryStartComponent("ScheduleManager Enforcement", () => _scheduleManager.StartEnforcementAsync());

            // Start audit monitoring
            await TryStartComponent("AuditManager Monitoring", () => _auditManager.StartMonitoringAsync());

            _logger.LogInformation("Vörsight Service initialized successfully");

            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogDebug("Service health check: OK");
                    
                    // Ensure server connection
                    await _serverConnection.EnsureConnectedAsync(cancellationToken);

                    // Update uptime
                    _uptimeMonitor.RecordHeartbeat();

                    // Service health check every 30 seconds
                    await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in service loop");
                    _sessionSummaryManager.RegisterException(ex);
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Service cancellation requested");
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Fatal error in service");
            _sessionSummaryManager.RegisterException(ex);
        }
        finally
        {
            await StopServiceAsync();
        }
    }

    private async Task TryStartComponent(string name, Func<Task> startupAction)
    {
        try
        {
            _logger.LogInformation("Starting component: {Name}", name);
            await startupAction();
            _logger.LogInformation("Component started: {Name}", name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start component: {Name}", name);
            _sessionSummaryManager.RegisterException(ex);
            // We choose NOT to rethrow, allowing partial service startup
        }
    }

    private void TryStartComponentSync(string name, Action startupAction)
    {
        try
        {
            _logger.LogInformation("Starting component: {Name}", name);
            startupAction();
            _logger.LogInformation("Component started: {Name}", name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start component: {Name}", name);
            _sessionSummaryManager.RegisterException(ex);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Vörsight Service stopping");
        await StopServiceAsync();
        await base.StopAsync(cancellationToken);
    }

    private bool _isStopping;

    private async Task StopServiceAsync()
    {
        if (_isStopping) return;
        _isStopping = true;

        try
        {

            _logger.LogInformation("Shutting down service components");

            // Signal shutdown to Google Drive service immediately
            _googleDriveService.BeginShutdown();

            // Stop audit monitoring
            await _auditManager.StopMonitoringAsync();

            // Stop enforcement
            await _scheduleManager.StopEnforcementAsync();

            // Stop IPC server
            await _ipcServer.StopAsync();

            // Cleanup uploads with reduced timeouts
            await _uploadQueueProcessor.CompleteAsync(TimeSpan.FromSeconds(3));
            await _shutdownCoordinator.ShutdownGracefullyAsync(TimeSpan.FromSeconds(5));
            
            // Complete session (Upload logs) - MUST be done before disposing drive service (via container)
            // Note: Worker doesn't own the container, but we must ensure this runs before the host shuts down completely
            await _sessionSummaryManager.CompleteSessionAsync("Controlled Exit", _healthMonitor.GetHealthReport());
            
            _auditManager?.Dispose();
            _scheduleManager?.Dispose();
            _ipcServer?.Dispose();
            _internalCts.Cancel();

            _logger.LogInformation("Vörsight Service stopped cleanly");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during service shutdown");
        }
    }

    public override void Dispose()
    {
        _logger.LogDebug("Disposing Worker");
        _internalCts.Dispose();
        base.Dispose();
        GC.SuppressFinalize(this);
    }

    private void OnServerCommandReceived(object? sender, CommandReceivedEventArgs e)
    {
        _serverCommandProcessor.ProcessCommand(sender, e);
    }

    /// <summary>
    /// Handles incoming messages from Agent via IPC.
    /// </summary>
    private async void OnMessageReceived(object? sender, PipeMessageReceivedEventArgs e)
    {
        await _ipcMessageRouter.RouteMessageAsync(sender ?? this, e);
    }

    /// <summary>
    /// Handles session connection events.
    /// </summary>
    private void OnSessionConnected(object? sender, SessionConnectedEventArgs e)
    {
        _logger.LogDebug(
            "Agent session connected: SessionId={SessionId}, User={Username}",
            e.SessionId,
            e.Username ?? "(unknown)");
    }

    /// <summary>
    /// Handles session disconnection events.
    /// </summary>
    private void OnSessionDisconnected(object? sender, SessionDisconnectedEventArgs e)
    {
        _logger.LogDebug(
            "Agent session disconnected: SessionId={SessionId}, Reason={Reason}",
            e.SessionId,
            e.Reason ?? "normal");
    }
}
