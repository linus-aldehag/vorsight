using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Vorsight.Core.Scheduling
{
    /// <summary>
    /// Interface for managing access schedules and enforcing access time limits.
    /// The "Threshold" - when time is up, force logoff via ExitWindowsEx.
    /// </summary>
    public interface IScheduleManager : IDisposable
    {
        /// <summary>
        /// Loads all schedules from persistent storage.
        /// </summary>
        Task InitializeAsync();

        /// <summary>
        /// Creates a new access schedule for a child.
        /// </summary>
        Task<AccessSchedule> CreateScheduleAsync(AccessSchedule schedule);

        /// <summary>
        /// Updates an existing schedule.
        /// </summary>
        Task<AccessSchedule> UpdateScheduleAsync(AccessSchedule schedule);

        /// <summary>
        /// Deletes a schedule.
        /// </summary>
        Task DeleteScheduleAsync(string scheduleId);

        /// <summary>
        /// Gets schedule for a specific child username.
        /// </summary>
        Task<AccessSchedule> GetScheduleAsync(string childUsername);

        /// <summary>
        /// Gets all active schedules.
        /// </summary>
        Task<IEnumerable<AccessSchedule>> GetAllSchedulesAsync();

        /// <summary>
        /// Checks if a child currently has access.
        /// </summary>
        Task<bool> IsAccessAllowedAsync(string childUsername);

        /// <summary>
        /// Gets time remaining in current access window.
        /// </summary>
        Task<TimeSpan?> GetTimeRemainingAsync(string childUsername);

        /// <summary>
        /// Gets time until next access window opens.
        /// </summary>
        Task<TimeSpan?> GetTimeUntilAccessAsync(string childUsername);

        /// <summary>
        /// Forces logoff for a child account.
        /// This is "The Threshold" in action - called when access time expires.
        /// </summary>
        Task<bool> ForceLogoffAsync(string childUsername);

        /// <summary>
        /// Prevents re-login by locking the user account or setting policies.
        /// Called after ForceLogoff to maintain the lock.
        /// </summary>
        Task PreventReloginAsync(string childUsername);

        /// <summary>
        /// Event raised when access time is about to expire (e.g., 5 min warning).
        /// </summary>
        event EventHandler<AccessThresholdEventArgs> AccessTimeExpiring;

        /// <summary>
        /// Event raised when access time has expired.
        /// </summary>
        event EventHandler<AccessThresholdEventArgs> AccessTimeExpired;

        /// <summary>
        /// Starts the schedule enforcement engine (background polling).
        /// </summary>
        Task StartEnforcementAsync();

        /// <summary>
        /// Stops the schedule enforcement engine.
        /// </summary>
        Task StopEnforcementAsync();

        /// <summary>
        /// Whether enforcement is currently running.
        /// </summary>
        bool IsEnforcementRunning { get; }
    }

    /// <summary>
    /// Event args for access threshold events.
    /// </summary>
    public class AccessThresholdEventArgs : EventArgs
    {
        public string ChildUsername { get; set; }
        public uint SessionId { get; set; }
        public TimeSpan? TimeRemaining { get; set; }
        public DateTime EventTime { get; set; }
    }
}

