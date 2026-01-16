using Microsoft.Extensions.Logging;
using Vorsight.Contracts.IPC;
using Vorsight.Service.Monitoring;

namespace Vorsight.Service.Agents;

public class ActivityLogHandler
{
    private readonly IActivityCoordinator _activityCoordinator;
    private readonly ILogger<ActivityLogHandler> _logger;
    private readonly IHealthMonitor _healthMonitor;

    public ActivityLogHandler(
        IActivityCoordinator activityCoordinator,
        ILogger<ActivityLogHandler> logger,
        IHealthMonitor healthMonitor
    )
    {
        _activityCoordinator = activityCoordinator;
        _logger = logger;
        _healthMonitor = healthMonitor;
    }

    public void HandleActivity(uint sessionId, PipeMessage message)
    {
        _logger.LogDebug(
            "Activity data from session {SessionId}: {SizeBytes} bytes, ID={MessageId}",
            sessionId,
            message.Payload?.Length ?? 0,
            message.MessageId
        );

        try
        {
            if (message.Payload != null && message.Payload.Length > 0)
            {
                var json = System.Text.Encoding.UTF8.GetString(message.Payload);
                var data =
                    System.Text.Json.JsonSerializer.Deserialize<Vorsight.Contracts.Models.ActivityData>(
                        json
                    );

                if (data != null)
                {
                    _activityCoordinator.UpdateActivity(data);
                    // Note: RecordActivitySuccess is called in ActivityCoordinator.UpdateActivity
                }
                else
                {
                    _healthMonitor.RecordActivityFailure();
                    _logger.LogWarning(
                        "Activity data deserialized to null from session {SessionId}",
                        sessionId
                    );
                }
            }
            else
            {
                _healthMonitor.RecordActivityFailure();
                _logger.LogWarning("Empty activity payload from session {SessionId}", sessionId);
            }
        }
        catch (Exception ex)
        {
            _healthMonitor.RecordActivityFailure();
            _logger.LogError(
                ex,
                "Failed to parse activity data from session {SessionId}",
                sessionId
            );
        }
    }
}
