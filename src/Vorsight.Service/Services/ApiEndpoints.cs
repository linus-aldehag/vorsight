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
            IActivityCoordinator activityCoordinator) =>
        {
            var triggerType = string.IsNullOrEmpty(type) ? "ManualApi" : type;
            
            await activityCoordinator.RequestManualScreenshotAsync(triggerType);
            return Results.Ok(new { status = "Screenshot requested", type = triggerType });
        });

        app.MapPost("/api/network", (
            [FromBody] NetworkRequest req, 
            ICommandExecutor executor) =>
        {
            if (req.Action.Equals("ping", StringComparison.OrdinalIgnoreCase))
            {
                var host = string.IsNullOrWhiteSpace(req.Target) ? "localhost" : req.Target;
                var success = executor.RunCommandAsUser("ping", $"-n 4 {host}");
                return success ? Results.Ok(new { status = $"Pinging {host}..." }) : Results.StatusCode(500);
            }
            return Results.BadRequest("Unknown network action");
        });

        app.MapPost("/api/system/shutdown", (
            ICommandExecutor executor) =>
        {
            // Immediate shutdown, no delay, no message
            var success = executor.RunCommandAsUser("shutdown", "/s /t 0");
            return success ? Results.Ok(new { status = "Shutdown initiated" }) : Results.StatusCode(500);
        });

        app.MapPost("/api/system/logout", (
            ICommandExecutor executor) =>
        {
            // Log off current user
            var success = executor.RunCommandAsUser("shutdown", "/l");
            return success ? Results.Ok(new { status = "Logout initiated" }) : Results.StatusCode(500);
        });

        app.MapGet("/api/media/latest-screenshot", async (
            IGoogleDriveService driveService) =>
        {
            var stream = await driveService.DownloadLatestScreenshotAsync();
            if (stream == null) return Results.NotFound("No recent screenshots found.");
            return Results.File(stream, "image/png");
        });
    }
}

public record NetworkRequest(string Action, string? Target);
public record PingRequest(string Host); // Kept for legacy compatibility if needed, but not mapped
