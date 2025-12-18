using Vorsight.Core.Audit;
using Vorsight.Core.IPC;
using Vorsight.Core.Scheduling;

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
    private readonly CancellationTokenSource _internalCts = new();

    public Worker(
        ILogger<Worker> logger,
        INamedPipeServer ipcServer,
        IScheduleManager scheduleManager,
        IAuditManager auditManager)
    {
        _logger = logger;
        _ipcServer = ipcServer;
        _scheduleManager = scheduleManager;
        _auditManager = auditManager;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Vörsight Service starting at {Time}", DateTimeOffset.Now);

        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, _internalCts.Token);
        var cancellationToken = linkedCts.Token;

        try
        {
            // Initialize components
            await _scheduleManager.InitializeAsync();
            await _auditManager.InitializeAsync();
            await _ipcServer.StartAsync();

            // Start enforcement
            await _scheduleManager.StartEnforcementAsync();

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

            // Start audit monitoring
            await _auditManager.StartMonitoringAsync();

            _logger.LogInformation("Vörsight Service initialized successfully");

            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    // Service health check every 30 seconds
                    await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken);

                    _logger.LogDebug("Service health check: OK");
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in service loop");
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
        }
        finally
        {
            await StopServiceAsync();
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Vörsight Service stopping");
        await StopServiceAsync();
        await base.StopAsync(cancellationToken);
    }

    private async Task StopServiceAsync()
    {
        try
        {
            _logger.LogInformation("Shutting down service components");

            // Stop audit monitoring
            await _auditManager.StopMonitoringAsync();

            // Stop enforcement
            await _scheduleManager.StopEnforcementAsync();

            // Stop IPC server
            await _ipcServer.StopAsync();

            // Cleanup
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
}
