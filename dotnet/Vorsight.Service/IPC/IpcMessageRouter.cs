using Vorsight.Contracts.IPC;
using Vorsight.Infrastructure.Contracts;

namespace Vorsight.Service.IPC;

using Agents;

public interface IIpcMessageRouter
{
    Task RouteMessageAsync(object _, PipeMessageReceivedEventArgs e);
}

public class IpcMessageRouter(
    ScreenshotHandler screenshotHandler,
    ActivityLogHandler activityLogHandler,
    ILogger<IpcMessageRouter> logger
) : IIpcMessageRouter
{
    public async Task RouteMessageAsync(object sender, PipeMessageReceivedEventArgs e)
    {
        try
        {
            logger.LogDebug(
                "Agent message received from session {SessionId}: Type={MessageType}, Size={PayloadSize} bytes",
                e.SessionId,
                e.Message.Type,
                e.Message.Payload?.Length ?? 0
            );

            // Handle different message types
            switch (e.Message.Type)
            {
                case PipeMessage.MessageType.Screenshot:
                    await screenshotHandler.HandleScreenshotMessageAsync(e.SessionId, e.Message);
                    break;

                case PipeMessage.MessageType.Activity:
                    activityLogHandler.HandleActivity(e.SessionId, e.Message);
                    break;

                default:
                    logger.LogWarning(
                        "Unknown message type received: {MessageType}",
                        e.Message.Type
                    );
                    break;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing message from session {SessionId}", e.SessionId);
        }
    }
}
