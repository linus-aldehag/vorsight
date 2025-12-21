using Microsoft.Extensions.Logging;
using Vorsight.Core.IPC;
using Vorsight.Service.Server;
using Vorsight.Service.Storage;
using Vorsight.Service.Monitoring;

namespace Vorsight.Service.Agents;

public class ScreenshotHandler
{
    private readonly IServerConnection _serverConnection;
    private readonly IUploadQueueProcessor _uploadQueueProcessor;
    private readonly IHealthMonitor _healthMonitor;
    private readonly ILogger<ScreenshotHandler> _logger;

    public ScreenshotHandler(
        IServerConnection serverConnection,
        IUploadQueueProcessor uploadQueueProcessor,
        IHealthMonitor healthMonitor,
        ILogger<ScreenshotHandler> logger)
    {
        _serverConnection = serverConnection;
        _uploadQueueProcessor = uploadQueueProcessor;
        _healthMonitor = healthMonitor;
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
                
                // Upload to Node Server
                var fileId = await _serverConnection.UploadFileAsync(message.Payload, fileName);
                if (fileId != null)
                {
                    await _serverConnection.SendScreenshotNotificationAsync(new
                    {
                        id = fileId,
                        captureTime = DateTime.UtcNow,
                        triggerType = "Auto",
                        googleDriveFileId = (string?)null,
                        isUploaded = true
                    });
                     _logger.LogInformation("Screenshot uploaded to server: {FileId}", fileId);
                }

                // Enqueue for upload (Smart upload will preserve folder structure)
                await _uploadQueueProcessor.EnqueueFileAsync(filePath, CancellationToken.None);
                
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
