using System.Text.Json;
using System.Text.Json.Serialization;
using Vorsight.Contracts.DTOs;
using Vorsight.Contracts.Settings;
using Vorsight.Infrastructure.Contracts;
using Vorsight.Infrastructure.Uptime;
using Vorsight.Service.IPC;
using Vorsight.Service.Monitoring;
using Vorsight.Service.Server;
using Vorsight.Service.Storage;
using Vorsight.Service.SystemOperations;

namespace Vorsight.Service;

/// <summary>
/// Main worker service that orchestrates the Vörsight system.
/// Manages IPC, schedules, auditing, and agent coordination.
/// </summary>
public class Worker(
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
    UptimeMonitor uptimeMonitor,
    ISessionSummaryManager sessionSummaryManager,
    ISettingsManager settingsManager,
    IServerConnection serverConnection,
    IIpcMessageRouter ipcMessageRouter,
    IServerCommandProcessor serverCommandProcessor
) : BackgroundService
{
    private readonly CancellationTokenSource _internalCts = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Vörsight Service starting at {Time}", DateTimeOffset.Now);

        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            stoppingToken,
            _internalCts.Token
        );
        var cancellationToken = linkedCts.Token;

        try
        {
            // Initialize components with granular error handling
            await TryStartComponent("SettingsManager", settingsManager.InitializeAsync);
            await TryStartComponent("AuditManager", auditManager.InitializeAsync);
            await TryStartComponent("IPC Server", ipcServer.StartAsync);
            await TryStartComponent("ServerConnection", serverConnection.InitializeAsync);
            await TryStartComponent("SessionSummaryManager", sessionSummaryManager.InitializeAsync);
            await TryStartComponent("ScheduleManager", scheduleManager.InitializeAsync);

            // Try to fetch initial settings which includes schedule
            await FetchAndApplySettingsAsync();

            // Hook up IPC message received events - safe to do if IPC started or not (events are null safe)
            if (ipcServer.IsRunning) // Check if valid
            {
                ipcServer.MessageReceived += OnMessageReceived;
                ipcServer.SessionConnected += OnSessionConnected;
                ipcServer.SessionDisconnected += OnSessionDisconnected;
            }

            // Hook up server commands
            serverConnection.CommandReceived += OnServerCommandReceived;

            // Hook up schedule updates - Now handled via settings, but keep for fallback triggers
            serverConnection.ScheduleUpdateReceived += async (_, _) =>
            {
                logger.LogDebug(
                    "Schedule update event received - reloading settings to get new schedule"
                );
                await FetchAndApplySettingsAsync();
            };

            // Hook up settings updates
            serverConnection.SettingsUpdateReceived += async (_, _) =>
            {
                logger.LogDebug("Settings update event received - reloading from server");
                await FetchAndApplySettingsAsync();
            };

            // Hook up connection restored (re-fetch everything)
            serverConnection.ConnectionRestored += async (_, _) =>
            {
                logger.LogInformation("Connection to server restored - re-fetching settings");

                // Fetch Settings (includes Schedule)
                await FetchAndApplySettingsAsync();
            };

            // Hook up audit events
            auditManager.CriticalEventDetected += async (_, args) =>
            {
                if (args.Event.IsFlagged)
                {
                    logger.LogInformation(
                        "Audit Alert (Flagged): [{EventId}] {Description} - Check Audit Log for details.",
                        args.Event.EventId,
                        args.Description
                    );
                }
                // Routine audit events (IsFlagged=false) are not logged locally to keep logs clean
                // They are still sent to the server in the block below

                // Send to server
                logger.LogInformation(
                    "Server connection status: {Status}",
                    serverConnection.IsConnected
                );
                if (serverConnection.IsConnected)
                {
                    logger.LogDebug(
                        "Sending audit event to server: EventId={EventId}, Type={EventType}",
                        args.Event.EventId,
                        args.Event.EventType
                    );

                    await serverConnection.SendAuditEventAsync(args.Event);

                    logger.LogDebug("Audit event sent successfully");
                }
                else
                {
                    logger.LogWarning("Cannot send audit event - server not connected");
                }
            };

            auditManager.TamperingDetected += (_, args) =>
            {
                logger.LogCritical(
                    "SECURITY ALERT: Audit tampering detected - Type: {TamperingType}, User: {User}, Details: {Details}",
                    args.TamperingType,
                    args.AffectedUsername,
                    args.Details
                );
            };

            // Start cloud services
            await TryStartComponent(
                "UploadQueueProcessor",
                () => uploadQueueProcessor.StartAsync(cancellationToken)
            );
            TryStartComponentSync(
                "TempFileManager",
                () => tempFileManager.StartPeriodicCleanup(cancellationToken)
            );

            // Start monitoring loops in background (do not await, as they run indefinitely)
            _ = Task.Run(
                () =>
                    TryStartComponent(
                        "HealthMonitor",
                        () => healthMonitor.StartMonitoringAsync(cancellationToken)
                    ),
                cancellationToken
            );
            _ = Task.Run(
                () =>
                    TryStartComponent(
                        "ActivityCoordinator",
                        () => activityCoordinator.StartMonitoringAsync(cancellationToken)
                    ),
                cancellationToken
            );

            // Start enforcement
            await TryStartComponent(
                "ScheduleManager Enforcement",
                scheduleManager.StartEnforcementAsync
            );

            // Start audit monitoring (respecting settings)
            var currentSettings = await settingsManager.GetSettingsAsync();
            if (currentSettings.Audit.Enabled)
            {
                await TryStartComponent(
                    "AuditManager Monitoring",
                    () => auditManager.StartMonitoringAsync(currentSettings)
                );
            }
            else
            {
                logger.LogInformation("Audit monitoring disabled by settings on startup");
            }

            logger.LogInformation("Vörsight Service initialized successfully");

            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    logger.LogTrace("Service health check: OK");

                    // Ensure server connection
                    await serverConnection.EnsureConnectedAsync(cancellationToken);

                    // Update uptime
                    uptimeMonitor.RecordHeartbeat();

                    // Construct state payload
                    var healthReport = healthMonitor.GetHealthReport();
                    var currentActivity = activityCoordinator.GetCurrentActivity();
                    var uptimeStatus = uptimeMonitor.GetCurrentStatus();

                    var state = new StatePayload
                    {
                        LastActivityTime = currentActivity?.Timestamp ?? DateTime.UtcNow,
                        ActiveWindow = currentActivity?.ActiveWindowTitle ?? "Unknown",
                        ScreenshotCount = healthReport.TotalScreenshotsSuccessful,
                        UploadCount = healthReport.TotalUploadsSuccessful,
                        Health = new HealthStatus
                        {
                            Uptime = uptimeStatus.CurrentStart.HasValue
                                ? (DateTime.UtcNow - uptimeStatus.CurrentStart.Value).TotalSeconds
                                : 0,
                            Message = "Running",
                        },
                        Version = "1.0.0",
                    };

                    // Send heartbeat
                    await serverConnection.SendHeartbeatAsync(state);

                    // Service health check every 10 seconds (Heartbeat)
                    await Task.Delay(TimeSpan.FromSeconds(10), cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error in service loop");
                    sessionSummaryManager.RegisterException(ex);
                }
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Service cancellation requested");
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "Fatal error in service");
            sessionSummaryManager.RegisterException(ex);
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
            logger.LogDebug("Starting component: {Name}", name);
            await startupAction();
            logger.LogDebug("Component started: {Name}", name);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start component: {Name}", name);
            sessionSummaryManager.RegisterException(ex);
            // We choose NOT to rethrow, allowing partial service startup
        }
    }

    private void TryStartComponentSync(string name, Action startupAction)
    {
        try
        {
            logger.LogInformation("Starting component: {Name}", name);
            startupAction();
            logger.LogInformation("Component started: {Name}", name);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start component: {Name}", name);
            sessionSummaryManager.RegisterException(ex);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("Vörsight Service stopping");
        await StopServiceAsync();
        await base.StopAsync(cancellationToken);
    }

    private bool _isStopping;

    private async Task StopServiceAsync()
    {
        if (_isStopping)
            return;
        _isStopping = true;

        try
        {
            logger.LogInformation("Shutting down service components");

            // Signal shutdown to Google Drive service immediately
            googleDriveService.BeginShutdown();

            // Stop audit monitoring
            await auditManager.StopMonitoringAsync();

            // Stop enforcement
            await scheduleManager.StopEnforcementAsync();

            // Stop IPC server
            await ipcServer.StopAsync();

            // Cleanup uploads with reduced timeouts
            await uploadQueueProcessor.CompleteAsync(TimeSpan.FromSeconds(3));
            await shutdownCoordinator.ShutdownGracefullyAsync(TimeSpan.FromSeconds(5));

            // Complete session (Upload logs) - MUST be done before disposing drive service (via container)
            // Note: Worker doesn't own the container, but we must ensure this runs before the host shuts down completely
            await sessionSummaryManager.CompleteSessionAsync(
                "Controlled Exit",
                healthMonitor.GetHealthReport()
            );

            auditManager.Dispose();
            scheduleManager.Dispose();
            ipcServer.Dispose();
            await _internalCts.CancelAsync();

            logger.LogInformation("Vörsight Service stopped cleanly");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during service shutdown");
        }
    }

    public override void Dispose()
    {
        logger.LogDebug("Disposing Worker");
        _internalCts.Dispose();
        base.Dispose();
        GC.SuppressFinalize(this);
    }

    private void OnServerCommandReceived(object? sender, CommandReceivedEventArgs e)
    {
        serverCommandProcessor.ProcessCommand(sender, e);
    }

    /// <summary>
    /// Handles incoming messages from Agent via IPC.
    /// </summary>
    private async void OnMessageReceived(object? sender, PipeMessageReceivedEventArgs e)
    {
        await ipcMessageRouter.RouteMessageAsync(sender ?? this, e);
    }

    /// <summary>
    /// Handles session connection events.
    /// </summary>
    private void OnSessionConnected(object? sender, SessionConnectedEventArgs e)
    {
        logger.LogDebug(
            "Agent session connected: SessionId={SessionId}, User={Username}",
            e.SessionId,
            e.Username ?? "(unknown)"
        );
    }

    /// <summary>
    /// Handles session disconnection events.
    /// </summary>
    private void OnSessionDisconnected(object? sender, SessionDisconnectedEventArgs e)
    {
        logger.LogDebug(
            "Agent session disconnected: SessionId={SessionId}, Reason={Reason}",
            e.SessionId,
            e.Reason ?? "normal"
        );
    }

    private async Task FetchAndApplySettingsAsync()
    {
        try
        {
            var json = await serverConnection.FetchSettingsJsonAsync();
            if (json != null)
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    Converters = { new JsonStringEnumConverter() },
                };
                var settings = JsonSerializer.Deserialize<MachineSettings>(json, options);
                if (settings != null)
                {
                    await settingsManager.UpdateSettingsAsync(settings);
                    await ApplySettingsAsync(settings);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch and apply settings");
        }
    }

    private async Task ApplySettingsAsync(MachineSettings settings)
    {
        try
        {
            // Apply Audit Settings
            if (settings.Audit.Enabled)
            {
                // Always call StartMonitoringAsync to ensure settings (filters) are up to date
                // The manager handles restart if already running
                logger.LogInformation("Applying Audit Monitoring settings");
                await auditManager.StartMonitoringAsync(settings);
            }
            else
            {
                if (auditManager.IsMonitoring)
                {
                    logger.LogInformation("Disabling Audit Monitoring based on settings");
                    await auditManager.StopMonitoringAsync();
                }
            }

            // Apply Schedule Settings
            logger.LogInformation("Applying Access Control settings");
            await scheduleManager.UpdateScheduleFromSettingsAsync(settings.AccessControl);

            // Report successful application to server (Settings Sync)
            var settingsJson = JsonSerializer.Serialize(settings);
            await serverConnection.ReportAppliedSettingsAsync(settingsJson);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to apply settings");
        }
    }
}
