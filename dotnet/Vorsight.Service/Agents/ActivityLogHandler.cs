using Vorsight.Contracts.IPC;
using Vorsight.Contracts.Models;
using Vorsight.Service.Monitoring;
using static System.Text.Encoding;

namespace Vorsight.Service.Agents;

public class ActivityLogHandler(
    IActivityCoordinator activityCoordinator,
    ILogger<ActivityLogHandler> logger,
    IHealthMonitor healthMonitor
)
{
    public void HandleActivity(uint sessionId, PipeMessage message)
    {
        logger.LogDebug(
            "Activity data from session {SessionId}: {SizeBytes} bytes, ID={MessageId}",
            sessionId,
            message.Payload?.Length ?? 0,
            message.MessageId
        );

        try
        {
            if (message.Payload is { Length: > 0 })
            {
                var json = UTF8.GetString(message.Payload);
                var data = System.Text.Json.JsonSerializer.Deserialize<ActivityData>(json);

                if (data != null)
                {
                    activityCoordinator.UpdateActivity(data);
                    // Note: RecordActivitySuccess is called in ActivityCoordinator.UpdateActivity
                }
                else
                {
                    healthMonitor.RecordActivityFailure();
                    logger.LogWarning(
                        "Activity data deserialized to null from session {SessionId}",
                        sessionId
                    );
                }
            }
            else
            {
                healthMonitor.RecordActivityFailure();
                logger.LogWarning("Empty activity payload from session {SessionId}", sessionId);
            }
        }
        catch (Exception ex)
        {
            healthMonitor.RecordActivityFailure();
            logger.LogError(
                ex,
                "Failed to parse activity data from session {SessionId}",
                sessionId
            );
        }
    }
}
