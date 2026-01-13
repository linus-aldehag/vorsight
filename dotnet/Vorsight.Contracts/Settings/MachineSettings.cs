namespace Vorsight.Contracts.Settings;

    public class MachineSettings
    {
        public NetworkSettings Network { get; set; } = new();
        public ScreenshotSettings Screenshots { get; set; } = new();
        public ActivitySettings Activity { get; set; } = new();
        public AuditSettings Audit { get; set; } = new();
        public AccessControlSettings AccessControl { get; set; } = new();
    }

    public class NetworkSettings
    {
        // For offline ping check
        public int PingIntervalSeconds { get; set; } = 300; // Check every 5 mins
    }

    public class ScreenshotSettings
    {
        public bool Enabled { get; set; } = false;
        public int IntervalSeconds { get; set; } = 300;
        public bool FilterDuplicates { get; set; } = true;
    }

    public class ActivitySettings
    {
        public bool Enabled { get; set; } = false;
        public int IntervalSeconds { get; set; } = 10;
    }

    public class AuditSettings
    {
        public bool Enabled { get; set; } = false;
        public AuditFilters Filters { get; set; } = new();
    }

    public class AuditFilters
    {
        public bool Security { get; set; } = true;
        public bool System { get; set; } = false;
        public bool Application { get; set; } = false;
    }

    public class AccessControlSettings
    {
        public bool Enabled { get; set; } = false;
        public string ViolationAction { get; set; } = "logoff"; // "logoff" or "shutdown"
        public List<AccessScheduleWindow> Schedule { get; set; } = new();
    }

    public class AccessScheduleWindow
    {
        public int DayOfWeek { get; set; } // 0=Sunday, 1=Monday...
        public string StartTime { get; set; } = "00:00";
        public string EndTime { get; set; } = "00:00";
    }
