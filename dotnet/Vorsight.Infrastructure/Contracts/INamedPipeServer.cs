using Vorsight.Contracts.IPC;

namespace Vorsight.Infrastructure.Contracts;

public interface INamedPipeServer : IDisposable
{
    Task StartAsync();
    Task StopAsync();
    Task SendMessageAsync(PipeMessage message, uint sessionId);
    Task BroadcastMessageAsync(PipeMessage message);
    event EventHandler<PipeMessageReceivedEventArgs> MessageReceived;
    event EventHandler<SessionConnectedEventArgs> SessionConnected;
    event EventHandler<SessionDisconnectedEventArgs> SessionDisconnected;
    bool IsRunning { get; }
    string PipeName { get; }
}

public class PipeMessageReceivedEventArgs : EventArgs
{
    public required PipeMessage Message { get; set; }
    public required uint SessionId { get; set; }
}

public class SessionConnectedEventArgs : EventArgs
{
    public required uint SessionId { get; set; }
    public string? Username { get; set; }
}

public class SessionDisconnectedEventArgs : EventArgs
{
    public required uint SessionId { get; set; }
    public string? Reason { get; set; }
}
