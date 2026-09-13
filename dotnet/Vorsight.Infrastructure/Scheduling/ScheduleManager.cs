using System.Runtime.Versioning;
using Microsoft.Extensions.Logging;
using Vorsight.Contracts.Settings;
using Vorsight.Infrastructure.Contracts;
using Vorsight.Infrastructure.Extensions;
using Vorsight.Interop;

namespace Vorsight.Infrastructure.Scheduling;

[method: SupportedOSPlatform("windows")]
public class ScheduleManager(
    ILogger<ScheduleManager> logger,
    ISettingsManager settingsManager,
    IShutdownHelper shutdownHelper
) : IScheduleManager
{
    private AccessControlSettings? _currentSchedule;
    private CancellationTokenSource? _enforcementCts;
    private Task? _enforcementTask;
    private bool _disposed;

    public event EventHandler<AccessThresholdEventArgs>? AccessTimeExpiring;
    public event EventHandler<AccessThresholdEventArgs>? AccessTimeExpired;

    public bool IsEnforcementRunning { get; private set; }

    public async Task InitializeAsync()
    {
        ThrowIfDisposed();

        try
        {
            var settings = await settingsManager.GetSettingsAsync();
            _currentSchedule = settings.AccessControl;
            logger.LogInformation("Loaded schedule from SettingsManager");

            if (_currentSchedule.Enabled && !IsEnforcementRunning)
            {
                await StartEnforcementAsync();
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error initializing schedule");
        }
    }

    public async Task<AccessControlSettings> UpdateScheduleAsync(AccessControlSettings settings)
    {
        ThrowIfDisposed();

        if (settings == null)
            throw new ArgumentNullException(nameof(settings));

        _currentSchedule = settings;

        var fullSettings = await settingsManager.GetSettingsAsync();
        fullSettings.AccessControl = settings;
        await settingsManager.UpdateSettingsAsync(fullSettings);

        // Ensure enforcement
        if (_currentSchedule.Enabled && !IsEnforcementRunning)
        {
            await StartEnforcementAsync();
        }
        else if (!_currentSchedule.Enabled && IsEnforcementRunning)
        {
            await StopEnforcementAsync();
        }

        logger.LogInformation("Updated Access Control Settings in SettingsManager");

        return settings;
    }

    public async Task DeleteScheduleAsync()
    {
        ThrowIfDisposed();

        // "Delete" means disable
        if (_currentSchedule != null)
        {
            _currentSchedule.Enabled = false;

            var fullSettings = await settingsManager.GetSettingsAsync();
            fullSettings.AccessControl.Enabled = false;
            await settingsManager.UpdateSettingsAsync(fullSettings);
        }

        await StopEnforcementAsync();
        logger.LogInformation("Disabled schedule via SettingsManager");
    }

    public async Task<AccessControlSettings?> GetScheduleAsync()
    {
        ThrowIfDisposed();
        return await Task.FromResult(_currentSchedule);
    }

    public async Task<bool> IsAccessAllowedAsync()
    {
        ThrowIfDisposed();
        if (_currentSchedule == null || !_currentSchedule.Enabled)
            return await Task.FromResult(true);

        return await Task.FromResult(_currentSchedule.IsAccessAllowedNow());
    }

    public async Task<TimeSpan?> GetTimeRemainingAsync()
    {
        ThrowIfDisposed();
        return await Task.FromResult(_currentSchedule?.GetTimeRemaining());
    }

    public async Task<TimeSpan?> GetTimeUntilAccessAsync()
    {
        ThrowIfDisposed();
        return await Task.FromResult(_currentSchedule?.GetTimeUntilAccess());
    }

    public async Task<bool> ForceLogoffAsync()
    {
        ThrowIfDisposed();

        try
        {
            logger.LogWarning("Forcing logoff of interactive user");

            // Use TryForceLogoffInteractiveUser to target the console user session
            // (not the service's LocalSystem session)
            var result = shutdownHelper.TryForceLogoffInteractiveUser();

            if (result)
            {
                logger.LogInformation("Interactive user logoff initiated successfully");
                AccessTimeExpired?.Invoke(
                    this,
                    new AccessThresholdEventArgs { EventTime = DateTime.UtcNow }
                );
            }
            else
            {
                logger.LogError("Failed to force logoff interactive user (may not be logged in)");
            }

            return await Task.FromResult(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error forcing logoff");
            return false;
        }
    }

    public async Task PreventReloginAsync()
    {
        ThrowIfDisposed();
        await Task.CompletedTask;
    }

    public async Task StartEnforcementAsync()
    {
        ThrowIfDisposed();

        if (IsEnforcementRunning)
            return;

        _enforcementCts = new CancellationTokenSource();
        IsEnforcementRunning = true;
        _enforcementTask = EnforceSchedulesAsync(_enforcementCts.Token);

        logger.LogInformation("Schedule enforcement started");
        await Task.CompletedTask;
    }

    public async Task StopEnforcementAsync()
    {
        ThrowIfDisposed();

        if (!IsEnforcementRunning)
            return;

        _enforcementCts?.Cancel();
        IsEnforcementRunning = false;

        if (_enforcementTask != null)
        {
            try
            {
                await _enforcementTask;
            }
            catch (OperationCanceledException) { }
        }

        logger.LogInformation("Schedule enforcement stopped");
    }

    private async Task EnforceSchedulesAsync(CancellationToken cancellationToken)
    {
        var warningThreshold = TimeSpan.FromMinutes(5);
        var lastWarningTime = DateTime.MinValue;

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    // Enforce the single global schedule if it exists and is active
                    var schedule = _currentSchedule;

                    if (schedule != null && schedule.Enabled)
                    {
                        var timeRemaining = schedule.GetTimeRemaining();

                        if (timeRemaining.HasValue)
                        {
                            // Still within access window
                            if (
                                timeRemaining.Value < warningThreshold
                                && DateTime.UtcNow - lastWarningTime > TimeSpan.FromMinutes(1)
                            )
                            {
                                logger.LogWarning(
                                    "Access expiring soon: {TimeRemaining} remaining",
                                    timeRemaining.Value
                                );

                                AccessTimeExpiring?.Invoke(
                                    this,
                                    new AccessThresholdEventArgs
                                    {
                                        TimeRemaining = timeRemaining,
                                        EventTime = DateTime.UtcNow,
                                    }
                                );

                                lastWarningTime = DateTime.UtcNow;
                            }
                        }
                        else if (!schedule.IsAccessAllowedNow())
                        {
                            // Access time expired or outside window
                            logger.LogWarning(
                                "Access denied (Outside Allowed Hours). Action: {Action}",
                                schedule.ViolationAction
                            );

                            if (schedule.ViolationAction == ViolationAction.Shutdown)
                            {
                                // Initiate shutdown if not already shutting down
                                // 60 second warning to user
                                shutdownHelper.TryInitiateShutdown(
                                    0,
                                    "Computer usage time limit exceeded. System will shut down.",
                                    true
                                );
                            }
                            else
                            {
                                // Default to logoff
                                await ForceLogoffAsync();
                            }
                        }
                    }

                    // Check every minute
                    await Task.Delay(TimeSpan.FromMinutes(1), cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error in schedule enforcement loop");
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Schedule enforcement task failed");
        }
    }

    public async Task UpdateScheduleFromSettingsAsync(AccessControlSettings? settings)
    {
        ThrowIfDisposed();
        if (settings == null)
            return;

        _currentSchedule = settings;
        logger.LogInformation(
            "Schedule updated from Settings (Enabled: {Enabled})",
            _currentSchedule.Enabled
        );

        if (_currentSchedule.Enabled && !IsEnforcementRunning)
        {
            await StartEnforcementAsync();
        }
        else if (!_currentSchedule.Enabled && IsEnforcementRunning)
        {
            await StopEnforcementAsync();
        }
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(ScheduleManager));
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        try
        {
            StopEnforcementAsync().Wait();
            _enforcementCts?.Dispose();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error disposing ScheduleManager");
        }

        _disposed = true;
        GC.SuppressFinalize(this);
    }
}
