using Microsoft.Extensions.Logging;
using Vorsight.Core.IPC;

namespace Vorsight.Service.IPC;

using Vorsight.Service.Agents;

public interface IIpcMessageRouter
{
    Task RouteMessageAsync(object sender, PipeMessageReceivedEventArgs e);
}

public class IpcMessageRouter : IIpcMessageRouter
{
    private readonly ScreenshotHandler _screenshotHandler;
    private readonly ActivityLogHandler _activityLogHandler;
    private readonly ILogger<IpcMessageRouter> _logger;

    public IpcMessageRouter(
        ScreenshotHandler screenshotHandler,
        ActivityLogHandler activityLogHandler,
        ILogger<IpcMessageRouter> logger)
    {
        _screenshotHandler = screenshotHandler;
        _activityLogHandler = activityLogHandler;
        _logger = logger;
    }

    public async Task RouteMessageAsync(object sender, PipeMessageReceivedEventArgs e)
    {
        try
        {
            _logger.LogInformation(
                "Agent message received from session {SessionId}: Type={MessageType}, Size={PayloadSize} bytes",
                e.SessionId,
                e.Message.Type,
                e.Message.Payload?.Length ?? 0);

            // Handle different message types
            switch (e.Message.Type)
            {
                case PipeMessage.MessageType.Screenshot:
                    await _screenshotHandler.HandleScreenshotMessageAsync(e.SessionId, e.Message);
                    break;

                case PipeMessage.MessageType.PingResponse:
                    HandlePingResponse(e.SessionId, e.Message);
                    break;

                case PipeMessage.MessageType.AuditLog:
                    _activityLogHandler.HandleAuditLog(e.SessionId, e.Message);
                    break;

                default:
                    _logger.LogWarning("Unknown message type received: {MessageType}", e.Message.Type);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message from session {SessionId}", e.SessionId);
        }
    }

    private void HandlePingResponse(uint sessionId, PipeMessage message)
    {
        _logger.LogDebug(
            "Heartbeat response from session {SessionId}: ID={MessageId}, Time={CreatedUtc}",
            sessionId,
            message.MessageId,
            message.CreatedUtc);
    }
}
