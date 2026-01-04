using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using Serilog;
using Vorsight.Contracts.IPC;

namespace Vorsight.Agent.Services;

public interface IIpcService
{
    Task SendMessageAsync(PipeMessage.MessageType type, object? payloadData, uint sessionId, string? metadata = null, CancellationToken cancellationToken = default);
}

public class IpcService : IIpcService
{
    private const string PipeName = "VorsightIPC";

    public async Task SendMessageAsync(PipeMessage.MessageType type, object? payloadData, uint sessionId, string? metadata = null, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var pipe = new NamedPipeClientStream(".", PipeName, PipeDirection.Out, PipeOptions.Asynchronous);
            
            Log.Debug("Connecting to IPC pipe: {PipeName}", PipeName);
            await pipe.ConnectAsync(2000, cancellationToken);

            if (!pipe.IsConnected)
                throw new IOException("Failed to connect to IPC pipe");

            byte[]? payloadBytes = null;
            if (payloadData != null)
            {
                 if (payloadData is byte[] bytes)
                     payloadBytes = bytes;
                 else
                 {
                     var json = JsonSerializer.Serialize(payloadData);
                     payloadBytes = Encoding.UTF8.GetBytes(json);
                 }
            }

            var message = new PipeMessage(type, sessionId)
            {
                Payload = payloadBytes,
                Metadata = metadata
            };

            var messageBytes = message.Serialize();

            // Protocol:
            // 1. Send Session ID (4 bytes) - Handshake
            var sessionBytes = BitConverter.GetBytes(sessionId);
            await pipe.WriteAsync(sessionBytes, cancellationToken);

            // 2. Send Message Length (4 bytes)
            var lengthBytes = BitConverter.GetBytes(messageBytes.Length);
            await pipe.WriteAsync(lengthBytes, cancellationToken);
            
            // 3. Send Message Body
            await pipe.WriteAsync(messageBytes, cancellationToken);
            await pipe.FlushAsync(cancellationToken);
            
            Log.Debug("Sent IPC message Type={Type} Size={Size}", type, messageBytes.Length);
        }
        catch (TimeoutException)
        {
            Log.Warning("IPC connection timed out - Service might be down");
            throw; // Propagate or handle?
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to send IPC message");
            throw;
        }
    }
}
