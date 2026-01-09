using Vorsight.Contracts.Settings;

namespace Vorsight.Infrastructure.Contracts
{
    public interface ISettingsManager
    {
        Task InitializeAsync();
        Task<AgentSettings> GetSettingsAsync();
        Task UpdateSettingsAsync(AgentSettings settings);
    }
}
