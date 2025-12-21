using Serilog;
using Vorsight.Core.IPC;
using Vorsight.Native;

namespace Vorsight.Agent.Services;

public interface IActivityService
{
    Task CollectAndReportAsync(uint sessionId, CancellationToken cancellationToken = default);
}

public class ActivityService(IIpcService ipcService, IUserActivityMonitor activityMonitor) : IActivityService
{
    public async Task CollectAndReportAsync(uint sessionId, CancellationToken cancellationToken = default)
    {
        try
        {
            var snapshot = activityMonitor.GetSnapshot();
            var activeWindow = snapshot.ActiveWindowTitle;

            var activityData = new Vorsight.Core.Models.ActivityData
            {
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                SessionId = sessionId,
                ActiveWindow = activeWindow,
                ProcessName = snapshot.ProcessName
            };

            // Log locally for debugging
            Log.Debug("Activity: Window='{Window}'", activeWindow);

            await ipcService.SendMessageAsync(PipeMessage.MessageType.AuditLog, activityData, sessionId, null, cancellationToken);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to collect/report activity");
            throw;
        }
    }
}
