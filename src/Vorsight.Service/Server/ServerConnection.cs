using System.Net.Http.Json;
using System.Text.Json;
using SocketIOClient;
using Vorsight.Core.Identity;
using Microsoft.Extensions.Logging;

namespace Vorsight.Service.Server;

public interface IServerConnection
{
    Task InitializeAsync();
    Task SendHeartbeatAsync(object state);
    Task SendActivityAsync(object activity);
    Task SendAuditEventAsync(object auditEvent);
    Task SendScreenshotNotificationAsync(object screenshot);
    Task<string?> UploadFileAsync(byte[] fileData, string fileName);
    bool IsConnected { get; }
    event EventHandler<CommandReceivedEventArgs>? CommandReceived;
}

public class ServerConnection : IServerConnection
{
    private readonly ILogger<ServerConnection> _logger;
    private readonly HttpClient _httpClient;
    private SocketIOClient.SocketIO? _socket;
    private string? _machineId;
    private string? _apiKey;
    private bool _isConnected;
    
    private const string ServerUrl = "http://localhost:3000"; // TODO: Make configurable
    
    public bool IsConnected => _isConnected;
    public event EventHandler<CommandReceivedEventArgs>? CommandReceived;
    
    public ServerConnection(ILogger<ServerConnection> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
        _httpClient.BaseAddress = new Uri(ServerUrl);
    }
    
    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public async Task InitializeAsync()
    {
        try
        {
            // Generate or load machine ID
            _machineId = MachineIdentity.GenerateMachineId();
            _logger.LogInformation("Machine ID: {MachineId}", _machineId);
            
            // Register with server
            await RegisterMachineAsync();
            
            // Connect WebSocket
            await ConnectWebSocketAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize server connection");
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
                    dotnetVersion = Environment.Version.ToString()
                }
            };
            
            var response = await _httpClient.PostAsJsonAsync("/api/machines/register", registrationData);
            response.EnsureSuccessStatusCode();
            
            var result = await response.Content.ReadFromJsonAsync<RegistrationResponse>();
            _apiKey = result?.ApiKey;
            
            _logger.LogInformation("Successfully registered with server. API Key received.");
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
            _socket = new SocketIOClient.SocketIO(ServerUrl);
            
            _socket.OnConnected += async (sender, e) =>
            {
                _logger.LogInformation("WebSocket connected");
                
                // Authenticate
                await _socket.EmitAsync("machine:connect", new
                {
                    machineId = _machineId,
                    apiKey = _apiKey
                });
            };
            
            _socket.On("machine:connected", response =>
            {
                _isConnected = true;
                _logger.LogInformation("Machine authenticated with server");
            });
            
            _socket.On("machine:error", response =>
            {
                var error = response.GetValue<JsonElement>();
                _logger.LogError("Server error: {Error}", error);
            });

            _socket.On("server:command", response =>
            {
                try 
                {
                    var data = response.GetValue<JsonElement>();
                    if (data.TryGetProperty("type", out var typeElement))
                    {
                        var type = typeElement.GetString();
                        if (!string.IsNullOrEmpty(type))
                        {
                            CommandReceived?.Invoke(this, new CommandReceivedEventArgs 
                            { 
                                CommandType = type,
                                Data = data
                            });
                            _logger.LogInformation("Received command from server: {Type}", type);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to parse server command");
                }
            });
            
            _socket.OnDisconnected += (sender, e) =>
            {
                _isConnected = false;
                _logger.LogWarning("WebSocket disconnected");
            };
            
            await _socket.ConnectAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect WebSocket");
            throw;
        }
    }
    
    public async Task SendHeartbeatAsync(object state)
    {
        if (_socket?.Connected == true)
        {
            await _socket.EmitAsync("machine:heartbeat", new
            {
                machineId = _machineId,
                state
            });
        }
    }
    
    public async Task SendActivityAsync(object activity)
    {
        if (_socket?.Connected == true)
        {
            await _socket.EmitAsync("machine:activity", new
            {
                machineId = _machineId,
                activity
            });
        }
    }
    
    public async Task SendAuditEventAsync(object auditEvent)
    {
        _logger.LogDebug("SendAuditEventAsync called. Socket connected: {Connected}", _socket?.Connected);
        
        if (_socket?.Connected == true)
        {
            _logger.LogInformation("Emitting audit event via Socket.IO");
            await _socket.EmitAsync("machine:audit", new
            {
                machineId = _machineId,
                auditEvent
            });
            _logger.LogInformation("Audit event emitted successfully");
        }
        else
        {
            _logger.LogWarning("Cannot send audit event - socket not connected");
        }
    }
    
    public async Task SendScreenshotNotificationAsync(object screenshot)
    {
        if (_socket?.Connected == true)
        {
            await _socket.EmitAsync("machine:screenshot", new
            {
                machineId = _machineId,
                screenshot
            });
        }
    }

    public async Task<string?> UploadFileAsync(byte[] fileData, string fileName)
    {
        try
        {
            using var content = new MultipartFormDataContent();
            using var fileContent = new ByteArrayContent(fileData);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
            content.Add(fileContent, "file", fileName);

            var response = await _httpClient.PostAsync("/api/media/upload", content);
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
    
    private class RegistrationResponse
    {
        public bool Success { get; set; }
        public string? ApiKey { get; set; }
        public string? MachineId { get; set; }
    }
}
