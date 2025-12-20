using Vorsight.Core.Audit;
using Vorsight.Core.IPC;
using Vorsight.Core.Scheduling;

using Vorsight.Service.Services;

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
    private readonly Vorsight.Core.Uptime.UptimeMonitor _uptimeMonitor;
    private readonly ISessionSummaryManager _sessionSummaryManager;
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
        Vorsight.Core.Uptime.UptimeMonitor uptimeMonitor,
        ISessionSummaryManager sessionSummaryManager)
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
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Vörsight Service starting at {Time}", DateTimeOffset.Now);

        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, _internalCts.Token);
        var cancellationToken = linkedCts.Token;

        try
        {
            // Initialize components with granular error handling
            await TryStartComponent("ScheduleManager", () => _scheduleManager.InitializeAsync());
            await TryStartComponent("AuditManager", () => _auditManager.InitializeAsync());
            await TryStartComponent("IPC Server", () => _ipcServer.StartAsync());

            // Hook up IPC message received events - safe to do if IPC started or not (events are null safe)
            if (_ipcServer.IsRunning) // Check if valid
            {
                _ipcServer.MessageReceived += OnMessageReceived;
                _ipcServer.SessionConnected += OnSessionConnected;
                _ipcServer.SessionDisconnected += OnSessionDisconnected;
            }

            // Hook up audit events
            _auditManager.CriticalEventDetected += (sender, args) =>
            {
                _logger.LogCritical(
                    "SECURITY ALERT: Critical audit event detected - Event ID {EventId} at {Time}",
                    args.MatchingFilter?.EventId, args.DetectedTime);
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

            // Stop audit monitoring
            await _auditManager.StopMonitoringAsync();

            // Stop enforcement
            await _scheduleManager.StopEnforcementAsync();

            // Stop IPC server
            await _ipcServer.StopAsync();

            // Cleanup uploads
            await _uploadQueueProcessor.CompleteAsync(TimeSpan.FromSeconds(5));
            await _shutdownCoordinator.ShutdownGracefullyAsync(TimeSpan.FromSeconds(10));
            
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

    /// <summary>
    /// Handles incoming messages from Agent via IPC.
    /// </summary>
    private void OnMessageReceived(object sender, PipeMessageReceivedEventArgs e)
    {
        try
        {
            _logger.LogInformation(
                "Agent message received from session {SessionId}: Type={MessageType}, Size={PayloadSize} bytes",
                e.SessionId,
                e.Message.Type,
                e.Message.Payload?.Length ?? 0);

            // Handle different message types
            switch (e.Message.Type)
            {
                case PipeMessage.MessageType.Screenshot:
                    HandleScreenshotMessage(e.SessionId, e.Message);
                    break;

                case PipeMessage.MessageType.PingResponse:
                    HandlePingResponse(e.SessionId, e.Message);
                    break;

                case PipeMessage.MessageType.AuditLog:
                    HandleAuditLog(e.SessionId, e.Message);
                    break;

                default:
                    _logger.LogWarning("Unknown message type received: {MessageType}", e.Message.Type);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message from session {SessionId}", e.SessionId);
        }
    }

    /// <summary>
    /// Handles screenshot message from Agent.
    /// </summary>
    private void HandleScreenshotMessage(uint sessionId, PipeMessage message)
    {
        _logger.LogInformation(
            "Screenshot received from session {SessionId}: {SizeBytes} bytes, ID={MessageId}",
            sessionId,
            message.Payload?.Length ?? 0,
            message.MessageId);

        // Write to temp file and enqueue for upload
        try
        {
            if (message.Payload != null && message.Payload.Length > 0)
            {
                // Parse metadata for Title
                string windowTitle = "Unknown";
                if (!string.IsNullOrEmpty(message.Metadata))
                {
                    var parts = message.Metadata.Split('|');
                    foreach (var part in parts)
                    {
                        var kvp = part.Split(':', 2);
                        if (kvp.Length == 2 && kvp[0] == "Title")
                        {
                            windowTitle = kvp[1];
                            break;
                        }
                    }
                }

                // Sanitize filename
                var invalidChars = Path.GetInvalidFileNameChars();
                var sanitizedTitle = new string(windowTitle.Where(ch => !invalidChars.Contains(ch)).ToArray());
                // Truncate if too long (max 50 chars for title)
                if (sanitizedTitle.Length > 50) sanitizedTitle = sanitizedTitle.Substring(0, 50);
                if (string.IsNullOrWhiteSpace(sanitizedTitle)) sanitizedTitle = "Unknown";

                // Create Date-based folder structure
                var dateFolder = DateTime.Now.ToString("yyyy-MM-dd");
                var tempPath = Path.Combine(Path.GetTempPath(), "Vorsight", Environment.MachineName, "Screenshots", dateFolder);
                Directory.CreateDirectory(tempPath);
                
                // Format: screenshot-{Title}-{Ticks}.png
                var fileName = $"screenshot-{sanitizedTitle}-{message.CreatedUtc.Ticks}.png";
                var filePath = Path.Combine(tempPath, fileName);
                
                File.WriteAllBytes(filePath, message.Payload);
                _logger.LogInformation("Screenshot saved: {FilePath}", filePath);
                
                // Enqueue for upload (Smart upload will preserve folder structure)
                _uploadQueueProcessor.EnqueueFileAsync(filePath, CancellationToken.None);
                
                // Record success
                _healthMonitor.RecordScreenshotSuccess();
            }
            else
            {
                _logger.LogWarning("Received empty screenshot payload from session {SessionId}", sessionId);
                _healthMonitor.RecordScreenshotFailure();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process screenshot message");
            _healthMonitor.RecordScreenshotFailure();
        }
    }

    /// <summary>
    /// Handles ping/heartbeat response from Agent.
    /// </summary>
    private void HandlePingResponse(uint sessionId, PipeMessage message)
    {
        _logger.LogDebug(
            "Heartbeat response from session {SessionId}: ID={MessageId}, Time={CreatedUtc}",
            sessionId,
            message.MessageId,
            message.CreatedUtc);

        // TODO: Update session last-seen timestamp for monitoring
    }

    /// <summary>
    /// Handles audit log entries from Agent.
    /// </summary>
    private void HandleAuditLog(uint sessionId, PipeMessage message)
    {
        _logger.LogInformation(
            "Audit log from session {SessionId}: {SizeBytes} bytes, ID={MessageId}",
            sessionId,
            message.Payload?.Length ?? 0,
            message.MessageId);

        try
        {
            if (message.Payload != null && message.Payload.Length > 0)
            {
                var json = System.Text.Encoding.UTF8.GetString(message.Payload);
                var data = System.Text.Json.JsonSerializer.Deserialize<Vorsight.Core.Models.ActivityData>(json);
                
                if (data != null)
                {
                    _activityCoordinator.UpdateActivity(data);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse activity data from session {SessionId}", sessionId);
        }
    }

    /// <summary>
    /// Handles session connection events.
    /// </summary>
    private void OnSessionConnected(object sender, SessionConnectedEventArgs e)
    {
        _logger.LogDebug(
            "Agent session connected: SessionId={SessionId}, User={Username}",
            e.SessionId,
            e.Username ?? "(unknown)");
    }

    /// <summary>
    /// Handles session disconnection events.
    /// </summary>
    private void OnSessionDisconnected(object sender, SessionDisconnectedEventArgs e)
    {
        _logger.LogDebug(
            "Agent session disconnected: SessionId={SessionId}, Reason={Reason}",
            e.SessionId,
            e.Reason ?? "normal");
    }
}
