using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Vorsight.Core.Audit
{
    /// <summary>
    /// Interface for real-time Windows Event Log monitoring and audit trail management.
    /// Detects admin tampering (Event IDs 4720, 4728) and maintains audit logs.
    /// </summary>
    public interface IAuditManager : IDisposable
    {
        /// <summary>
        /// Initializes the audit manager and starts monitoring Event Logs.
        /// </summary>
        Task InitializeAsync();

        /// <summary>
        /// Adds a filter for audit event monitoring.
        /// </summary>
        Task AddFilterAsync(AuditEventFilter filter);

        /// <summary>
        /// Removes a filter.
        /// </summary>
        Task RemoveFilterAsync(string filterId);

        /// <summary>
        /// Gets all active audit filters.
        /// </summary>
        Task<IEnumerable<AuditEventFilter>> GetFiltersAsync();

        /// <summary>
        /// Logs an audit event to the Vörsight audit trail.
        /// These logs are stored separately from Windows Event Log for tamper-resistance.
        /// </summary>
        Task LogAuditEventAsync(AuditEvent auditEvent);

        /// <summary>
        /// Retrieves audit events for a specific time range.
        /// </summary>
        Task<IEnumerable<AuditEvent>> GetAuditEventsAsync(DateTime startTime, DateTime endTime);

        /// <summary>
        /// Retrieves flagged events (suspicious activity).
        /// </summary>
        Task<IEnumerable<AuditEvent>> GetFlaggedEventsAsync(int limit = 100);

        /// <summary>
        /// Retrieves all audit events for a specific user.
        /// </summary>
        Task<IEnumerable<AuditEvent>> GetUserEventsAsync(string username);

        /// <summary>
        /// Clears audit logs (should require admin confirmation).
        /// </summary>
        Task ClearAuditLogsAsync(string reason);

        /// <summary>
        /// Event raised when a critical/flagged event is detected.
        /// </summary>
        event EventHandler<AuditEventDetectedEventArgs> CriticalEventDetected;

        /// <summary>
        /// Event raised when Event Log tampering is detected.
        /// </summary>
        event EventHandler<TamperingDetectedEventArgs> TamperingDetected;

        /// <summary>
        /// Starts the real-time Event Log monitoring.
        /// </summary>
        Task StartMonitoringAsync();

        /// <summary>
        /// Stops real-time Event Log monitoring.
        /// </summary>
        Task StopMonitoringAsync();

        /// <summary>
        /// Whether monitoring is currently active.
        /// </summary>
        bool IsMonitoring { get; }

        /// <summary>
        /// Gets count of events in audit log.
        /// </summary>
        Task<int> GetEventCountAsync();

        /// <summary>
        /// Gets size of audit log in bytes.
        /// </summary>
        Task<long> GetAuditLogSizeAsync();
    }

    /// <summary>
    /// Event args for critical event detection.
    /// </summary>
    public class AuditEventDetectedEventArgs : EventArgs
    {
        public required AuditEvent Event { get; set; }
        public required AuditEventFilter MatchingFilter { get; set; }
        public DateTime DetectedTime { get; set; }
    }

    /// <summary>
    /// Event args for tampering detection.
    /// </summary>
    public class TamperingDetectedEventArgs : EventArgs
    {
        public required string TamperingType { get; set; }
        public required string Details { get; set; }
        public DateTime DetectedTime { get; set; }
        public required string AffectedUsername { get; set; }
    }
}

