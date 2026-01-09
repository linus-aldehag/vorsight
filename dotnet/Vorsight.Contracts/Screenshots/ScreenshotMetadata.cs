namespace Vorsight.Contracts.Screenshots;

public record ScreenshotMetadata
{
    public DateTime CaptureTime { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public long SizeBytes { get; set; }
}
