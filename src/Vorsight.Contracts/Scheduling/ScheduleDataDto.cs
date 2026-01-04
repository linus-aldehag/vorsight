using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Vorsight.Contracts.Scheduling
{
    /// <summary>
    /// DTO for schedule data from Node.js server API.
    /// Matches the format stored in the server database.
    /// </summary>
    public class ScheduleDataDto
    {
        [JsonPropertyName("scheduleId")]
        public string? ScheduleId { get; set; }

        [JsonPropertyName("childUsername")]
        public string? ChildUsername { get; set; }

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; }

        [JsonPropertyName("allowedTimeWindows")]
        public List<TimeWindowDto>? AllowedTimeWindows { get; set; }

        [JsonPropertyName("dailyTimeLimitMinutes")]
        public int DailyTimeLimitMinutes { get; set; }

        [JsonPropertyName("weekendBonusMinutes")]
        public int WeekendBonusMinutes { get; set; }

        [JsonPropertyName("createdUtc")]
        public string? CreatedUtc { get; set; }

        [JsonPropertyName("modifiedUtc")]
        public string? ModifiedUtc { get; set; }
    }

    /// <summary>
    /// DTO for time window from server API.
    /// </summary>
    public class TimeWindowDto
    {
        [JsonPropertyName("dayOfWeek")]
        public int DayOfWeek { get; set; }

        [JsonPropertyName("startTime")]
        public string StartTime { get; set; } = "08:00";

        [JsonPropertyName("endTime")]
        public string EndTime { get; set; } = "22:00";
    }
}
