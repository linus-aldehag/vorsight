using System.Runtime.InteropServices;
using Serilog;
using Vorsight.Agent.Contracts;
using Vorsight.Contracts.IPC;
using Vorsight.Infrastructure.Monitoring;
using Vorsight.Interop;

namespace Vorsight.Agent.Services;

public class ActivityService(IIpcService ipcService, IUserActivityMonitor activityMonitor)
    : IActivityService
{
    public async Task CollectAndReportAsync(
        uint sessionId,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var snapshot = activityMonitor.GetSnapshot();
            var activeWindow = snapshot.ActiveWindowTitle;
            var username = GetSessionUsername(sessionId);

            var activityData = new Vorsight.Contracts.Models.ActivityData
            {
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                SessionId = sessionId,
                ActiveWindow = activeWindow,
                ProcessName = snapshot.ProcessName,
                Username = username,
            };

            // Log locally for debugging
            Log.Debug("Activity: User='{Username}', Window='{Window}'", username, activeWindow);

            await ipcService.SendMessageAsync(
                PipeMessage.MessageType.Activity,
                activityData,
                sessionId,
                null,
                cancellationToken
            );
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to collect/report activity");
            throw;
        }
    }

    private static string GetSessionUsername(uint sessionId)
    {
        IntPtr buffer = IntPtr.Zero;
        try
        {
            if (
                SessionInterop.WTSQuerySessionInformation(
                    SessionInterop.WTS_CURRENT_SERVER_HANDLE,
                    sessionId,
                    SessionInterop.WTS_INFO_CLASS.WTSUserName,
                    out buffer,
                    out uint bytesReturned
                )
            )
            {
                var username = Marshal.PtrToStringAnsi(buffer);
                return username ?? Environment.UserName;
            }
            return Environment.UserName; // Fallback
        }
        finally
        {
            if (buffer != IntPtr.Zero)
            {
                SessionInterop.WTSFreeMemory(buffer);
            }
        }
    }
}
