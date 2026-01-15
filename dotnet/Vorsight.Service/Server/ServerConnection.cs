using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SocketIOClient;
using Vorsight.Contracts.DTOs;
using Vorsight.Infrastructure.Identity;
using Vorsight.Service.Logging;
using Vorsight.Service.Storage;

namespace Vorsight.Service.Server;

public interface IServerConnection
{
    Task InitializeAsync();
    Task EnsureConnectedAsync(CancellationToken cancellationToken);
    Task SendHeartbeatAsync(StatePayload state);
    Task SendActivityAsync(ActivityPayload activity);
    Task SendAuditEventAsync(AuditEventPayload auditEvent);
    Task SendScreenshotNotificationAsync(ScreenshotPayload screenshot);
    Task<string?> UploadFileAsync(byte[] fileData, string fileName);
    Task<string?> FetchScheduleJsonAsync();
    Task<string?> FetchSettingsJsonAsync();
    Task SendLogBatchAsync(IEnumerable<LogEventDto> logs);
    Task ReportAppliedSettingsAsync(string settingsJson);
    bool IsConnected { get; }
    string? ApiKey { get; }
    string? MachineId { get; }
    event EventHandler<CommandReceivedEventArgs>? CommandReceived;
    event EventHandler? ScheduleUpdateReceived;
    event EventHandler? SettingsUpdateReceived;
    event EventHandler? ConnectionRestored;
}

public class ServerConnection : IServerConnection
{
    private readonly ILogger<ServerConnection> _logger;
    private readonly HttpClient _httpClient;
    private readonly ICredentialStore _credentialStore;
    private SocketIOClient.SocketIO? _socket;
    private string? _machineId;
    private string? _apiKey;
    private bool _isConnected;

