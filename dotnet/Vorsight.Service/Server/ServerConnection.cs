using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Vorsight.Contracts.DTOs;
using Vorsight.Infrastructure.Identity;
using Vorsight.Service.Logging;
using Vorsight.Service.Server.Clients;
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

public class ServerConnection : IServerConnection, IDisposable
{
    private readonly ILogger<ServerConnection> _logger;
    private readonly IVorsightApiClient _apiClient;
    private readonly IVorsightRealtimeClient _realtimeClient;
    private readonly ICredentialStore _credentialStore;

    private string? _machineId;
    private string? _apiKey;
    private bool _isConnected;

    public bool IsConnected => _isConnected;
    public string? ApiKey => _apiKey;
    public string? MachineId => _machineId;
    public event EventHandler<CommandReceivedEventArgs>? CommandReceived;
    public event EventHandler? ScheduleUpdateReceived;
    public event EventHandler? SettingsUpdateReceived;
    public event EventHandler? ConnectionRestored;

    public ServerConnection(
        ILogger<ServerConnection> logger,
        IVorsightApiClient apiClient,
        IVorsightRealtimeClient realtimeClient,
        ICredentialStore credentialStore
    )
    {
        _logger = logger;
        _apiClient = apiClient;
        _realtimeClient = realtimeClient;
        _credentialStore = credentialStore;

        BindRealtimeEvents();
    }

