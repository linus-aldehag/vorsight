using System;

namespace Vorsight.Core.Audit
{
    /// <summary>
    /// Represents audit event filters for Windows Event Log monitoring.
    /// Used to detect admin tampering and suspicious activity.
    /// </summary>
    public class AuditEventFilter
    {
        /// <summary>
        /// Event log sources to monitor.
        /// </summary>
        public enum EventLogSource
        {
            Security,
            System,
            Application
        }

        /// <summary>
        /// Critical event IDs for parental control tampering detection.
        /// </summary>
        public static class CriticalEventIds
        {
            /// <summary>
            /// Event ID 4720: A user account was created.
            /// Could indicate attempt to create admin account.
            /// </summary>
            public const int UserAccountCreated = 4720;

            /// <summary>
            /// Event ID 4728: A member was added to a security-enabled global group.
            /// Could indicate attempt to elevate child account privileges.
            /// </summary>
            public const int GroupMembershipAdded = 4728;

            /// <summary>
            /// Event ID 4732: A member was added to a security-enabled local group.
            /// Could indicate attempt to add child to Administrators group.
            /// </summary>
            public const int LocalGroupMembershipAdded = 4732;

            /// <summary>
            /// Event ID 4738: A user account was changed.
            /// Could indicate password change or other account modifications.
            /// </summary>
            public const int UserAccountChanged = 4738;

            /// <summary>
            /// Event ID 4722: A user account was enabled.
            /// Could indicate re-enabling of disabled account.
            /// </summary>
            public const int UserAccountEnabled = 4722;

            /// <summary>
            /// Event ID 4649: A replay attack was detected.
            /// Suspicious security event.
            /// </summary>
            public const int ReplayAttackDetected = 4649;

            /// <summary>
            /// Event ID 4675: SPN audit logging failure.
            /// Indicates possible privilege elevation attempt.
            /// </summary>
            public const int SpaAuditingFailure = 4675;
        }

        public string FilterId { get; set; }
        public EventLogSource Source { get; set; }
        public int EventId { get; set; }
        public string Description { get; set; }
        public bool IsEnabled { get; set; }
        public string TargetUsername { get; set; }
        public DateTime CreatedUtc { get; set; }

        /// <summary>
        /// Severity levels for audit events.
        /// </summary>
        public enum EventSeverity
        {
            Info = 0,
            Warning = 1,
            Error = 2,
            Critical = 3
        }

        public EventSeverity Severity { get; set; }

        public AuditEventFilter()
        {
            FilterId = Guid.NewGuid().ToString();
            CreatedUtc = DateTime.UtcNow;
            IsEnabled = true;
        }

        public static AuditEventFilter CreateCriticalAdminTamperingFilter()
        {
            return new AuditEventFilter
            {
                Description = "Admin Account Creation Detected",
                Source = EventLogSource.Security,
                EventId = CriticalEventIds.UserAccountCreated,
                Severity = EventSeverity.Critical,
                IsEnabled = true
            };
        }

        public static AuditEventFilter CreateGroupMembershipFilter()
        {
            return new AuditEventFilter
            {
                Description = "Global Group Membership Change",
                Source = EventLogSource.Security,
                EventId = CriticalEventIds.GroupMembershipAdded,
                Severity = EventSeverity.Critical,
                IsEnabled = true
            };
        }
    }

    /// <summary>
    /// Represents an audit event from Windows Event Log.
    /// </summary>
    public class AuditEvent
    {
        public string EventId { get; set; }
        public int EventCode { get; set; }
        public string Source { get; set; }
        public DateTime TimeGenerated { get; set; }
        public string Level { get; set; }
        public string Message { get; set; }
        public string Computer { get; set; }
        public string TargetUsername { get; set; }
        public string SubjectUsername { get; set; }

        /// <summary>
        /// Flagged events that match a critical filter.
        /// </summary>
        public bool IsFlagged { get; set; }

        /// <summary>
        /// Why this event was flagged.
        /// </summary>
        public string FlagReason { get; set; }

        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    }
}

