using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SocketIOClient;

namespace Vorsight.Service.Server.Clients;

public class VorsightSocketClient : IVorsightRealtimeClient, IDisposable
{
    private readonly SocketIOClient.SocketIO _socket;
    private readonly ILogger<VorsightSocketClient> _logger;

    public bool IsConnected => _socket.Connected;

    public event EventHandler? Connected;
    public event EventHandler? Disconnected;
    public event EventHandler<JsonElement>? SettingsUpdateReceived;
    public event EventHandler<JsonElement>? ScheduleUpdateReceived;
    public event EventHandler<CommandReceivedEventArgs>? CommandReceived;
    public event EventHandler? MachineArchived;
    public event EventHandler? MachineUnarchived;
    public event EventHandler<string>? ConnectionError;
    public event EventHandler? MachineConnected;

    public VorsightSocketClient(IConfiguration configuration, ILogger<VorsightSocketClient> logger)
    {
        _logger = logger;
        var serverUrl = configuration["Server:Url"] ?? "http://localhost:3000";
        _socket = new SocketIOClient.SocketIO(serverUrl);

        SetupEvents();
    }

    private void SetupEvents()
    {
        _socket.OnConnected += (sender, e) =>
        {
            _logger.LogInformation("WebSocket connected");
            Connected?.Invoke(this, EventArgs.Empty);
        };

        _socket.OnDisconnected += (sender, e) =>
        {
            if (IsConnected) // Only log if we were previously connected logically
            {
                _logger.LogWarning("WebSocket disconnected");
            }
            Disconnected?.Invoke(this, EventArgs.Empty);
        };

        _socket.On(
            "machine:connected",
            response =>
            {
                _logger.LogInformation("Machine authenticated with server");
                MachineConnected?.Invoke(this, EventArgs.Empty);
            }
        );

        _socket.On(
            "machine:error",
            response =>
            {
                var data = response.GetValue<JsonElement>();
                if (data.TryGetProperty("error", out var errorProp))
                {
                    var error = errorProp.GetString();
                    ConnectionError?.Invoke(this, error ?? "Unknown error");
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
                            _logger.LogDebug("Received command from server: {Type}", type);
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
                    SettingsUpdateReceived?.Invoke(this, settings);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to parse settings update");
                }
            }
        );

        _socket.On(
            "server:schedule_update",
            response =>
            {
                try
                {
                    var schedule = response.GetValue<JsonElement>();
                    ScheduleUpdateReceived?.Invoke(this, schedule);
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
                _logger.LogWarning("⚠ Machine has been archived - data collection stopped");
                MachineArchived?.Invoke(this, EventArgs.Empty);
            }
        );

        _socket.On(
            "machine:unarchived",
            response =>
            {
                _logger.LogInformation("✓ Machine has been un-archived - data collection resumed");
                MachineUnarchived?.Invoke(this, EventArgs.Empty);
            }
        );
    }

    public async Task ConnectAsync(string machineId, string? apiKey)
    {
        if (!_socket.Connected)
        {
            await _socket.ConnectAsync();
        }

        // Always try to authenticate once the socket logic is connected
        // Note: The previous logic relied on OnConnected event to emit the connect event.
        // Here we can do it explicitly if already connected, or let the caller drive it?
        // Actually, the previous implementation had logic inside OnConnected.
        // We should probably expose an Authenticate method or just do it here if connected.

        if (_socket.Connected)
        {
            _logger.LogInformation(
                "Authenticating... MachineId: {MachineId}, KeyPrefix: {KeyPrefix}",
                machineId,
                !string.IsNullOrEmpty(apiKey) && apiKey.Length > 5
                    ? apiKey.Substring(0, 5) + "..."
                    : "invalid"
            );

            await _socket.EmitAsync("machine:connect", new { machineId, apiKey });
        }
    }

    public async Task DisconnectAsync()
    {
        await _socket.DisconnectAsync();
    }

    public async Task SendHeartbeatAsync(string machineId, object state)
    {
        if (_socket.Connected)
        {
            await _socket.EmitAsync("machine:heartbeat", new { machineId, state });
        }
    }

    public async Task SendActivityAsync(string machineId, object activity)
    {
        if (_socket.Connected)
        {
            await _socket.EmitAsync("machine:activity", new { machineId, activity });
        }
    }

    public async Task SendAuditEventAsync(string machineId, object auditEvent)
    {
        if (_socket.Connected)
        {
            await _socket.EmitAsync("machine:audit", new { machineId, auditEvent });
        }
    }

    public async Task SendScreenshotNotificationAsync(string machineId, object screenshot)
    {
        if (_socket.Connected)
        {
            await _socket.EmitAsync("machine:screenshot", new { machineId, screenshot });
        }
    }

    public void Dispose()
    {
        _socket.Dispose();
    }
}
