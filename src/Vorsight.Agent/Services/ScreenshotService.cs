using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;
using Vorsight.Agent.Contracts;
using Vorsight.Contracts.Screenshots;

namespace Vorsight.Agent.Services;

/// <summary>
/// Windows-specific implementation of screenshot service.
/// Uses System.Windows.Forms for multi-monitor support.
/// </summary>
public class ScreenshotService(ILogger<IScreenshotService> logger) : IScreenshotService
{
    private static readonly SemaphoreSlim ScreenshotLock = new(1, 1);
    private ScreenshotMetadata? _lastMetadata;

    public async Task<byte[]?> CaptureScreenAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await ScreenshotLock.WaitAsync(cancellationToken);

            // Ensure the screen has time to update
            await Task.Delay(200, cancellationToken);

            Bitmap? bitmap = null;
            try
            {
                bitmap = CaptureScreenInternal();

                // Convert to PNG bytes
                using var memoryStream = new System.IO.MemoryStream();
                bitmap.Save(memoryStream, ImageFormat.Png);
                var pngData = memoryStream.ToArray();

                // Update metadata
                _lastMetadata = new ScreenshotMetadata
                {
                    CaptureTime = DateTime.UtcNow,
                    Width = bitmap.Width,
                    Height = bitmap.Height,
                    SizeBytes = pngData.Length
                };

                logger.LogDebug("Screenshot captured successfully: {Width}x{Height}, {SizeBytes} bytes",
                    bitmap.Width, bitmap.Height, pngData.Length);

                return pngData;
            }
            finally
            {
                bitmap?.Dispose();
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogDebug("Screenshot capture was cancelled");
            return null;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to capture screenshot");
            try
            {
                // Try with fallback method
                return await CaptureFallbackAsync(cancellationToken);
            }
            catch (Exception fallbackEx)
            {
                logger.LogError(fallbackEx, "Fallback screenshot capture also failed");
                return null;
            }
        }
        finally
        {
            ScreenshotLock.Release();
        }
    }

    public ScreenshotMetadata GetLastCaptureMetadata()
    {
        return _lastMetadata ?? new ScreenshotMetadata
        {
            CaptureTime = DateTime.MinValue,
            Width = 0,
            Height = 0,
            SizeBytes = 0
        };
    }

    private Bitmap CaptureScreenInternal()
    {
        var bounds = GetCombinedScreenBounds();
        var bitmap = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format32bppArgb);

        try
        {
            using var graphics = Graphics.FromImage(bitmap);
            graphics.CopyFromScreen(bounds.X, bounds.Y, 0, 0, bounds.Size);
            return bitmap;
        }
        catch
        {
            bitmap?.Dispose();
            throw;
        }
    }

    private async Task<byte[]?> CaptureFallbackAsync(CancellationToken cancellationToken)
    {
        // Attempt capture with retry logic
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                if (attempt > 0)
                {
                    await Task.Delay(100 * (attempt + 1), cancellationToken);
                }

                Bitmap? bitmap = null;
                try
                {
                    bitmap = CaptureScreenInternal();
                    using var memoryStream = new MemoryStream();
                    bitmap.Save(memoryStream, ImageFormat.Png);
                    return memoryStream.ToArray();
                }
                finally
                {
                    bitmap?.Dispose();
                }
            }
            catch (ExternalException ex) when (attempt < 2)
            {
                logger.LogWarning(ex, "Fallback capture attempt {Attempt}/3 failed", attempt + 1);
            }
        }

        // Final fallback: create placeholder image
        logger.LogWarning("All capture attempts failed, creating placeholder image");
        var placeholderBitmap = CreatePlaceholderImage();
        try
        {
            using var memoryStream = new MemoryStream();
            placeholderBitmap.Save(memoryStream, ImageFormat.Png);
            return memoryStream.ToArray();
        }
        finally
        {
            placeholderBitmap?.Dispose();
        }
    }

    private Bitmap CreatePlaceholderImage()
    {
        var bitmap = new Bitmap(800, 600, PixelFormat.Format32bppArgb);

        try
        {
            using var g = Graphics.FromImage(bitmap);
            g.Clear(Color.FromArgb(0, 0, 128)); // Navy blue

            using var fontTitle = new Font("Arial", 16, FontStyle.Bold);
            using var fontInfo = new Font("Arial", 12);
                
            const string title = "Vörsight - Screenshot Failed";
            var timestamp = $"Time: {DateTime.UtcNow:O}";
            var machine = $"Machine: {Environment.MachineName}";

            g.DrawString(title, fontTitle, Brushes.White, 50, 50);
            g.DrawString(timestamp, fontInfo, Brushes.White, 50, 100);
            g.DrawString(machine, fontInfo, Brushes.White, 50, 130);
            g.DrawString("Screen capture failed. Check service logs for details.", fontInfo, Brushes.Yellow, 50, 180);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating placeholder image");
        }

        return bitmap;
    }

    private static Rectangle GetCombinedScreenBounds()
    {
        return Screen.AllScreens.Aggregate(Rectangle.Empty, (current, screen) => 
            Rectangle.Union(current, screen.Bounds));
    }
}
