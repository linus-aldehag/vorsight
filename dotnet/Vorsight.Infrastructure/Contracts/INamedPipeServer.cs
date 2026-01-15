using Vorsight.Contracts.IPC;

namespace Vorsight.Infrastructure.Contracts;

/// <summary>
/// Interface for Named Pipe server implementation.
/// Handles bidirectional communication between Service and Agent.
/// Messages stay off-disk (in-memory only).
/// </summary>
public interface INamedPipeServer : IDisposable
{
    /// <summary>
    /// Starts the Named Pipe server listening for connections.
    /// </summary>
    Task StartAsync();

    /// <summary>
    /// Stops the Named Pipe server and closes all connections.
    /// </summary>
    Task StopAsync();

    /// <summary>
    /// Sends a message to a specific session.
    /// </summary>
    Task SendMessageAsync(PipeMessage message, uint sessionId);

    /// <summary>
    /// Broadcasts a message to all connected sessions.
    /// </summary>
    Task BroadcastMessageAsync(PipeMessage message);

    /// <summary>
    /// Event raised when a message is received from the Agent.
    /// </summary>
    event EventHandler<PipeMessageReceivedEventArgs> MessageReceived;

    /// <summary>
    /// Event raised when a client connects.
    /// </summary>
    event EventHandler<SessionConnectedEventArgs> SessionConnected;

    /// <summary>
    /// Event raised when a client disconnects.
    /// </summary>
    event EventHandler<SessionDisconnectedEventArgs> SessionDisconnected;

    /// <summary>
    /// Gets whether the server is currently running.
    /// </summary>
    bool IsRunning { get; }

    /// <summary>
    /// Gets the pipe name being used.
    /// </summary>
    string PipeName { get; }
}

/// <summary>
/// Event args for message received.
/// </summary>
public class PipeMessageReceivedEventArgs : EventArgs
{
    public required PipeMessage Message { get; set; }
    public required uint SessionId { get; set; }
}

/// <summary>
/// Event args for session connected.
/// </summary>
public class SessionConnectedEventArgs : EventArgs
{
    public required uint SessionId { get; set; }
    public string? Username { get; set; }
}

/// <summary>
/// Event args for session disconnected.
/// </summary>
public class SessionDisconnectedEventArgs : EventArgs
{
    public required uint SessionId { get; set; }
    public string? Reason { get; set; }
}
