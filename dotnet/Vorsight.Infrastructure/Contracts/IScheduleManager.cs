using Vorsight.Contracts.Settings;

namespace Vorsight.Infrastructure.Contracts
{
    public interface IScheduleManager : IDisposable
    {
        Task InitializeAsync();
        Task<AccessControlSettings> UpdateScheduleAsync(AccessControlSettings settings);
        Task DeleteScheduleAsync();
        Task<AccessControlSettings?> GetScheduleAsync();
        Task<bool> IsAccessAllowedAsync();
        Task<TimeSpan?> GetTimeRemainingAsync();
        Task<TimeSpan?> GetTimeUntilAccessAsync();

        Task<bool> ForceLogoffAsync();
        Task PreventReloginAsync();
        event EventHandler<AccessThresholdEventArgs> AccessTimeExpiring;
        event EventHandler<AccessThresholdEventArgs> AccessTimeExpired;

        Task StartEnforcementAsync();
        Task StopEnforcementAsync();
        bool IsEnforcementRunning { get; }
        Task UpdateScheduleFromSettingsAsync(AccessControlSettings settings);
    }

    public class AccessThresholdEventArgs : EventArgs
    {
        public uint SessionId { get; set; }
        public TimeSpan? TimeRemaining { get; set; }
        public DateTime EventTime { get; set; }
    }
}
