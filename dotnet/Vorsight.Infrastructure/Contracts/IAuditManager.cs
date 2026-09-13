using Vorsight.Contracts.DTOs;
using Vorsight.Contracts.Settings;

namespace Vorsight.Infrastructure.Contracts
{
    public interface IAuditManager : IDisposable
    {
        Task InitializeAsync();
        event EventHandler<AuditEventDetectedEventArgs> CriticalEventDetected;
        event EventHandler<TamperingDetectedEventArgs> TamperingDetected;
        Task StartMonitoringAsync(MachineSettings settings);
        Task StopMonitoringAsync();
        bool IsMonitoring { get; }
    }

    public class AuditEventDetectedEventArgs : EventArgs
    {
        public required AuditEventPayload Event { get; set; }
        public required string Description { get; set; }
        public DateTime DetectedTime { get; set; }
    }

    public class TamperingDetectedEventArgs : EventArgs
    {
        public required string TamperingType { get; set; }
        public required string Details { get; set; }
        public DateTime DetectedTime { get; set; }
        public required string AffectedUsername { get; set; }
    }
}
