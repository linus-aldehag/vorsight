using Microsoft.Extensions.Logging;
using Vorsight.Core.IPC;
using Vorsight.Service.Monitoring;

namespace Vorsight.Service.Agents;

public class ActivityLogHandler
{
    private readonly IActivityCoordinator _activityCoordinator;
    private readonly ILogger<ActivityLogHandler> _logger;

    public ActivityLogHandler(
        IActivityCoordinator activityCoordinator,
        ILogger<ActivityLogHandler> logger)
    {
        _activityCoordinator = activityCoordinator;
        _logger = logger;
    }

    public void HandleAuditLog(uint sessionId, PipeMessage message)
    {
        _logger.LogInformation(
            "Audit log from session {SessionId}: {SizeBytes} bytes, ID={MessageId}",
            sessionId,
            message.Payload?.Length ?? 0,
            message.MessageId);

        try
        {
            if (message.Payload != null && message.Payload.Length > 0)
            {
                var json = System.Text.Encoding.UTF8.GetString(message.Payload);
                var data = System.Text.Json.JsonSerializer.Deserialize<Vorsight.Core.Models.ActivityData>(json);
                
                if (data != null)
                {
                    _activityCoordinator.UpdateActivity(data);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse activity data from session {SessionId}", sessionId);
        }
    }
}
