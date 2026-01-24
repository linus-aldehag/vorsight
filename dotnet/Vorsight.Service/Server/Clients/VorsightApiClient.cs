using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Vorsight.Contracts.DTOs;
using Vorsight.Service.Logging;

namespace Vorsight.Service.Server.Clients;

public class VorsightApiClient : IVorsightApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<VorsightApiClient> _logger;
    private readonly JsonSerializerOptions _jsonOptions;
    private const string BaseApiPath = "/api/machine/v1";

    public VorsightApiClient(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<VorsightApiClient> logger
    )
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();

        var serverUrl = configuration["Server:Url"] ?? "http://localhost:3000";
        _httpClient.BaseAddress = new Uri(serverUrl);

        _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
    }

    public async Task<RegistrationResponse?> RegisterMachineAsync(object registrationData)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync(
                $"{BaseApiPath}/machines/register",
                registrationData
            );
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<RegistrationResponse>(_jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register machine");
            throw;
        }
    }

    public async Task<string?> UploadFileAsync(string apiKey, byte[] fileData, string fileName)
    {
        try
        {
            using var content = new MultipartFormDataContent();
            using var fileContent = new ByteArrayContent(fileData);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            content.Add(fileContent, "file", fileName);

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                new Uri(_httpClient.BaseAddress!, $"{BaseApiPath}/media/upload")
            );
            request.Headers.Add("x-api-key", apiKey);
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            if (result.TryGetProperty("id", out var idElement))
            {
                return idElement.GetString();
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file to server");
            return null;
        }
    }

    public async Task<string?> FetchScheduleJsonAsync(string apiKey)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{BaseApiPath}/schedule");
            request.Headers.Add("x-api-key", apiKey);

            var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                _logger.LogWarning("Machine is archived - schedule fetch rejected");
                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to fetch schedule: {Status}", response.StatusCode);
                return null;
            }

            return await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching schedule JSON");
            return null;
        }
    }

    public async Task<string?> FetchSettingsJsonAsync(string apiKey)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{BaseApiPath}/configuration");
            request.Headers.Add("x-api-key", apiKey);

            var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                _logger.LogWarning("Machine is archived - settings fetch rejected");
                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to fetch settings: {Status}", response.StatusCode);
                return null;
            }

            return await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching settings JSON");
            return null;
        }
    }

    public async Task SendLogBatchAsync(string apiKey, IEnumerable<LogEventDto> logs)
    {
        try
        {
            var request = new HttpRequestMessage(
                HttpMethod.Post,
                new Uri(_httpClient.BaseAddress!, $"{BaseApiPath}/logs")
            );
            request.Headers.Add("x-api-key", apiKey);
            request.Content = JsonContent.Create(logs);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                // Do not log here to avoid recursive logging loops if the sink uses this
            }
        }
        catch
        {
            // Silent fail for logs
        }
    }

    public async Task ReportAppliedSettingsAsync(
        string apiKey,
        string machineId,
        string settingsJson
    )
    {
        try
        {
            var payload = new { machineId, settings = settingsJson };

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                new Uri(_httpClient.BaseAddress!, $"{BaseApiPath}/configuration/applied")
            );
            request.Headers.Add("x-api-key", apiKey);
            request.Content = JsonContent.Create(payload);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Failed to report settings application: {Status}",
                    response.StatusCode
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reporting applied settings");
        }
    }
}
