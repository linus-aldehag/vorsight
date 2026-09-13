using System.Collections.Concurrent;
using Vorsight.Contracts.DTOs;
using Vorsight.Contracts.IPC;
using Vorsight.Infrastructure.Contracts;
using Vorsight.Service.Monitoring;
using Vorsight.Service.Server;
using Vorsight.Service.Storage;
using Vorsight.Service.Utilities;
using static Vorsight.Infrastructure.IO.PathConfiguration;

namespace Vorsight.Service.Agents;

public class ScreenshotHandler(
    IServerConnection serverConnection,
    IHealthMonitor healthMonitor,
    IGoogleDriveService driveService,
    IPerceptualHashService hashService,
    ISettingsManager settingsManager,
    ILogger<ScreenshotHandler> logger
)
{
    // Track last hash per machine ID for duplicate detection
    private readonly ConcurrentDictionary<string, string> _lastHashPerMachine = new();

    public async Task HandleScreenshotMessageAsync(uint sessionId, PipeMessage message)
    {
        logger.LogDebug(
            "Screenshot received from session {SessionId}: {SizeBytes} bytes, ID={MessageId}",
            sessionId,
            message.Payload?.Length ?? 0,
            message.MessageId
        );

        // Write to temp file and enqueue for upload
        try
        {
            if (message.Payload is { Length: > 0 })
            {
                // Parse metadata first to determine Trigger Type
                var windowTitle = "Unknown";
                var triggerType = "Auto"; // Default

                if (!string.IsNullOrEmpty(message.Metadata))
                {
                    var parts = message.Metadata.Split('|');
                    foreach (var part in parts)
                    {
                        var kvp = part.Split(':', 2);
                        if (kvp.Length == 2)
                        {
                            switch (kvp[0])
                            {
                                case "Title":
                                    windowTitle = kvp[1];
                                    break;
                                case "Type":
                                    triggerType = kvp[1];
                                    break;
                            }
                        }
                    }
                }

                // Check if duplicate filtering is enabled
                var settings = await settingsManager.GetSettingsAsync();
                var machineId = serverConnection.MachineId ?? "unknown";
                bool isManual = string.Equals(
                    triggerType,
                    "Manual",
                    StringComparison.OrdinalIgnoreCase
                );

                if (settings.Screenshots.FilterDuplicates && !isManual)
                {
                    // Calculate perceptual hash
                    string currentHash;
                    try
                    {
                        currentHash = hashService.ComputeHash(message.Payload);
                        logger.LogDebug(
                            "Computed pHash for screenshot: {HashPrefix}...",
                            currentHash.Substring(0, Math.Min(10, currentHash.Length))
                        );
                    }
                    catch (Exception hashEx)
                    {
                        logger.LogWarning(
                            hashEx,
                            "Failed to compute perceptual hash, proceeding with upload"
                        );
                        currentHash = string.Empty;
                    }

                    // Compare with last hash if available
                    if (
                        !string.IsNullOrEmpty(currentHash)
                        && _lastHashPerMachine.TryGetValue(machineId, out var lastHash)
                    )
                    {
                        var similarity = hashService.GetSimilarityPercentage(currentHash, lastHash);

                        logger.LogDebug(
                            "Duplicate Check: Similarity={Similarity:F2}%, Threshold=5%. CurrentHash={CurrentPrefix}, LastHash={LastPrefix}",
                            similarity,
                            currentHash.Substring(0, Math.Min(8, currentHash.Length)),
                            lastHash.Substring(0, Math.Min(8, lastHash.Length))
                        );

                        if (hashService.IsSimilar(currentHash, lastHash))
                        {
                            logger.LogDebug(
                                "Screenshot skipped - too similar to previous ({Similarity:F2}% difference, threshold: 5%). Machine: {MachineId}",
                                similarity,
                                machineId
                            );
                            healthMonitor.RecordScreenshotSuccess(); // Still count as success (system working correctly)
                            return;
                        }
                        else
                        {
                            logger.LogDebug(
                                "Screenshot different enough to upload ({Similarity:F2}% difference). Machine: {MachineId}",
                                similarity,
                                machineId
                            );
                        }
                    }
                    else if (string.IsNullOrEmpty(currentHash))
                    {
                        logger.LogDebug("Current hash empty, skipping duplicate check.");
                    }
                    else
                    {
                        logger.LogDebug(
                            "No previous hash found for machine {MachineId}, skipping comparison.",
                            machineId
                        );
                    }

                    // Update last hash for this machine
                    if (!string.IsNullOrEmpty(currentHash))
                    {
                        _lastHashPerMachine[machineId] = currentHash;
                    }
                }
                else if (isManual)
                {
                    logger.LogDebug("Manual screenshot detected - bypassing duplicate check.");
                }

                // Sanitize filename
                var invalidChars = Path.GetInvalidFileNameChars();
                var sanitizedTitle = new string(
                    windowTitle.Where(ch => !invalidChars.Contains(ch)).ToArray()
                );
                // Truncate if too long (max 50 chars for title)
                if (sanitizedTitle.Length > 50)
                    sanitizedTitle = sanitizedTitle.Substring(0, 50);
                if (string.IsNullOrWhiteSpace(sanitizedTitle))
                    sanitizedTitle = "Unknown";

                // Create Date-based folder structure
                var dateFolder = DateTime.Now.ToString("yyyy-MM-dd");
                var tempPath = Path.Combine(GetScreenshotTempPath(), dateFolder);
                Directory.CreateDirectory(tempPath);

                // Format: HH-mm-ss - {Title}.png (using local time for readability)
                var timestamp = DateTime.Now.ToString("HH-mm-ss");
                var fileName = $"{timestamp} - {sanitizedTitle}.png";
                var filePath = Path.Combine(tempPath, fileName);

                await File.WriteAllBytesAsync(filePath, message.Payload);
                logger.LogInformation("Screenshot saved: {FilePath}", filePath);

                // Upload to Google Drive
                var uploadSucceeded = false;
                try
                {
                    var driveFileId = await driveService.UploadFileAsync(
                        filePath,
                        CancellationToken.None
                    );

                    if (!string.IsNullOrEmpty(driveFileId))
                    {
                        logger.LogInformation(
                            "Screenshot uploaded to Google Drive: {DriveFileId}",
                            driveFileId
                        );

                        // Only notify server (and save to DB) on successful upload
                        await serverConnection.SendScreenshotNotificationAsync(
                            new ScreenshotPayload
                            {
                                Id = driveFileId, // Use Drive ID as screenshot ID
                                CaptureTime = DateTimeOffset.UtcNow,
                                TriggerType = triggerType, // Use parsed trigger type
                                GoogleDriveFileId = driveFileId,
                                IsUploaded = true,
                            }
                        );

                        logger.LogInformation(
                            "Screenshot notification sent to server: DriveID={DriveFileId}",
                            driveFileId
                        );
                        healthMonitor.RecordScreenshotSuccess();
                        uploadSucceeded = true;
                    }
                    else
                    {
                        logger.LogWarning(
                            "Google Drive upload returned empty file ID - not saving to database"
                        );
                        healthMonitor.RecordScreenshotFailure();
                    }
                }
                catch (Exception driveEx)
                {
                    logger.LogError(
                        driveEx,
                        "Failed to upload screenshot to Google Drive - keeping file for retry"
                    );
                    healthMonitor.RecordScreenshotFailure();
                }

                // Only clean up the file if upload succeeded
                if (uploadSucceeded)
                {
                    try
                    {
                        File.Delete(filePath);
                        logger.LogDebug("Deleted local screenshot temp file: {FilePath}", filePath);
                    }
                    catch (Exception deleteEx)
                    {
                        logger.LogWarning(
                            deleteEx,
                            "Failed to delete temp screenshot file: {FilePath}",
                            filePath
                        );
                    }
                }
            }
            else
            {
                logger.LogWarning(
                    "Received empty screenshot payload from session {SessionId}",
                    sessionId
                );
                healthMonitor.RecordScreenshotFailure();
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process screenshot message");
            healthMonitor.RecordScreenshotFailure();
        }
    }
}
