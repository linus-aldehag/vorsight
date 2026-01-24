using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace Vorsight.Service.Server.Clients;

public interface IVorsightRealtimeClient
{
    bool IsConnected { get; }

    event EventHandler Connected;
    event EventHandler Disconnected;
    event EventHandler<JsonElement> SettingsUpdateReceived;
    event EventHandler<JsonElement> ScheduleUpdateReceived;
    event EventHandler<CommandReceivedEventArgs> CommandReceived;
    event EventHandler MachineArchived;
    event EventHandler MachineUnarchived;
    event EventHandler<string> ConnectionError;

    // Events for authentication flow
    event EventHandler MachineConnected;

    Task ConnectAsync(string machineId, string? apiKey);
    Task DisconnectAsync();

    // Emissions
    Task SendHeartbeatAsync(string machineId, object state);
    Task SendActivityAsync(string machineId, object activity);
    Task SendAuditEventAsync(string machineId, object auditEvent);
    Task SendScreenshotNotificationAsync(string machineId, object screenshot);
}
