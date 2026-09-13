using Vorsight.Contracts.Screenshots;

namespace Vorsight.Agent.Contracts;

public interface IScreenshotService
{
    Task<byte[]?> CaptureScreenAsync(CancellationToken cancellationToken = default);
    ScreenshotMetadata GetLastCaptureMetadata();
}
