using Vorsight.Contracts.Settings;

namespace Vorsight.Infrastructure.Contracts
{
    public interface ISettingsManager
    {
        Task InitializeAsync();
        Task<MachineSettings> GetSettingsAsync();
        Task UpdateSettingsAsync(MachineSettings settings);
    }
}
