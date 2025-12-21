using System;

namespace Vorsight.Core.Scheduling
{
    /// <summary>
    /// Represents a child's computer access schedule.
    /// Defines when the child can use the computer.
    /// </summary>
    public class AccessSchedule
    {
        /// <summary>
        /// Unique identifier for this schedule.
        /// </summary>
        public string ScheduleId { get; set; }

        /// <summary>
        /// Start time of access window (24-hour format, UTC).
        /// </summary>
        public TimeSpan StartTime { get; set; }

        /// <summary>
        /// End time of access window (24-hour format, UTC).
        /// </summary>
        public TimeSpan EndTime { get; set; }

        /// <summary>
        /// Whether this schedule is currently active/enforced.
        /// </summary>
        public bool IsActive { get; set; }

        /// <summary>
        /// Time zone identifier (e.g., "Eastern Standard Time").
        /// Used for schedule calculations relative to user's local time.
        /// </summary>
        public string TimeZoneId { get; set; }

        public AccessSchedule()
        {
            ScheduleId = Guid.NewGuid().ToString();
            TimeZoneId = TimeZoneInfo.Local.Id;
            StartTime = TimeSpan.FromHours(9);  // 9 AM
            EndTime = TimeSpan.FromHours(22);   // 10 PM
        }

        /// <summary>
        /// Checks if current time is within allowed access window.
        /// </summary>
        public bool IsAccessAllowedNow()
        {
            if (!IsActive)
                return false;

            var tz = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
            var now = TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);

            var currentTime = now.TimeOfDay;
            return currentTime >= StartTime && currentTime < EndTime;
        }

        /// <summary>
        /// Gets the time until this access window opens (null if currently open).
        /// </summary>
        public TimeSpan? GetTimeUntilAccess()
        {
            if (!IsActive)
                return null;

            var tz = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
            var now = TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
            var currentTime = now.TimeOfDay;

            // If within access window, return null
            if (currentTime >= StartTime && currentTime < EndTime)
                return null;

            // If before start time today, return time until start
            if (currentTime < StartTime)
                return StartTime - currentTime;

            // After end time, find next allowed day - which is TOMORROW since we removed AllowedDays
            var nextDay = now.AddDays(1);
            var nextAccessTime = nextDay.Date.Add(StartTime);
            return nextAccessTime - now;
        }

        /// <summary>
        /// Gets the time remaining in current access window.
        /// </summary>
        public TimeSpan? GetTimeRemaining()
        {
            if (!IsAccessAllowedNow())
                return null;

            var tz = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
            var now = TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
            var timeUntilEnd = EndTime - now.TimeOfDay;

            return timeUntilEnd > TimeSpan.Zero ? timeUntilEnd : null;
        }
    }
}

