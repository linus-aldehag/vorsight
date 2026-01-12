using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Vorsight.Interop;

using Vorsight.Infrastructure.Contracts;
using Vorsight.Contracts.Scheduling;
using Vorsight.Infrastructure.Identity;

namespace Vorsight.Infrastructure.Scheduling
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
        private readonly HttpClient? _httpClient;
        private readonly string? _serverUrl;
        private readonly string? _machineId;
        private AccessSchedule? _currentSchedule;
        private CancellationTokenSource? _enforcementCts;
        private Task? _enforcementTask;
        private bool _disposed;
        private bool _isEnforcementRunning;

        public event EventHandler<AccessThresholdEventArgs>? AccessTimeExpiring;
        public event EventHandler<AccessThresholdEventArgs>? AccessTimeExpired;

        public bool IsEnforcementRunning => _isEnforcementRunning;

        [System.Runtime.Versioning.SupportedOSPlatform("windows")]
        public ScheduleManager(
            ILogger<ScheduleManager> logger, 
            IHttpClientFactory? httpClientFactory = null,
            Microsoft.Extensions.Configuration.IConfiguration? configuration = null,
            string? schedulePath = null)
        {
            _logger = logger;
            _schedulePath = schedulePath ?? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "Vorsight",
                "access_schedule.json");
            
            if (httpClientFactory != null && configuration != null)
            {
                _httpClient = httpClientFactory.CreateClient();
                _serverUrl = configuration["Server:Url"] ?? "http://localhost:3000";
                _machineId = Vorsight.Infrastructure.Identity.MachineIdentity.GenerateMachineId();
                _httpClient.BaseAddress = new Uri(_serverUrl);
            }
        }

        public async Task InitializeAsync()
        {
            ThrowIfDisposed();

            try
            {
                // Only load from local file primarily
                // Remote schedule is pushed via UpdateScheduleFromJsonAsync
                
                if (File.Exists(_schedulePath))
                {
                    var json = await File.ReadAllTextAsync(_schedulePath);
                    _currentSchedule = JsonSerializer.Deserialize<AccessSchedule>(json);
                    
                    if (_currentSchedule != null)
                    {
                        _logger.LogInformation("Loaded schedule {ScheduleId} from file", 
                            _currentSchedule.ScheduleId);
                    }
                }
                else
                {
                    _logger.LogInformation("No schedule found (waiting for server update)");
                    Directory.CreateDirectory(Path.GetDirectoryName(_schedulePath)!);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing schedule");
            }
        }

        public async Task UpdateScheduleFromJsonAsync(string json)
        {
             ThrowIfDisposed();
             if (string.IsNullOrWhiteSpace(json) || json == "null") return;

             try 
             {
                 var scheduleData = JsonSerializer.Deserialize<ScheduleDataDto>(json);
                 if (scheduleData != null)
                 {
                     var newSchedule = ConvertToAccessSchedule(scheduleData);
                     if (newSchedule != null)
                     {
                         _currentSchedule = newSchedule;
                         await PersistScheduleAsync();
                         _logger.LogInformation("Schedule updated from server JSON (Active: {IsActive})", _currentSchedule.IsActive);
                     }
                 }
             }
             catch (Exception ex)
             {
                 _logger.LogError(ex, "Error updating schedule from JSON");
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
                _logger.LogWarning("Forcing logoff of interactive user");
                
                // Use TryForceLogoffInteractiveUser to target the console user session
                // (not the service's LocalSystem session)
                var result = ShutdownHelper.TryForceLogoffInteractiveUser();
                
                if (result)
                {
                    _logger.LogInformation("Interactive user logoff initiated successfully");
                    AccessTimeExpired?.Invoke(this, new AccessThresholdEventArgs
                    {
                        EventTime = DateTime.UtcNow
                    });
                }
                else
                {
                    _logger.LogError("Failed to force logoff interactive user (may not be logged in)");
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
                                _logger.LogWarning("Access denied (Outside Allowed Hours). Action: {Action}", schedule.ViolationAction);
                                
                                if (schedule.ViolationAction == AccessViolationAction.ShutDown)
                                {
                                    // Initiate shutdown if not already shutting down
                                    // 60 second warning to user
                                    ShutdownHelper.TryInitiateShutdown(0, "Computer usage time limit exceeded. System will shut down.", true, false);
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
                        _logger.LogError(ex, "Error in schedule enforcement loop");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Schedule enforcement task failed");
            }
        }

        /// <summary>
        /// Fetches schedule from Node.js server API.
        /// </summary>
        private async Task<ScheduleDataDto?> FetchScheduleFromServerAsync()
        {
            if (_httpClient == null || string.IsNullOrEmpty(_machineId))
                return null;
                
            try
            {
                var url = $"/api/schedule?machineId={_machineId}";
                var response = await _httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to fetch schedule from server: {Status}", response.StatusCode);
                    return null;
                }
                    
                var json = await response.Content.ReadAsStringAsync();
                if (string.IsNullOrWhiteSpace(json) || json == "null")
                    return null;
                    
                var scheduleData = JsonSerializer.Deserialize<ScheduleDataDto>(json);
                return scheduleData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching schedule from server");
                return null;
            }
        }

        /// <summary>
        /// Converts server DTO format to C# AccessSchedule.
        /// </summary>
        private AccessSchedule? ConvertToAccessSchedule(ScheduleDataDto? data)
        {
            if (data == null)
                return null;
                
            try
            {
                var schedule = new AccessSchedule
                {
                    ScheduleId = data.ScheduleId ?? Guid.NewGuid().ToString(),
                    IsActive = data.IsActive,
                    TimeZoneId = TimeZoneInfo.Local.Id,
                    AllowedTimeWindows = new List<AccessWindow>()
                };

                if (data.AllowedTimeWindows != null)
                {
                    foreach (var window in data.AllowedTimeWindows)
                    {
                        // Map DayOfWeek (assuming server sends 0-6 matching DayOfWeek enum or similar)
                        // If window.DayOfWeek is int, cast it.
                        if (Enum.IsDefined(typeof(DayOfWeek), window.DayOfWeek))
                        {
                            schedule.AllowedTimeWindows.Add(new AccessWindow
                            {
                                DayOfWeek = (DayOfWeek)window.DayOfWeek,
                                StartTime = ParseTime(window.StartTime),
                                EndTime = ParseTime(window.EndTime)
                            });
                        }
                    }
                }
                
                return schedule;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting schedule data");
                return null;
            }
        }

        private TimeSpan ParseTime(string? timeStr)
        {
            if (string.IsNullOrWhiteSpace(timeStr)) return TimeSpan.Zero;
            
            // Handle "HH" or "H" format which TimeSpan.Parse treats as days
            if (int.TryParse(timeStr, out int hours) && !timeStr.Contains(":"))
            {
                return TimeSpan.FromHours(hours);
            }
            
            return TimeSpan.Parse(timeStr);
        }

        /// <summary>
        /// Reloads schedule from server (called by WebSocket event handlers).
        /// </summary>
        public async Task ReloadScheduleFromServerAsync()
        {
            try
            {
                var scheduleData = await FetchScheduleFromServerAsync();
                if (scheduleData != null)
                {
                    _currentSchedule = ConvertToAccessSchedule(scheduleData);
                    _logger.LogInformation("Schedule reloaded from server (Active: {IsActive}, {WindowCount} windows)",
                        _currentSchedule?.IsActive ?? false,
                        _currentSchedule?.AllowedTimeWindows?.Count ?? 0);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reloading schedule from server");
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

