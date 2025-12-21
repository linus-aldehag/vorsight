using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Vorsight.Core.IPC;
using Vorsight.Core.Uptime;
using Vorsight.Native;
using Vorsight.Native;
using Vorsight.Core.Scheduling;

namespace Vorsight.Service.Services;

public static class ApiEndpoints
{
    public static void MapApiEndpoints(this WebApplication app)
    {
        app.MapGet("/api/status", async (
            IHealthMonitor healthMonitor, 
            UptimeMonitor uptimeMonitor, 
            IActivityCoordinator activityCoordinator,
            Services.Auditing.IAuditManager auditManager) =>
        {
            // Trigger audit if needed (it throttles itself)
            var audit = await auditManager.PerformAuditAsync();

            return Results.Json(new
            {
                Health = healthMonitor.GetHealthReport(),
                Uptime = uptimeMonitor.GetCurrentStatus(),
                Activity = activityCoordinator.GetCurrentActivity(),
                Audit = audit
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


        app.MapGet("/api/media/{id}", async (
            string id,
            ITempFileManager tempFileManager,
            IGoogleDriveService driveService) =>
        {
            // First, try to find the file locally by searching for files with this ID in the name
            var tempPath = tempFileManager.GetTempPath();
            var screenshotsPath = Path.Combine(tempPath, "Screenshots");
            
            if (Directory.Exists(screenshotsPath))
            {
                // Search for any file containing the Google Drive ID in its path
                var localFiles = Directory.GetFiles(screenshotsPath, "*.png", SearchOption.AllDirectories);
                var matchingFile = localFiles.FirstOrDefault(f => f.Contains(id) || Path.GetFileNameWithoutExtension(f).Contains(id));
                
                if (matchingFile != null && File.Exists(matchingFile))
                {
                    var fileStream = File.OpenRead(matchingFile);
                    return Results.File(fileStream, "image/png");
                }
            }
            
            // Fallback: Download from Google Drive
            var stream = await driveService.DownloadFileAsync(id);
            if (stream == null) return Results.NotFound();
            return Results.File(stream, "image/png");
        });

        // Get latest screenshot
        app.MapGet("/api/media/latest", async (
            ITempFileManager tempFileManager,
            IGoogleDriveService driveService) =>
        {
            // First, try to get the latest local screenshot
            var tempPath = tempFileManager.GetTempPath();
            var screenshotsPath = Path.Combine(tempPath, "Screenshots");
            
            if (Directory.Exists(screenshotsPath))
            {
                var latestFile = Directory.GetFiles(screenshotsPath, "*.png", SearchOption.AllDirectories)
                    .OrderByDescending(f => File.GetLastWriteTimeUtc(f))
                    .FirstOrDefault();
                    
                if (latestFile != null)
                {
                    var fileStream = File.OpenRead(latestFile);
                    return Results.File(fileStream, "image/png");
                }
            }
            
            // Fallback: Get from Google Drive
            var screenshots = await driveService.ListScreenshotsAsync(1);
            if (screenshots == null || screenshots.Count == 0)
                return Results.NotFound();

            var latest = screenshots[0];
            var stream = await driveService.DownloadFileAsync(latest.Id);
            if (stream == null) return Results.NotFound();
            return Results.File(stream, "image/png");
        });


        app.MapGet("/api/analytics/summary", () =>
        {
            // Activity persistance has been moved to the server.
            // This local endpoint returns empty data for compatibility.
            
            return Results.Json(new 
            { 
                totalActiveHours = 0, 
                timeline = new object[0], 
                topApps = new object[0],
                lastActive = DateTimeOffset.UtcNow
            });
        });
        app.MapGet("/api/schedule", async (
            IScheduleManager scheduleManager,
            IConfiguration config) =>
        {
            var username = config["ChildUser:Username"] ?? "child";
            var schedule = await scheduleManager.GetScheduleAsync(username);
            return Results.Json(schedule);
        });

        app.MapPost("/api/schedule", async (
            [FromBody] AccessSchedule schedule,
            IScheduleManager scheduleManager,
            IConfiguration config) =>
        {
            var username = config["ChildUser:Username"] ?? "child";
            // Ensure we are updating the correct child
            schedule.ChildUsername = username;
            
            try 
            {
                var existing = await scheduleManager.GetScheduleAsync(username);
                if (existing == null)
                {
                    await scheduleManager.CreateScheduleAsync(schedule);
                }
                else
                {
                    // Preserve ID
                    schedule.ScheduleId = existing.ScheduleId;
                    await scheduleManager.UpdateScheduleAsync(schedule);
                }
                return Results.Ok(schedule);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });

        // Expanded Screenshot API
        app.MapGet("/api/screenshots", async (
            IGoogleDriveService driveService,
            [FromQuery] int limit = 20) =>
        {
            var screenshots = await driveService.ListScreenshotsAsync(limit);
            return Results.Json(screenshots);
        });

        // Settings API
        app.MapGet("/api/settings", async (
            Core.Settings.ISettingsManager settingsManager) =>
        {
            var settings = await settingsManager.GetSettingsAsync();
            return Results.Json(settings);
        });

        app.MapPost("/api/settings", async (
            [FromBody] Core.Settings.AgentSettings settings,
            Core.Settings.ISettingsManager settingsManager) =>
        {
            try
            {
                await settingsManager.UpdateSettingsAsync(settings);
                return Results.Ok(settings);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });
    }
}

public record NetworkRequest(string Action, string? Target);
public record PingRequest(string Host); // Kept for legacy compatibility if needed, but not mapped
