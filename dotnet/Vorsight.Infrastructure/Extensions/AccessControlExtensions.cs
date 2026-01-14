using System;
using System.Linq;
using Vorsight.Contracts.Settings;
using System.Collections.Generic;

// Alias to avoid conflict if the generated enum is named DayOfWeek
using ContractDay = Vorsight.Contracts.Settings.DayOfWeek;

namespace Vorsight.Infrastructure.Extensions
{
    public static class AccessControlExtensions
    {
        public static bool IsAccessAllowedNow(this AccessControlSettings settings)
        {
            if (!settings.Enabled)
                return false; 
                
            try 
            {
                var now = DateTime.Now; // Local time
                var today = now.DayOfWeek;
                var timeNow = now.TimeOfDay;

                if (settings.Schedule == null) return false;

                // Check matches. 
                return settings.Schedule.Any(w => 
                {
                    if (ToSystemDay(w.DayOfWeek) != today) return false;
                    
                    if (!TimeSpan.TryParse(w.StartTime, out var start)) return false;
                    if (!TimeSpan.TryParse(w.EndTime, out var end)) return false;

                    return timeNow >= start && timeNow < end;
                });
            }
            catch
            {
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
                var today = now.DayOfWeek;

                if (settings.Schedule == null) return null;

                var currentWindow = settings.Schedule
                    .Where(w => ToSystemDay(w.DayOfWeek) == today)
                    .Select(w => new { Start = ParseTime(w.StartTime), End = ParseTime(w.EndTime) })
                    .FirstOrDefault(x => 
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
                for (int i = 0; i < 8; i++) 
                {
                    var targetDate = now.Date.AddDays(i);
                    var targetDay = targetDate.DayOfWeek;
                    
                    var windows = settings.Schedule
                        .Where(w => ToSystemDay(w.DayOfWeek) == targetDay)
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

        private static System.DayOfWeek ToSystemDay(ContractDay contractDay)
        {
            return contractDay switch
            {
                ContractDay.Monday => System.DayOfWeek.Monday,
                ContractDay.Tuesday => System.DayOfWeek.Tuesday,
                ContractDay.Wednesday => System.DayOfWeek.Wednesday,
                ContractDay.Thursday => System.DayOfWeek.Thursday,
                ContractDay.Friday => System.DayOfWeek.Friday,
                ContractDay.Saturday => System.DayOfWeek.Saturday,
                ContractDay.Sunday => System.DayOfWeek.Sunday,
                _ => System.DayOfWeek.Monday // Default
            };
        }
    }
}
