using System.Threading.Tasks;

namespace Vorsight.Contracts.Settings
{
    public interface ISettingsManager
    {
        Task InitializeAsync();
        Task<AgentSettings> GetSettingsAsync();
        Task UpdateSettingsAsync(AgentSettings settings);
    }

    public class AgentSettings
    {
        public int ScreenshotIntervalSeconds { get; set; } = 60;
        public int PingIntervalSeconds { get; set; } = 30;
        public bool IsMonitoringEnabled { get; set; } = true;
    }
}
