using Microsoft.Extensions.Logging;
using Vorsight.Core.IPC;
using Vorsight.Service.Server;
using Vorsight.Service.Storage;
using Vorsight.Service.Monitoring;
using System.IO;

namespace Vorsight.Service.Agents;

public class ScreenshotHandler
{
    private readonly IServerConnection _serverConnection;
    private readonly IUploadQueueProcessor _uploadQueueProcessor;
    private readonly IHealthMonitor _healthMonitor;
    private readonly IGoogleDriveService _driveService;
    private readonly ILogger<ScreenshotHandler> _logger;

    public ScreenshotHandler(
        IServerConnection serverConnection,
        IUploadQueueProcessor uploadQueueProcessor,
        IHealthMonitor healthMonitor,
        IGoogleDriveService driveService,
        ILogger<ScreenshotHandler> logger)
    {
        _serverConnection = serverConnection;
        _uploadQueueProcessor = uploadQueueProcessor;
        _healthMonitor = healthMonitor;
        _driveService = driveService;
        _logger = logger;
    }

    public async Task HandleScreenshotMessageAsync(uint sessionId, PipeMessage message)
    {
        _logger.LogInformation(
            "Screenshot received from session {SessionId}: {SizeBytes} bytes, ID={MessageId}",
            sessionId,
            message.Payload?.Length ?? 0,
            message.MessageId);

        // Write to temp file and enqueue for upload
        try
        {
            if (message.Payload != null && message.Payload.Length > 0)
            {
                // Parse metadata for Title
                string windowTitle = "Unknown";
                if (!string.IsNullOrEmpty(message.Metadata))
                {
                    var parts = message.Metadata.Split('|');
                    foreach (var part in parts)
                    {
                        var kvp = part.Split(':', 2);
                        if (kvp.Length == 2 && kvp[0] == "Title")
                        {
                            windowTitle = kvp[1];
                            break;
                        }
                    }
                }

                // Sanitize filename
                var invalidChars = Path.GetInvalidFileNameChars();
                var sanitizedTitle = new string(windowTitle.Where(ch => !invalidChars.Contains(ch)).ToArray());
                // Truncate if too long (max 50 chars for title)
                if (sanitizedTitle.Length > 50) sanitizedTitle = sanitizedTitle.Substring(0, 50);
                if (string.IsNullOrWhiteSpace(sanitizedTitle)) sanitizedTitle = "Unknown";

                // Create Date-based folder structure
                var dateFolder = DateTime.Now.ToString("yyyy-MM-dd");
                var tempPath = Path.Combine(Path.GetTempPath(), "Vorsight", Environment.MachineName, "Screenshots", dateFolder);
                Directory.CreateDirectory(tempPath);
                
                // Format: HH-mm-ss - {Title}.png (using local time for readability)
                var timestamp = DateTime.Now.ToString("HH-mm-ss");
                var fileName = $"{timestamp} - {sanitizedTitle}.png";
                var filePath = Path.Combine(tempPath, fileName);
                
                await File.WriteAllBytesAsync(filePath, message.Payload);
                _logger.LogInformation("Screenshot saved: {FilePath}", filePath);
                
                // Upload to Google Drive
                string? driveFileId = null;
                try
                {
                    driveFileId = await _driveService.UploadFileAsync(filePath, CancellationToken.None);
                    if (string.IsNullOrEmpty(driveFileId))
                    {
                        _logger.LogWarning("Google Drive upload returned empty file ID");
                    }
                    else
                    {
                        _logger.LogInformation("Screenshot uploaded to Google Drive: {DriveFileId}", driveFileId);
                    }
                }
                catch (Exception driveEx)
                {
                    _logger.LogError(driveEx, "Failed to upload screenshot to Google Drive, continuing anyway");
                }

                // Delete local temp file after Drive upload
                try
                {
                    File.Delete(filePath);
                    _logger.LogDebug("Deleted local screenshot temp file: {FilePath}", filePath);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(deleteEx, "Failed to delete temp screenshot file: {FilePath}", filePath);
                }
                
                // Use Drive file ID as the screenshot ID for consistency
                var screenshotId = driveFileId ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
                
                // Notify server with Drive file ID
                await _serverConnection.SendScreenshotNotificationAsync(new
                {
                    id = screenshotId,
                    captureTime = DateTime.UtcNow,
                    triggerType = "Auto",
                    googleDriveFileId = driveFileId,
                    isUploaded = !string.IsNullOrEmpty(driveFileId)
                });
                _logger.LogInformation("Screenshot notification sent to server: ID={ScreenshotId}, DriveID={DriveFileId}", screenshotId, driveFileId ?? "none");
                
                // Record success
                _healthMonitor.RecordScreenshotSuccess();
            }
            else
            {
                _logger.LogWarning("Received empty screenshot payload from session {SessionId}", sessionId);
                _healthMonitor.RecordScreenshotFailure();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process screenshot message");
            _healthMonitor.RecordScreenshotFailure();
        }
    }
}