    private void BindRealtimeEvents()
    {
        // When the socket itself connects, we try to authenticate
        _realtimeClient.Connected += async (sender, e) =>
        {
            await AuthenticateSocketAsync();
        };

        // When the SERVER confirms we are authenticated/connected logically
        _realtimeClient.MachineConnected += (sender, e) =>
        {
            _isConnected = true;
            // Trigger connection restored event so listeners can fetch settings/schedules
            Task.Run(() => ConnectionRestored?.Invoke(this, EventArgs.Empty));
        };

        _realtimeClient.Disconnected += (sender, e) =>
        {
            if (_isConnected)
            {
                _isConnected = false;
                // Log is handled in client, but we track state here
            }
        };

        _realtimeClient.ConnectionError += async (sender, error) =>
        {
            if (
                error.Equals("Invalid credentials", StringComparison.OrdinalIgnoreCase)
                || error.Equals("Missing credentials", StringComparison.OrdinalIgnoreCase)
            )
            {
                _logger.LogWarning(
                    "Server rejected credentials ({Error}). Flushing stored keys and re-registering...",
                    error
                );
                await HandleCredentialFailureAsync();
            }
            else
            {
                _logger.LogError("Server reported error: {Error}", error);
            }
        };

        _realtimeClient.SettingsUpdateReceived += (sender, settings) =>
        {
            _logger.LogInformation("Received settings update from server - triggering reload");
            SettingsUpdateReceived?.Invoke(this, EventArgs.Empty);
        };

        _realtimeClient.ScheduleUpdateReceived += (sender, schedule) =>
        {
            _logger.LogInformation("Received schedule update from server - triggering reload");
            ScheduleUpdateReceived?.Invoke(this, EventArgs.Empty);
        };

        _realtimeClient.CommandReceived += (sender, args) =>
        {
            CommandReceived?.Invoke(this, args);
        };
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
            await _realtimeClient.ConnectAsync(_machineId, _apiKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to initialize server connection (will retry in background)"
            );
        }
    }

    private async Task AuthenticateSocketAsync()
    {
        // This is called when the physical socket connects.
        // We instruct the client to emit the machine:connect event.
        if (!string.IsNullOrEmpty(_machineId))
        {
            await _realtimeClient.ConnectAsync(_machineId, _apiKey);
        }
    }

    private async Task HandleCredentialFailureAsync()
    {
        try
        {
            // 1. Delete bad credentials
            await _credentialStore.DeleteCredentialsAsync();

            // 2. Clear local state
            _apiKey = null;

            // 3. Re-register (generates new ID if needed, usually keeps same but gets new key)
            await RegisterMachineAsync();

            // 4. Re-connect
            if (!string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogInformation("Re-acquired credentials. Retrying authentication...");
                await _realtimeClient.ConnectAsync(_machineId!, _apiKey);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Critical failure during credential recovery.");
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

        if (_realtimeClient.IsConnected)
        {
            // NEW: Check if we are physically connected but not logically authenticated
            if (!_isConnected && !string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning(
                    "Connection Watchdog: Socket connected but not authenticated. Retrying handshake..."
                );
                await _realtimeClient.ConnectAsync(_machineId!, _apiKey);
            }
            return;
        }

        try
        {
            _logger.LogInformation("Connection Watchdog: Attempting to connect to server...");

            // Re-connect
            await _realtimeClient.ConnectAsync(_machineId!, _apiKey);
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
                metadata = new { },
            };

            var result = await _apiClient.RegisterMachineAsync(registrationData);

            if (result == null || !result.Success)
            {
                throw new Exception("Registration failed or returned empty response");
            }

            _apiKey = result.ApiKey;

            _logger.LogInformation(
                "Successfully registered with server. Received API Key: {ApiKeyPrefix}...",
                _apiKey?.Substring(0, Math.Min(5, _apiKey?.Length ?? 0))
            );

            // Adopt canonical ID from server if different (Name-based recovery)
            if (
                !string.IsNullOrEmpty(result.MachineId)
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

    public async Task SendHeartbeatAsync(StatePayload state)
    {
        if (_realtimeClient.IsConnected && !string.IsNullOrEmpty(_machineId))
        {
            await _realtimeClient.SendHeartbeatAsync(_machineId, state);
        }
    }

    public async Task SendActivityAsync(ActivityPayload activity)
    {
        if (_realtimeClient.IsConnected && !string.IsNullOrEmpty(_machineId))
        {
            await _realtimeClient.SendActivityAsync(_machineId, activity);
        }
    }

    public async Task SendAuditEventAsync(AuditEventPayload auditEvent)
    {
        if (_realtimeClient.IsConnected && !string.IsNullOrEmpty(_machineId))
        {
            await _realtimeClient.SendAuditEventAsync(_machineId, auditEvent);
            _logger.LogDebug("Audit event emitted successfully");
        }
        else
        {
            _logger.LogWarning("Cannot send audit event - socket not connected");
        }
    }

    public async Task SendScreenshotNotificationAsync(ScreenshotPayload screenshot)
    {
        if (_realtimeClient.IsConnected && !string.IsNullOrEmpty(_machineId))
        {
            await _realtimeClient.SendScreenshotNotificationAsync(_machineId, screenshot);
        }
    }

    public async Task<string?> UploadFileAsync(byte[] fileData, string fileName)
    {
        if (string.IsNullOrEmpty(_apiKey))
            return null;
        return await _apiClient.UploadFileAsync(_apiKey, fileData, fileName);
    }

    public async Task<string?> FetchScheduleJsonAsync()
    {
        if (string.IsNullOrEmpty(_apiKey))
            return null;
        return await _apiClient.FetchScheduleJsonAsync(_apiKey);
    }

    public async Task<string?> FetchSettingsJsonAsync()
    {
        if (string.IsNullOrEmpty(_apiKey))
            return null;
        return await _apiClient.FetchSettingsJsonAsync(_apiKey);
    }

    public async Task SendLogBatchAsync(IEnumerable<LogEventDto> logs)
    {
        if (string.IsNullOrEmpty(_apiKey))
            return;

        await _apiClient.SendLogBatchAsync(_apiKey, logs);
    }

    public async Task ReportAppliedSettingsAsync(string settingsJson)
    {
        if (string.IsNullOrEmpty(_machineId) || string.IsNullOrEmpty(_apiKey))
            return;

        await _apiClient.ReportAppliedSettingsAsync(_apiKey, _machineId, settingsJson);
    }

    public void Dispose()
    {
        if (_realtimeClient is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }
}
