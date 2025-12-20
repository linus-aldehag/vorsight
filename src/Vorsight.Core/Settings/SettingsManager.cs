using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Vorsight.Core.Settings
{
    public class SettingsManager : ISettingsManager
    {
        private readonly ILogger<SettingsManager> _logger;
        private readonly string _settingsPath;
        private AgentSettings _currentSettings = new();

        public SettingsManager(ILogger<SettingsManager> logger)
        {
            _logger = logger;
            _settingsPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "Vorsight",
                "settings.json");
        }

        public async Task InitializeAsync()
        {
            try
            {
                if (File.Exists(_settingsPath))
                {
                    var json = await File.ReadAllTextAsync(_settingsPath);
                    var loaded = JsonSerializer.Deserialize<AgentSettings>(json);
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
                _logger.LogError(ex, "Error loading settings");
            }
        }

        public Task<AgentSettings> GetSettingsAsync()
        {
            return Task.FromResult(_currentSettings);
        }

        public async Task UpdateSettingsAsync(AgentSettings settings)
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
