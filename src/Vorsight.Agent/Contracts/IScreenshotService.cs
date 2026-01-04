using Vorsight.Contracts.Screenshots;

namespace Vorsight.Agent.Contracts;

/// <summary>
/// Screenshot capture service using GDI+.
/// Captures screen images with retry logic and fallback behavior.
/// </summary>
public interface IScreenshotService
{
    /// <summary>
    /// Captures a screenshot of all connected displays.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Screenshot data as PNG bytes, or null on failure</returns>
    Task<byte[]?> CaptureScreenAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets metadata about the last capture (timestamp, resolution, etc.).
    /// </summary>
    ScreenshotMetadata GetLastCaptureMetadata();
}
