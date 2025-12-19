using System.Collections.Concurrent;
using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using Microsoft.Extensions.Logging;

namespace Vorsight.Core.IPC;

/// <summary>
/// Implementation of Named Pipe server for IPC communication.
/// Handles bidirectional communication between Service and Agent.
/// </summary>
public class NamedPipeServer(ILogger<NamedPipeServer> logger, string pipeName = "VorsightIPC")
    : INamedPipeServer
{
    private NamedPipeServerStream _serverStream;
    private CancellationTokenSource _cancellationTokenSource;
    private Task _listenerTask;
    private readonly ConcurrentDictionary<uint, NamedPipeServerStream> _sessions = new();
    private bool _disposed;

    // Event for handling client connections
    public event EventHandler<SessionConnectedEventArgs> SessionConnected;
    public event EventHandler<SessionDisconnectedEventArgs> SessionDisconnected;
    public event EventHandler<PipeMessageReceivedEventArgs> MessageReceived;

    public bool IsRunning => !_listenerTask.IsCompleted;
    public string PipeName { get; } = pipeName;

    public async Task StartAsync()
    {
        ThrowIfDisposed();

        _cancellationTokenSource = new CancellationTokenSource();
        _listenerTask = ListenForConnectionsAsync(_cancellationTokenSource.Token);

        logger.LogInformation("Named Pipe server started on pipe: {PipeName}", PipeName);
        await Task.CompletedTask;
    }

    public async Task StopAsync()
    {
        ThrowIfDisposed();

        _cancellationTokenSource?.Cancel();

        if (_listenerTask != null)
        {
            try
            {
                await _listenerTask;
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown
            }
        }

        // Close all client connections
        foreach (var session in _sessions.Values)
        {
            try
            {
                session?.Dispose();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error closing session connection");
            }
        }

        _sessions.Clear();
        logger.LogInformation("Named Pipe server stopped");
    }

    public async Task SendMessageAsync(PipeMessage message, uint sessionId)
    {
        ThrowIfDisposed();

        if (!_sessions.TryGetValue(sessionId, out var pipe))
        {
            logger.LogWarning("Session {SessionId} not connected", sessionId);
            throw new InvalidOperationException($"Session {sessionId} not connected");
        }

        try
        {
            var data = message.Serialize();
            var lengthBytes = BitConverter.GetBytes(data.Length);
            
            // Write length prefix first
            await pipe.WriteAsync(lengthBytes, 0, 4);
            await pipe.WriteAsync(data, 0, data.Length);
            await pipe.FlushAsync();

            logger.LogDebug("Message sent to session {SessionId}: {MessageType}", sessionId, message.Type);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error sending message to session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task BroadcastMessageAsync(PipeMessage message)
    {
        ThrowIfDisposed();

        var data = message.Serialize();
        var tasks = new Task[_sessions.Count];
        var index = 0;

        foreach (var sessionId in _sessions.Keys)
        {
            tasks[index++] = SendMessageAsync(message, sessionId);
        }

        await Task.WhenAll(tasks);
        logger.LogDebug("Message broadcast to {SessionCount} sessions", _sessions.Count);
    }

    private async Task ListenForConnectionsAsync(CancellationToken cancellationToken)
    {
        bool fallbackToDefaultSecurity = false;
        bool worldAccessEstablished = false;
        
        // Create security object allowing Everyone to read/write - created ONCE reused
        var pipeSecurity = new PipeSecurity();
        pipeSecurity.AddAccessRule(new PipeAccessRule(
            new SecurityIdentifier(WellKnownSidType.WorldSid, null),
            PipeAccessRights.ReadWrite,
            AccessControlType.Allow));

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                NamedPipeServerStream pipeServer = null;
                try
                {
                    // Strategy 1: World Access (Preferred)
                    if (!fallbackToDefaultSecurity)
                    {
                        try 
                        {
                            pipeServer = NamedPipeServerStreamAcl.Create(
                                PipeName,
                                PipeDirection.InOut,
                                NamedPipeServerStream.MaxAllowedServerInstances,
                                PipeTransmissionMode.Byte,
                                PipeOptions.Asynchronous,
                                0, 
                                0, 
                                pipeSecurity);
                            
                            // If we succeed, we LOCK onto this strategy
                            worldAccessEstablished = true;
                        }
                        catch (UnauthorizedAccessException)
                        {
                            if (worldAccessEstablished)
                            {
                                // CRITICAL: We previously succeeded with World Access, but now failed.
                                // We CANNOT switch to Default Security because existing pipe instances use World Access.
                                // Switching would cause a mismatch error. We must retry World Access.
                                logger.LogError("Insufficient permissions to create subsequent Named Pipe with World access. Retrying in 1s do to ACL constraints...");
                                await Task.Delay(1000, cancellationToken);
                                continue; 
                            }
                            else
                            {
                                // First attempt failed? Okay to fallback.
                                logger.LogWarning("Insufficient permissions to create Named Pipe with World access. Switching to Default Permissions strategy for future connections.");
                                fallbackToDefaultSecurity = true;
                            }
                        }
                    }

                    // Strategy 2: Default Security (Fallback)
                    if (pipeServer == null && fallbackToDefaultSecurity) 
                    {
                         try
                        {
                            pipeServer = NamedPipeServerStreamAcl.Create(
                                PipeName,
                                PipeDirection.InOut,
                                NamedPipeServerStream.MaxAllowedServerInstances,
                                PipeTransmissionMode.Byte,
                                PipeOptions.Asynchronous,
                                0, 
                                0, 
                                null); // Default security

                            logger.LogDebug("Created Named Pipe with default permissions.");
                        }
                        catch (Exception exFallback)
                        {
                            logger.LogError(exFallback, "Failed to create Named Pipe even with default permissions. IPC will be disabled.");
                            // If we fail here, we are truly stuck. Wait a bit to avoid hot loop.
                            await Task.Delay(5000, cancellationToken);
                            continue;
                        }
                    }
                    
                    if (pipeServer == null) continue; // Should have been handled above, but safety check

                    logger.LogDebug("Pipe created on: {PipeName}", PipeName);
                    logger.LogDebug("Waiting for client connection on pipe: {PipeName}", PipeName);

                    // Wait for client connection
                    await pipeServer.WaitForConnectionAsync(cancellationToken);

                    logger.LogInformation("Client connected to pipe: {PipeName}", PipeName);

                    // Handle the client in a separate task (don't await - continue listening)
                    _ = HandleClientAsync(pipeServer, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    pipeServer?.Dispose();
                    break;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error accepting client connection");
                    pipeServer?.Dispose();
                    // Wait before retrying loop to avoid log spam
                    await Task.Delay(1000, cancellationToken); 
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Pipe listener task failed");
        }
    }


    private async Task HandleClientAsync(NamedPipeServerStream pipe, CancellationToken cancellationToken)
    {
        uint sessionId = 0;
        try
        {
            using (pipe)
            {
                // Read session ID from client
                var sessionIdBytes = new byte[4];
                var bytesRead = await pipe.ReadAsync(sessionIdBytes, 0, 4, cancellationToken);
                    
                if (bytesRead != 4)
                {
                    logger.LogWarning("Invalid session ID received");
                    return;
                }

                sessionId = BitConverter.ToUInt32(sessionIdBytes, 0);

                // Register the session
                if (!_sessions.TryAdd(sessionId, pipe))
                {
                    logger.LogWarning("Session {SessionId} already registered", sessionId);
                    return;
                }

                logger.LogInformation("Session {SessionId} registered", sessionId);
                SessionConnected?.Invoke(this, new SessionConnectedEventArgs { SessionId = sessionId });

                // Message loop
                while (!cancellationToken.IsCancellationRequested && pipe.IsConnected)
                {
                    try
                    {
                        // 1. Read Message Length (4 bytes)
                        var lengthBuffer = new byte[4];
                        bytesRead = await pipe.ReadAsync(lengthBuffer, 0, 4, cancellationToken);

                        if (bytesRead == 0)
                        {
                            logger.LogInformation("Session {SessionId} disconnected", sessionId);
                            break;
                        }

                        if (bytesRead < 4)
                        {
                            // Partial header read - checking if we can read the rest
                            int headerRemaining = 4 - bytesRead;
                            while (headerRemaining > 0)
                            {
                                int read = await pipe.ReadAsync(lengthBuffer, 4 - headerRemaining, headerRemaining, cancellationToken);
                                if (read == 0) throw new EndOfStreamException("Connection closed during header read");
                                headerRemaining -= read;
                            }
                        }

                        int messageLength = BitConverter.ToInt32(lengthBuffer, 0);

                        // Validity check (max 10MB to prevent OOM)
                        if (messageLength <= 0 || messageLength > 10 * 1024 * 1024)
                        {
                            logger.LogWarning("Invalid message length received: {Length}", messageLength);
                            break; // Disconnect
                        }

                        // 2. Read Message Body
                        var messageBuffer = new byte[messageLength];
                        int totalRead = 0;
                        while (totalRead < messageLength)
                        {
                            int read = await pipe.ReadAsync(messageBuffer, totalRead, messageLength - totalRead, cancellationToken);
                            if (read == 0) throw new EndOfStreamException("Connection closed during body read");
                            totalRead += read;
                        }

                        // Deserialize and process message
                        var message = PipeMessage.Deserialize(messageBuffer, messageLength);
                        logger.LogDebug("Message received from session {SessionId}: {MessageType}", sessionId, message.Type);

                        MessageReceived?.Invoke(this, new PipeMessageReceivedEventArgs
                        {
                            SessionId = sessionId,
                            Message = message
                        });
                    }
                    catch (EndOfStreamException)
                    {
                        logger.LogInformation("Session {SessionId} disconnected (EOF)", sessionId);
                        break;
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Error reading message from session {SessionId}", sessionId);
                        break;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error handling client");
        }
        finally
        {
            if (sessionId > 0)
            {
                _sessions.TryRemove(sessionId, out _);
                SessionDisconnected?.Invoke(this, new SessionDisconnectedEventArgs { SessionId = sessionId });
                logger.LogInformation("Session {SessionId} unregistered", sessionId);
            }
        }
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(NamedPipeServer));
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        try
        {
            _cancellationTokenSource?.Cancel();
            _serverStream?.Dispose();
            foreach (var session in _sessions.Values)
            {
                try { session?.Dispose(); } catch { }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error disposing Named Pipe server");
        }

        _disposed = true;
        GC.SuppressFinalize(this);
    }
}
