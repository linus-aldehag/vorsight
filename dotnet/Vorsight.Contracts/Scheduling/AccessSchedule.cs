using System;

namespace Vorsight.Contracts.Scheduling
{
    /// <summary>
    /// Represents a child's computer access schedule.
    /// Defines when the child can use the computer.
    /// </summary>
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
        /// List of allowed time windows.
        /// If empty, access is denied (unless default policy changes).
        /// </summary>
        public List<AccessWindow> AllowedTimeWindows { get; set; } = new();

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
            ViolationAction = AccessViolationAction.LogOff;
            
            // Default: 9-5 Mon-Fri
            for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
            {
                AllowedTimeWindows.Add(new AccessWindow
                {
                    DayOfWeek = day,
                    StartTime = TimeSpan.FromHours(8),
                    EndTime = TimeSpan.FromHours(22)
                });
            }
        }

        /// <summary>
        /// Action to take when access is denied (e.g. LogOff, ShutDown).
        /// </summary>
        public AccessViolationAction ViolationAction { get; set; }

        /// <summary>
        /// Checks if current time is within allowed access window.
        /// </summary>
        public bool IsAccessAllowedNow()
        {
            if (!IsActive)
                return false;
                
            try 
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
                var now = TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
                
                // Check if ANY window matches today
                var today = now.DayOfWeek;
                var timeNow = now.TimeOfDay;

                return AllowedTimeWindows.Any(w => 
                    w.DayOfWeek == today && 
                    timeNow >= w.StartTime && 
                    timeNow < w.EndTime
                );
            }
            catch
            {
                // Fallback to UTC if timezone invalid
                var now = DateTime.UtcNow;
                return AllowedTimeWindows.Any(w => 
                    w.DayOfWeek == now.DayOfWeek && 
                    now.TimeOfDay >= w.StartTime && 
                    now.TimeOfDay < w.EndTime
                );
            }
        }

        /// <summary>
        /// Gets the time until this access window opens (null if currently open).
        /// </summary>
        public TimeSpan? GetTimeUntilAccess()
        {
            if (!IsActive) return null; // Logic parity with previous: if inactive, return null (undefined?)

            // This logic is complex with multiple windows. 
            // Simplified: Find the NEXT start time from NOW.
            
            try 
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
                var now = TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
                
                // 1. Check if allowed NOW
                if (IsAccessAllowedNow()) return null;

                // 2. Sort windows by Day/Time
                // This is a bit heavy for a property getter but harmless for this scale
                // Check today's remaining windows
                var timeNow = now.TimeOfDay;
                var nextWindowToday = AllowedTimeWindows
                    .Where(w => w.DayOfWeek == now.DayOfWeek && w.StartTime > timeNow)
                    .OrderBy(w => w.StartTime)
                    .FirstOrDefault();

                if (nextWindowToday != null)
                {
                    return nextWindowToday.StartTime - timeNow;
                }

                // 3. Check subsequent days
                for (int i = 1; i <= 7; i++)
                {
                    var checkDay = (DayOfWeek)(((int)now.DayOfWeek + i) % 7);
                    var firstWindowOnDay = AllowedTimeWindows
                        .Where(w => w.DayOfWeek == checkDay)
                        .OrderBy(w => w.StartTime)
                        .FirstOrDefault();

                    if (firstWindowOnDay != null)
                    {
                        var daysUntil = i;
                        // Time until midnight today + (days-1 full days) + startTime
                        // Easier: 
                        var targetDate = now.Date.AddDays(i).Add(firstWindowOnDay.StartTime);
                        return targetDate - now;
                    }
                }

                // No allowed windows ever?
                return null;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Gets the time remaining in current access window.
        /// </summary>
        public TimeSpan? GetTimeRemaining()
        {
            if (!IsAccessAllowedNow()) return null;

            try 
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
                var now = TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
                var timeNow = now.TimeOfDay;

                // Find the specific window we are in
                var currentWindow = AllowedTimeWindows
                    .FirstOrDefault(w => 
                        w.DayOfWeek == now.DayOfWeek && 
                        timeNow >= w.StartTime && 
                        timeNow < w.EndTime
                    );

                if (currentWindow != null)
                {
                    return currentWindow.EndTime - timeNow;
                }
                return null;
            }
            catch
            {
                return null;
            }
        }
    }

    public class AccessWindow
    {
        public DayOfWeek DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }

    /// <summary>
    /// Action to perform when access control violation occurs (time expired).
    /// </summary>
    public enum AccessViolationAction
    {
        LogOff = 0,
        ShutDown = 1
    }
}

