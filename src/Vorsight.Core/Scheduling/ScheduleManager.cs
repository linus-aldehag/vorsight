using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Vorsight.Native;

namespace Vorsight.Core.Scheduling
{
    /// <summary>
    /// Implementation of schedule management and enforcement.
    /// Monitors access windows and enforces logoff when time expires.
    /// Manages a SINGLE global schedule for the machine.
    /// </summary>
    public class ScheduleManager : IScheduleManager
    {
        private readonly ILogger<ScheduleManager> _logger;
        private readonly string _schedulePath;
        private AccessSchedule? _currentSchedule;
        private CancellationTokenSource? _enforcementCts;
        private Task? _enforcementTask;
        private bool _disposed;
        private bool _isEnforcementRunning;

        public event EventHandler<AccessThresholdEventArgs>? AccessTimeExpiring;
        public event EventHandler<AccessThresholdEventArgs>? AccessTimeExpired;

        public bool IsEnforcementRunning => _isEnforcementRunning;

        public ScheduleManager(ILogger<ScheduleManager> logger, string schedulePath = null)
        {
            _logger = logger;
            _schedulePath = schedulePath ?? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "Vorsight",
                "access_schedule.json");
        }

        public async Task InitializeAsync()
        {
            ThrowIfDisposed();

            try
            {
                if (File.Exists(_schedulePath))
                {
                    var json = await File.ReadAllTextAsync(_schedulePath);
                    _currentSchedule = JsonSerializer.Deserialize<AccessSchedule>(json);
                    
                    if (_currentSchedule != null)
                    {
                        _logger.LogInformation("Loaded schedule {ScheduleId} from {Path}", 
                            _currentSchedule.ScheduleId, _schedulePath);
                    }
                }
                else
                {
                    _logger.LogInformation("No schedule file found at {Path}", _schedulePath);
                    Directory.CreateDirectory(Path.GetDirectoryName(_schedulePath)!);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing schedule");
                // Don't throw, just start empty
            }
        }

        public async Task<AccessSchedule> CreateScheduleAsync(AccessSchedule schedule)
        {
            ThrowIfDisposed();

            if (schedule == null)
                throw new ArgumentNullException(nameof(schedule));

            schedule.ScheduleId ??= Guid.NewGuid().ToString();
            
            _currentSchedule = schedule;

            await PersistScheduleAsync();
            _logger.LogInformation("Created/Overwrote schedule {ScheduleId}", schedule.ScheduleId);

            return schedule;
        }

        public async Task<AccessSchedule> UpdateScheduleAsync(AccessSchedule schedule)
        {
            ThrowIfDisposed();

            if (schedule == null)
                throw new ArgumentNullException(nameof(schedule));

            _currentSchedule = schedule;

            await PersistScheduleAsync();
            _logger.LogInformation("Updated schedule {ScheduleId}", schedule.ScheduleId);

            return schedule;
        }

        public async Task DeleteScheduleAsync(string scheduleId)
        {
            ThrowIfDisposed();

            _currentSchedule = null;
            
            try
            {
                if (File.Exists(_schedulePath))
                    File.Delete(_schedulePath);
            }
            catch (Exception ex) 
            {
                _logger.LogError(ex, "Error deleting schedule file");
            }

            _logger.LogInformation("Deleted schedule");
            await Task.CompletedTask;
        }

        public async Task<AccessSchedule?> GetScheduleAsync()
        {
            ThrowIfDisposed();
            return await Task.FromResult(_currentSchedule);
        }

        public async Task<IEnumerable<AccessSchedule>> GetAllSchedulesAsync()
        {
            ThrowIfDisposed();
            if (_currentSchedule != null)
                return await Task.FromResult(new[] { _currentSchedule });
            return await Task.FromResult(Array.Empty<AccessSchedule>());
        }

        public async Task<bool> IsAccessAllowedAsync()
        {
            ThrowIfDisposed();

            if (_currentSchedule == null)
                return false;
            
            return await Task.FromResult(_currentSchedule?.IsAccessAllowedNow() ?? true); 
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
                _logger.LogWarning("Forcing logoff");
                
                var result = ShutdownHelper.TryForceLogoff();
                
                if (result)
                {
                    _logger.LogInformation("Logoff initiated");
                    AccessTimeExpired?.Invoke(this, new AccessThresholdEventArgs
                    {
                        EventTime = DateTime.UtcNow
                    });
                }
                else
                {
                    _logger.LogError("Failed to force logoff");
                }

                return await Task.FromResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error forcing logoff");
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

            if (_isEnforcementRunning)
                return;

            _enforcementCts = new CancellationTokenSource();
            _isEnforcementRunning = true;
            _enforcementTask = EnforceSchedulesAsync(_enforcementCts.Token);

            _logger.LogInformation("Schedule enforcement started");
            await Task.CompletedTask;
        }

        public async Task StopEnforcementAsync()
        {
            ThrowIfDisposed();

            if (!_isEnforcementRunning)
                return;

            _enforcementCts?.Cancel();
            _isEnforcementRunning = false;

            if (_enforcementTask != null)
            {
                try
                {
                    await _enforcementTask;
                }
                catch (OperationCanceledException) { }
            }

            _logger.LogInformation("Schedule enforcement stopped");
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

                        if (schedule != null && schedule.IsActive)
                        {
                            var timeRemaining = schedule.GetTimeRemaining();

                            if (timeRemaining.HasValue)
                            {
                                // Still within access window
                                if (timeRemaining.Value < warningThreshold && 
                                    DateTime.UtcNow - lastWarningTime > TimeSpan.FromMinutes(1))
                                {
                                    _logger.LogWarning(
                                        "Access expiring soon: {TimeRemaining} remaining",
                                        timeRemaining.Value);

                                    AccessTimeExpiring?.Invoke(this, new AccessThresholdEventArgs
                                    {
                                        TimeRemaining = timeRemaining,
                                        EventTime = DateTime.UtcNow
                                    });

                                    lastWarningTime = DateTime.UtcNow;
                                }
                            }
                            else if (!schedule.IsAccessAllowedNow())
                            {
                                // Access time expired or outside window
                                _logger.LogWarning("Access denied (Outside Allowed Hours)");
                                await ForceLogoffAsync();
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
                        _logger.LogError(ex, "Error in schedule enforcement loop");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Schedule enforcement task failed");
            }
        }

        private async Task PersistScheduleAsync()
        {
            try
            {
                if (_currentSchedule == null) return;

                var directory = Path.GetDirectoryName(_schedulePath);
                if (directory != null) Directory.CreateDirectory(directory);

                var json = JsonSerializer.Serialize(_currentSchedule, new JsonSerializerOptions
                {
                    WriteIndented = true
                });

                await File.WriteAllTextAsync(_schedulePath, json);
                _logger.LogDebug("Schedule persisted to {Path}", _schedulePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error persisting schedule");
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
                _logger.LogError(ex, "Error disposing ScheduleManager");
            }

            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }
}

