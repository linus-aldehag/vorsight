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
    }

    /// <summary>
    /// Event args for critical event detection.
    /// </summary>
    public class AuditEventDetectedEventArgs : EventArgs
    {
        public required AuditEvent Event { get; set; }
        public required string Description { get; set; }
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

