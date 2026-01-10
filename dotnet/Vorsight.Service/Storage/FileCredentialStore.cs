using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Vorsight.Service.Storage;

public class FileCredentialStore : ICredentialStore
{
    private readonly ILogger<FileCredentialStore> _logger;
    private readonly string _credentialsPath;

    public FileCredentialStore(ILogger<FileCredentialStore> logger)
    {
        _logger = logger;
        
        var commonAppData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        var vorsightData = Path.Combine(commonAppData, "Vorsight");
        
        if (!Directory.Exists(vorsightData))
        {
            Directory.CreateDirectory(vorsightData);
        }
        
        _credentialsPath = Path.Combine(vorsightData, "credentials.json");
    }

    public async Task SaveCredentialsAsync(string machineId, string apiKey)
    {
        try
        {
            var data = new CredentialsModel
            {
                MachineId = machineId,
                ApiKey = apiKey,
                LastUpdated = DateTime.UtcNow
            };
            
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_credentialsPath, json);
            
            _logger.LogInformation("Credentials saved to {Path}", _credentialsPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save credentials");
            throw;
        }
    }

    public async Task<(string? MachineId, string? ApiKey)> LoadCredentialsAsync()
    {
        try
        {
            if (!File.Exists(_credentialsPath))
            {
                _logger.LogInformation("No credentials file found at {Path}", _credentialsPath);
                return (null, null);
            }

            var json = await File.ReadAllTextAsync(_credentialsPath);
            var data = JsonSerializer.Deserialize<CredentialsModel>(json);
            
            if (data != null && !string.IsNullOrEmpty(data.ApiKey))
            {
                _logger.LogInformation("Loaded credentials for machine {MachineId}", data.MachineId);
                return (data.MachineId, data.ApiKey);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load credentials");
        }
        
        return (null, null);
    }

    private class CredentialsModel
    {
        public string? MachineId { get; set; }
        public string? ApiKey { get; set; }
        public DateTime LastUpdated { get; set; }
    }
}
