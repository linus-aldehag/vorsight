using Vorsight.Contracts.IPC;

namespace Vorsight.Agent.Contracts;

public interface IIpcService
{
    Task SendMessageAsync(
        PipeMessage.MessageType messageType,
        object? payload,
        uint sessionId,
        string? metadata = null,
        CancellationToken cancellationToken = default);
}