    private readonly string _serverUrl;
    private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true,
    };

    public bool IsConnected => _isConnected;
    public string? ApiKey => _apiKey;
    public string? MachineId => _machineId;
    public event EventHandler<CommandReceivedEventArgs>? CommandReceived;
    public event EventHandler? ScheduleUpdateReceived;
    public event EventHandler? SettingsUpdateReceived;
    public event EventHandler? ConnectionRestored;

    public ServerConnection(
        ILogger<ServerConnection> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ICredentialStore credentialStore
    )
    {
        _logger = logger;
        _credentialStore = credentialStore;
        _httpClient = httpClientFactory.CreateClient();
        _serverUrl = configuration["Server:Url"] ?? "http://localhost:3000";
        _httpClient.BaseAddress = new Uri(_serverUrl);
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public async Task InitializeAsync()
    {
        // Bind this connection to the static logger sink
        Logging.ServerSink.CurrentConnection = this;

        try
        {
            // Generate or load machine ID
            var (storedId, storedKey) = await _credentialStore.LoadCredentialsAsync();

            if (!string.IsNullOrEmpty(storedKey))
            {
                _apiKey = storedKey;
                _machineId = storedId ?? MachineIdentity.GenerateMachineId();
                _logger.LogInformation(
                    "Loaded API Key from store for Machine ID: {MachineId}",
                    _machineId
                );
            }
            else
            {
                _machineId = MachineIdentity.GenerateMachineId();
                _logger.LogInformation(
                    "No credentials found. Generated Machine ID: {MachineId}",
                    _machineId
                );
            }

            // Register with server if no API key
            if (string.IsNullOrEmpty(_apiKey))
            {
                await RegisterMachineAsync();
            }

            // Connect WebSocket
            await ConnectWebSocketAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to initialize server connection (will retry in background)"
            );
        }
    }

    public async Task EnsureConnectedAsync(CancellationToken cancellationToken)
    {
        // If we don't have an API key, we must try to register first
        if (string.IsNullOrEmpty(_apiKey))
        {
            try
            {
                _logger.LogInformation(
                    "Connection Watchdog: No API key found. Retrying registration..."
                );

                // Ensure machine ID is loaded
                if (string.IsNullOrEmpty(_machineId) && OperatingSystem.IsWindows())
                {
                    _machineId = MachineIdentity.GenerateMachineId();
                }

                await RegisterMachineAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    "Connection Watchdog: Failed to re-register ({Message})",
                    ex.Message
                );
                return; // Cannot connect without API key
            }
        }

        if (_socket != null && _socket.Connected)
        {
            // NEW: Check if we are physically connected but not logically authenticated
            if (!_isConnected && !string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning(
                    "Connection Watchdog: Socket connected but not authenticated. Retrying handshake..."
                );
                await _socket.EmitAsync(
                    "machine:connect",
                    new { machineId = _machineId, apiKey = _apiKey }
                );
            }
            return;
        }

        try
        {
            _logger.LogInformation("Connection Watchdog: Attempting to connect to server...");

            // If socket is null or disposed, recreate it
            if (_socket == null)
            {
                await ConnectWebSocketAsync();
            }
            else
            {
                await _socket.ConnectAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Connection Watchdog: Failed to connect ({Message})", ex.Message);
        }
    }

    private async Task RegisterMachineAsync()
    {
        try
        {
            var registrationData = new
            {
                machineId = _machineId,
                name = Environment.MachineName,
                hostname = Environment.MachineName,
                metadata = new
                {
                    os = Environment.OSVersion.ToString(),
                    version = "1.0.0",
                    dotnetVersion = Environment.Version.ToString(),
                },
            };

            var response = await _httpClient.PostAsJsonAsync(
                "/api/machine/v1/machines/register",
                registrationData
            );
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<RegistrationResponse>(
                _jsonOptions
            );
            _apiKey = result?.ApiKey;

            _logger.LogInformation(
                "Successfully registered with server. Received API Key: {ApiKeyPrefix}...",
                _apiKey?.Substring(0, Math.Min(5, _apiKey?.Length ?? 0))
            );

            // Adopt canonical ID from server if different (Name-based recovery)
            if (
                !string.IsNullOrEmpty(result?.MachineId)
                && !string.Equals(result.MachineId, _machineId, StringComparison.OrdinalIgnoreCase)
            )
            {
                _logger.LogWarning(
                    "Adopting canonical Machine ID from server: {NewId} (was {OldId})",
                    result.MachineId,
                    _machineId
                );
                _machineId = result.MachineId;
            }

            // Persist credentials
            if (!string.IsNullOrEmpty(_apiKey) && !string.IsNullOrEmpty(_machineId))
            {
                await _credentialStore.SaveCredentialsAsync(_machineId, _apiKey);
                _logger.LogInformation("Credentials persisted to store.");
            }
            else
            {
                _logger.LogError("Failed to extract API Key from registration response.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register machine");
            throw;
        }
    }

    private async Task ConnectWebSocketAsync()
    {
        try
        {
            _socket = new SocketIOClient.SocketIO(_serverUrl);

            _socket.OnConnected += async (sender, e) =>
            {
                _logger.LogInformation("WebSocket connected");

                _logger.LogInformation(
                    "Authenticating... MachineId: {MachineId}, KeyPrefix: {KeyPrefix}",
                    _machineId,
                    !string.IsNullOrEmpty(_apiKey) && _apiKey.Length > 5
                        ? _apiKey.Substring(0, 5) + "..."
                        : "invalid"
                );

                // Authenticate
                await _socket.EmitAsync(
                    "machine:connect",
                    new { machineId = _machineId, apiKey = _apiKey }
                );
            };

            _socket.On(
                "machine:connected",
                response =>
                {
                    _isConnected = true;
                    _logger.LogInformation("Machine authenticated with server");

                    // Trigger connection restored event so listeners can fetch settings/schedules
                    Task.Run(() => ConnectionRestored?.Invoke(this, EventArgs.Empty));
                }
            );

            _socket.On(
                "machine:error",
                async response =>
                {
                    var data = response.GetValue<JsonElement>();

                    // Handle credential errors
                    if (data.TryGetProperty("error", out var errorProp))
                    {
                        var error = errorProp.GetString();
                        if (
                            error?.Equals("Invalid credentials", StringComparison.OrdinalIgnoreCase)
                                == true
                            || error?.Equals(
                                "Missing credentials",
                                StringComparison.OrdinalIgnoreCase
                            ) == true
                        )
                        {
                            _logger.LogWarning(
                                "Server rejected credentials ({Error}). Flushing stored keys and re-registering...",
                                error
                            );

                            try
                            {
                                // 1. Delete bad credentials
                                await _credentialStore.DeleteCredentialsAsync();

                                // 2. Clear local state
                                _apiKey = null;

                                // 3. Re-register (generates new ID)
                                await RegisterMachineAsync();

                                // 4. Re-connect
                                if (!string.IsNullOrEmpty(_apiKey))
                                {
                                    _logger.LogInformation(
                                        "Re-acquired credentials. Retrying authentication..."
                                    );
                                    await _socket.EmitAsync(
                                        "machine:connect",
                                        new { machineId = _machineId, apiKey = _apiKey }
                                    );
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(
                                    ex,
                                    "Critical failure during credential recovery."
                                );
                            }
                        }
                        else
                        {
                            _logger.LogError("Server reported error: {Error}", data.GetRawText());
                        }
                    }
                }
            );

            _socket.On(
                "server:command",
                response =>
                {
                    try
                    {
                        var data = response.GetValue<JsonElement>();
                        if (data.TryGetProperty("type", out var typeElement))
                        {
                            var type = typeElement.GetString();
                            if (!string.IsNullOrEmpty(type))
                            {
                                CommandReceived?.Invoke(
                                    this,
                                    new CommandReceivedEventArgs { CommandType = type, Data = data }
                                );
                                _logger.LogInformation(
                                    "Received command from server: {Type}",
                                    type
                                );
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to parse server command");
                    }
                }
            );

            _socket.On(
                "server:settings_update",
                response =>
                {
                    try
                    {
                        var settings = response.GetValue<JsonElement>();
                        _logger.LogInformation(
                            "Received settings update from server - triggering reload"
                        );
                        SettingsUpdateReceived?.Invoke(this, EventArgs.Empty);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to parse settings update");
                    }
                }
            );

            _socket.On(
                "server:schedule_update",
                async response =>
                {
                    try
                    {
                        var schedule = response.GetValue<JsonElement>();
                        _logger.LogInformation(
                            "Received schedule update from server - triggering reload"
                        );

                        // Trigger schedule reload event
                        ScheduleUpdateReceived?.Invoke(this, EventArgs.Empty);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to parse schedule update");
                    }
                }
            );

            _socket.On(
                "machine:archived",
                response =>
                {
                    try
                    {
                        _logger.LogWarning("⚠ Machine has been archived - data collection stopped");
                        _logger.LogWarning(
                            "This machine will not send any monitoring data until it is un-archived"
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to parse machine:archived event");
                    }
                }
            );

            _socket.On(
                "machine:unarchived",
                response =>
                {
                    try
                    {
                        _logger.LogInformation(
                            "✓ Machine has been un-archived - data collection resumed"
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to parse machine:unarchived event");
                    }
                }
            );

            _socket.OnDisconnected += (sender, e) =>
            {
                // Only log if we were previously connected
                if (_isConnected)
                {
                    _isConnected = false;
                    _logger.LogWarning("WebSocket disconnected");
                }
            };

            await _socket.ConnectAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect WebSocket");
            throw;
        }
    }

    public async Task SendHeartbeatAsync(StatePayload state)
    {
        if (_socket?.Connected == true)
        {
            await _socket.EmitAsync("machine:heartbeat", new { machineId = _machineId, state });
        }
    }

    public async Task SendActivityAsync(ActivityPayload activity)
    {
        if (_socket?.Connected == true)
        {
            await _socket.EmitAsync("machine:activity", new { machineId = _machineId, activity });
        }
    }

    public async Task SendAuditEventAsync(AuditEventPayload auditEvent)
    {
        _logger.LogDebug(
            "SendAuditEventAsync called. Socket connected: {Connected}",
            _socket?.Connected
        );

        if (_socket?.Connected == true)
        {
            _logger.LogInformation("Emitting audit event via Socket.IO");
            await _socket.EmitAsync("machine:audit", new { machineId = _machineId, auditEvent });
            _logger.LogInformation("Audit event emitted successfully");
        }
        else
        {
            _logger.LogWarning("Cannot send audit event - socket not connected");
        }
    }

    public async Task SendScreenshotNotificationAsync(ScreenshotPayload screenshot)
    {
        if (_socket?.Connected == true)
        {
            await _socket.EmitAsync(
                "machine:screenshot",
                new { machineId = _machineId, screenshot }
            );
        }
    }

    public async Task<string?> UploadFileAsync(byte[] fileData, string fileName)
    {
        try
        {
            using var content = new MultipartFormDataContent();
            using var fileContent = new ByteArrayContent(fileData);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                "image/png"
            );
            content.Add(fileContent, "file", fileName);

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                new Uri(_httpClient.BaseAddress!, "/api/machine/v1/media/upload")
            );
            request.Headers.Add("x-api-key", _apiKey);
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

    public async Task<string?> FetchScheduleJsonAsync()
    {
        if (string.IsNullOrEmpty(_machineId) || string.IsNullOrEmpty(_apiKey))
            return null;

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/machine/v1/schedule");
            request.Headers.Add("x-api-key", _apiKey);

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

    public async Task<string?> FetchSettingsJsonAsync()
    {
        if (string.IsNullOrEmpty(_machineId) || string.IsNullOrEmpty(_apiKey))
            return null;

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/machine/v1/configuration");
            request.Headers.Add("x-api-key", _apiKey);

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

    public async Task SendLogBatchAsync(IEnumerable<LogEventDto> logs)
    {
        if (string.IsNullOrEmpty(_machineId) || string.IsNullOrEmpty(_apiKey))
            return;

        try
        {
            var request = new HttpRequestMessage(
                HttpMethod.Post,
                new Uri(_httpClient.BaseAddress!, "/api/machine/v1/logs")
            );
            request.Headers.Add("x-api-key", _apiKey);
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

    public async Task ReportAppliedSettingsAsync(string settingsJson)
    {
        if (string.IsNullOrEmpty(_machineId) || string.IsNullOrEmpty(_apiKey))
            return;

        try
        {
            var payload = new { machineId = _machineId, settings = settingsJson };

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                new Uri(_httpClient.BaseAddress!, "/api/machine/v1/configuration/applied")
            );
            request.Headers.Add("x-api-key", _apiKey);
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

    private class RegistrationResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("apiKey")]
        public string? ApiKey { get; set; }

        [JsonPropertyName("machineId")]
        public string? MachineId { get; set; }
    }
}
