using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

using Vorsight.Infrastructure.IO;
using Vorsight.Infrastructure.Contracts;
using Vorsight.Contracts.Models;
using Vorsight.Contracts.Settings;
using Vorsight.Contracts.Screenshots;

namespace Vorsight.Infrastructure.Settings
{
    public class SettingsManager : ISettingsManager
    {
        private readonly ILogger<SettingsManager> _logger;
        private readonly string _settingsPath;
        private MachineSettings _currentSettings = new();

        public SettingsManager(ILogger<SettingsManager> logger)
        {
            _logger = logger;
            _settingsPath = Path.Combine(
                PathConfiguration.GetBaseDataDirectory(),
                "settings.json");
        }

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
                        _logger.LogInformation("Loaded settings from {Path}", _settingsPath);
                    }
                }
                else
                {
                    _logger.LogInformation("No settings file found, using defaults");
                    await SaveSettingsAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading settings - configuration may be corrupted");

                try 
                {
                    // Backup broken file
                    if (File.Exists(_settingsPath))
                    {
                        var backupPath = _settingsPath + ".bak";
                        File.Copy(_settingsPath, backupPath, true);
                        _logger.LogWarning("Corrupted settings backed up to {BackupPath}", backupPath);
                    }

                    // Reset to defaults
                    _currentSettings = new MachineSettings();
                    await SaveSettingsAsync();
                    _logger.LogWarning("Settings reset to defaults due to load error");
                }
                catch (Exception resetEx)
                {
                    _logger.LogError(resetEx, "Failed to reset settings after load error");
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
            _logger.LogInformation("Settings updated");
        }

        private async Task SaveSettingsAsync()
        {
            try
            {
                var dir = Path.GetDirectoryName(_settingsPath);
                if (dir != null) Directory.CreateDirectory(dir);

                var json = JsonSerializer.Serialize(_currentSettings, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(_settingsPath, json);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving settings");
            }
        }
    }
}
