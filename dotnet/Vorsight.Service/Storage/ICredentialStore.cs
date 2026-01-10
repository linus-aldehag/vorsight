namespace Vorsight.Service.Storage;

public interface ICredentialStore
{
    Task SaveCredentialsAsync(string machineId, string apiKey);
    Task<(string? MachineId, string? ApiKey)> LoadCredentialsAsync();
}
