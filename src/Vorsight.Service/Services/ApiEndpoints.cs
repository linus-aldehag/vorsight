using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Vorsight.Core.IPC;
using Vorsight.Core.Uptime;
using Vorsight.Native;

namespace Vorsight.Service.Services;

public static class ApiEndpoints
{
    public static void MapApiEndpoints(this WebApplication app)
    {
        app.MapGet("/api/status", (
            IHealthMonitor healthMonitor, 
            UptimeMonitor uptimeMonitor, 
            IActivityCoordinator activityCoordinator) =>
        {
            return Results.Json(new
            {
                Health = healthMonitor.GetHealthReport(),
                Uptime = uptimeMonitor.GetCurrentStatus(),
                Activity = activityCoordinator.GetCurrentActivity()
            });
        });

        app.MapPost("/api/screenshot", async (
            [FromQuery] string type, 
            INamedPipeServer ipcServer) =>
        {
            var triggerType = string.IsNullOrEmpty(type) ? "ManualApi" : type;
            
            var request = new PipeMessage(PipeMessage.MessageType.ScreenshotRequest, 0)
            {
                Metadata = $"Type:{triggerType}|Source:API"
            };
            
            await ipcServer.BroadcastMessageAsync(request);
            return Results.Ok(new { status = "Screenshot requested", type = triggerType });
        });
    }
}
