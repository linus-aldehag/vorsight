using System.Text.Json;
using Microsoft.Extensions.Logging;
using Vorsight.Contracts.Settings;
using Vorsight.Infrastructure.Contracts;
using Vorsight.Infrastructure.IO;

namespace Vorsight.Infrastructure.Settings
{
    public class SettingsManager(ILogger<SettingsManager> logger) : ISettingsManager
    {
        private readonly string _settingsPath = Path.Combine(
            PathConfiguration.GetBaseDataDirectory(),
            "settings.json"
        );
        private MachineSettings _currentSettings = new();

        public async Task InitializeAsync()
        {
            try
            {
                if (File.Exists(_settingsPath))
                {
                    var json = await File.ReadAllTextAsync(_settingsPath);
                    var loaded = JsonSerializer.Deserialize<MachineSettings>(json);
                    if (loaded != null)
                    {
                        _currentSettings = loaded;
                        logger.LogInformation("Loaded settings from {Path}", _settingsPath);
                    }
                }
                else
                {
                    logger.LogInformation("No settings file found, using defaults");
                    await SaveSettingsAsync();
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error loading settings - configuration may be corrupted");

                try
                {
                    // Backup broken file
                    if (File.Exists(_settingsPath))
                    {
                        var backupPath = _settingsPath + ".bak";
                        File.Copy(_settingsPath, backupPath, true);
                        logger.LogWarning(
                            "Corrupted settings backed up to {BackupPath}",
                            backupPath
                        );
                    }

                    // Reset to defaults
                    _currentSettings = new MachineSettings();
                    await SaveSettingsAsync();
                    logger.LogWarning("Settings reset to defaults due to load error");
                }
                catch (Exception resetEx)
                {
                    logger.LogError(resetEx, "Failed to reset settings after load error");
                }
            }
        }

        public Task<MachineSettings> GetSettingsAsync()
        {
            return Task.FromResult(_currentSettings);
        }

        public async Task UpdateSettingsAsync(MachineSettings settings)
        {
            _currentSettings = settings;
            await SaveSettingsAsync();
            logger.LogInformation("Settings updated");
        }

        private async Task SaveSettingsAsync()
        {
            try
            {
                var dir = Path.GetDirectoryName(_settingsPath);
                if (dir != null)
                    Directory.CreateDirectory(dir);

                var json = JsonSerializer.Serialize(
                    _currentSettings,
                    new JsonSerializerOptions { WriteIndented = true }
                );
                await File.WriteAllTextAsync(_settingsPath, json);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error saving settings");
            }
        }
    }
}
