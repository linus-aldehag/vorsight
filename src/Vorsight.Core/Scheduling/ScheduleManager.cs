using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
    /// </summary>
    public class ScheduleManager : IScheduleManager
    {
        private readonly ILogger<ScheduleManager> _logger;
        private readonly string _schedulePath;
        private readonly ConcurrentDictionary<string, AccessSchedule> _schedules = new();
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
                "schedules.json");
        }

        public async Task InitializeAsync()
        {
            ThrowIfDisposed();

            try
            {
                if (File.Exists(_schedulePath))
                {
                    var json = await File.ReadAllTextAsync(_schedulePath);
                    var schedules = JsonSerializer.Deserialize<List<AccessSchedule>>(json);
                    
                    foreach (var schedule in schedules)
                    {
                        _schedules.TryAdd(schedule.ScheduleId, schedule);
                    }

                    _logger.LogInformation("Loaded {ScheduleCount} schedules from {Path}", 
                        schedules.Count, _schedulePath);
                }
                else
                {
                    _logger.LogInformation("No schedules file found at {Path}", _schedulePath);
                    Directory.CreateDirectory(Path.GetDirectoryName(_schedulePath));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing schedules");
                throw;
            }
        }

        public async Task<AccessSchedule> CreateScheduleAsync(AccessSchedule schedule)
        {
            ThrowIfDisposed();

            if (schedule == null)
                throw new ArgumentNullException(nameof(schedule));

            schedule.ScheduleId ??= Guid.NewGuid().ToString();
            schedule.CreatedUtc = DateTime.UtcNow;
            schedule.ModifiedUtc = DateTime.UtcNow;

            if (!_schedules.TryAdd(schedule.ScheduleId, schedule))
                throw new InvalidOperationException($"Schedule {schedule.ScheduleId} already exists");

            await PersistSchedulesAsync();
            _logger.LogInformation("Created schedule {ScheduleId} for {ChildUsername}", 
                schedule.ScheduleId, schedule.ChildUsername);

            return schedule;
        }

        public async Task<AccessSchedule> UpdateScheduleAsync(AccessSchedule schedule)
        {
            ThrowIfDisposed();

            if (schedule == null)
                throw new ArgumentNullException(nameof(schedule));

            schedule.ModifiedUtc = DateTime.UtcNow;

            if (!_schedules.TryUpdate(schedule.ScheduleId, schedule, _schedules[schedule.ScheduleId]))
                throw new InvalidOperationException($"Schedule {schedule.ScheduleId} not found");

            await PersistSchedulesAsync();
            _logger.LogInformation("Updated schedule {ScheduleId}", schedule.ScheduleId);

            return schedule;
        }

        public async Task DeleteScheduleAsync(string scheduleId)
        {
            ThrowIfDisposed();

            if (!_schedules.TryRemove(scheduleId, out _))
                throw new InvalidOperationException($"Schedule {scheduleId} not found");

            await PersistSchedulesAsync();
            _logger.LogInformation("Deleted schedule {ScheduleId}", scheduleId);
        }

        public async Task<AccessSchedule> GetScheduleAsync(string childUsername)
        {
            ThrowIfDisposed();

            var schedule = _schedules.Values.FirstOrDefault(s => s.ChildUsername == childUsername);
            return await Task.FromResult(schedule);
        }

        public async Task<IEnumerable<AccessSchedule>> GetAllSchedulesAsync()
        {
            ThrowIfDisposed();
            return await Task.FromResult(_schedules.Values.ToList());
        }

        public async Task<bool> IsAccessAllowedAsync(string childUsername)
        {
            ThrowIfDisposed();

            var schedule = await GetScheduleAsync(childUsername);
            if (schedule == null)
                return false;

            return await Task.FromResult(schedule.IsAccessAllowedNow());
        }

        public async Task<TimeSpan?> GetTimeRemainingAsync(string childUsername)
        {
            ThrowIfDisposed();

            var schedule = await GetScheduleAsync(childUsername);
            return await Task.FromResult(schedule?.GetTimeRemaining());
        }

        public async Task<TimeSpan?> GetTimeUntilAccessAsync(string childUsername)
        {
            ThrowIfDisposed();

            var schedule = await GetScheduleAsync(childUsername);
            return await Task.FromResult(schedule?.GetTimeUntilAccess());
        }

        public async Task<bool> ForceLogoffAsync(string childUsername)
        {
            ThrowIfDisposed();

            try
            {
                _logger.LogWarning("Forcing logoff for {ChildUsername}", childUsername);
                
                // Force logoff using Windows API
                var result = ShutdownHelper.TryForceLogoff();
                
                if (result)
                {
                    _logger.LogInformation("Logoff initiated for {ChildUsername}", childUsername);
                    AccessTimeExpired?.Invoke(this, new AccessThresholdEventArgs
                    {
                        ChildUsername = childUsername,
                        EventTime = DateTime.UtcNow
                    });
                }
                else
                {
                    _logger.LogError("Failed to force logoff for {ChildUsername}", childUsername);
                }

                return await Task.FromResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error forcing logoff for {ChildUsername}", childUsername);
                return false;
            }
        }

        public async Task PreventReloginAsync(string childUsername)
        {
            ThrowIfDisposed();

            try
            {
                _logger.LogInformation("Preventing re-login for {ChildUsername}", childUsername);
                
                // Note: In production, this would involve account lockout policies
                // For now, just log the action
                
                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error preventing re-login for {ChildUsername}", childUsername);
            }
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
                catch (OperationCanceledException)
                {
                    // Expected
                }
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
                        foreach (var schedule in _schedules.Values.Where(s => s.IsActive))
                        {
                            var timeRemaining = schedule.GetTimeRemaining();

                            if (timeRemaining.HasValue)
                            {
                                // Still within access window
                                if (timeRemaining.Value < warningThreshold && 
                                    DateTime.UtcNow - lastWarningTime > TimeSpan.FromMinutes(1))
                                {
                                    _logger.LogWarning(
                                        "Access expiring soon for {ChildUsername}: {TimeRemaining} remaining",
                                        schedule.ChildUsername, timeRemaining.Value);

                                    AccessTimeExpiring?.Invoke(this, new AccessThresholdEventArgs
                                    {
                                        ChildUsername = schedule.ChildUsername,
                                        TimeRemaining = timeRemaining,
                                        EventTime = DateTime.UtcNow
                                    });

                                    lastWarningTime = DateTime.UtcNow;
                                }
                            }
                            else if (!schedule.IsAccessAllowedNow())
                            {
                                // Access time expired or outside window
                                _logger.LogWarning("Access denied for {ChildUsername} (Outside Allowed Hours)", 
                                    schedule.ChildUsername);

                                await ForceLogoffAsync(schedule.ChildUsername);
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

        private async Task PersistSchedulesAsync()
        {
            try
            {
                var directory = Path.GetDirectoryName(_schedulePath);
                Directory.CreateDirectory(directory);

                var json = JsonSerializer.Serialize(_schedules.Values.ToList(), new JsonSerializerOptions
                {
                    WriteIndented = true
                });

                await File.WriteAllTextAsync(_schedulePath, json);
                _logger.LogDebug("Schedules persisted to {Path}", _schedulePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error persisting schedules");
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

