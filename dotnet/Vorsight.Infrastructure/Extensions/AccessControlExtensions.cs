using System;
using System.Linq;
using Vorsight.Contracts.Settings;

namespace Vorsight.Infrastructure.Extensions
{
    public static class AccessControlExtensions
    {
        public static bool IsAccessAllowedNow(this AccessControlSettings settings)
        {
            if (!settings.Enabled)
                return false; // Or true? AccessSchedule logic said: if (!Enabled) return false. Wait.
                // If "Enabled" means "Access Control Enabled", then if it's DISABLED, access should be ALLOWED (true).
                // AccessSchedule.cs 65: if (!Enabled) return false; -> This implies Enabled means "Schedule is Active/Allowed"?
                // Let's re-read AccessSchedule.cs.
                // Property: "Whether this schedule is currently active working (enabled)."
                // If schedule is NOT enabled, surely it means the restrictions are OFF, so access is allowed?
                // But the code says return false. This implies if schedule is disabled, NO ACCESS.
                // That sounds wrong for a parental control app "Enabling" restrictions.
                // However, let's stick to the existing logic OR check broader context. 
                // In ScheduleManager.cs: if (schedule != null && schedule.Enabled) { ... Enforce ... }
                // So if schedule.Enabled is false, enforcement skipped. 
                // But IsAccessAllowedNow is called inside enforcement loop?
                // Line 298: else if (!schedule.IsAccessAllowedNow()) { Access Denied }
                // This is only called IF schedule.Enabled is true.
                // So IsAccessAllowedNow assumes enforcement is active.
                
            try 
            {
                // MachineSettings doesn't have TimeZoneId. It uses local time implicitly?
                // AccessSchedule had TimeZoneId defaulting to Local.
                // We will use Local time.
                var now = DateTime.Now; // Local time
                
                var today = now.DayOfWeek;
                var timeNow = now.TimeOfDay;

                if (settings.Schedule == null) return false;

                // Check matches. Schedule windows from JSON are strings "HH:mm"
                return settings.Schedule.Any(w => 
                {
                    // AccessScheduleWindow has DayOfWeek (int), StartTime (string), EndTime (string)
                    if (w.DayOfWeek != (int)today) return false;
                    
                    if (!TimeSpan.TryParse(w.StartTime, out var start)) return false;
                    if (!TimeSpan.TryParse(w.EndTime, out var end)) return false;

                    return timeNow >= start && timeNow < end;
                });
            }
            catch
            {
                // Fail safe?
                return false;
            }
        }

        public static TimeSpan? GetTimeRemaining(this AccessControlSettings settings)
        {
            if (!settings.Enabled) return null;
            if (!settings.IsAccessAllowedNow()) return null;

            try 
            {
                var now = DateTime.Now;
                var timeNow = now.TimeOfDay;
                var today = (int)now.DayOfWeek;

                if (settings.Schedule == null) return null;

                var currentWindow = settings.Schedule
                    .Select(w => new { w, Start = ParseTime(w.StartTime), End = ParseTime(w.EndTime) })
                    .FirstOrDefault(x => 
                        x.w.DayOfWeek == today && 
                        timeNow >= x.Start && 
                        timeNow < x.End
                    );

                if (currentWindow != null)
                {
                    return currentWindow.End - timeNow;
                }
                return null;
            }
            catch
            {
                return null;
            }
        }

        public static TimeSpan? GetTimeUntilAccess(this AccessControlSettings settings)
        {
            if (!settings.Enabled) return null;
            if (settings.IsAccessAllowedNow()) return null;

            try 
            {
                var now = DateTime.Now;
                
                if (settings.Schedule == null || !settings.Schedule.Any()) return null;

                // Check next 7 days (including today)
                for (int i = 0; i < 8; i++) // Check up to a week
                {
                    var targetDate = now.Date.AddDays(i);
                    var targetDay = (int)targetDate.DayOfWeek;
                    var isToday = i == 0;
                    
                    var windows = settings.Schedule
                        .Where(w => w.DayOfWeek == targetDay)
                        .Select(w => new { Start = ParseTime(w.StartTime), End = ParseTime(w.EndTime) })
                        .OrderBy(w => w.Start);

                    foreach(var w in windows)
                    {
                        var startTime = targetDate.Add(w.Start);
                        if (startTime > now)
                        {
                            return startTime - now;
                        }
                    }
                }
                return null;
            }
            catch
            {
                return null;
            }
        }

        private static TimeSpan ParseTime(string t)
        {
            return TimeSpan.TryParse(t, out var ts) ? ts : TimeSpan.Zero;
        }
    }
}
