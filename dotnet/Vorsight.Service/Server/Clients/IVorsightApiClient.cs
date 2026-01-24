using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Vorsight.Contracts.DTOs;
using Vorsight.Service.Logging;

namespace Vorsight.Service.Server.Clients;

public interface IVorsightApiClient
{
    Task<RegistrationResponse?> RegisterMachineAsync(object registrationData);
    Task<string?> UploadFileAsync(string apiKey, byte[] fileData, string fileName);
    Task<string?> FetchScheduleJsonAsync(string apiKey);
    Task<string?> FetchSettingsJsonAsync(string apiKey);
    Task SendLogBatchAsync(string apiKey, IEnumerable<LogEventDto> logs);
    Task ReportAppliedSettingsAsync(string apiKey, string machineId, string settingsJson);
}

public class RegistrationResponse
{
    public bool Success { get; set; }
    public string? ApiKey { get; set; }
    public string? MachineId { get; set; }
}
