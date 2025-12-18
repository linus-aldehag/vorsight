# Screenshot Capture System

## Overview

The Screenshot Capture System is the core surveillance feature of Vörsight. It enables real-time capture of user screen activity from the interactive session and transmission to the Service without writing image data to disk.

## Architecture

### Capture Flow

```
Service                              Agent                         User Session
   |                                  |                                |
   |---- IPC: 0x01 Screenshot Req --->|                                |
   |                             [Capture Signal]                      |
   |                                  |                                |
   |                    ScreenshotService.CaptureScreenAsync()        |
   |                                  |                                |
   |                            Semaphore.Wait()-----> GDI+ Rendering |
   |                                  |<------ Screen Buffer (ARGB)   |
   |                         Encode to PNG/JPEG                       |
   |                       Semaphore.Release()                        |
   |                                  |                                |
   |<---- IPC: 0x81 Screenshot Resp---|                                |
   |<------ Image Binary + Metadata --|                                |
   |                                  |                                |
   Store/Process                 Memory Released
```

## Screenshot Service

### IScreenshotService Interface

```csharp
public interface IScreenshotService : IAsyncDisposable
{
    /// <summary>
    /// Captures a screenshot of the primary display
    /// </summary>
    Task<byte[]> CaptureScreenAsync();

    /// <summary>
    /// Captures screenshot with metadata
    /// </summary>
    Task<(byte[] image, ScreenshotMetadata metadata)> CaptureScreenWithMetadataAsync();

    /// <summary>
    /// Gets metadata from last capture (without recapturing)
    /// </summary>
    ScreenshotMetadata GetLastMetadata();
}
```

### Implementation Details

```csharp
public class ScreenshotService : IScreenshotService
{
    private readonly ILogger<IScreenshotService> _logger;
    private readonly SemaphoreSlim _renderSemaphore;
    private ScreenshotMetadata _lastMetadata;

    public ScreenshotService(ILogger<IScreenshotService> logger)
    {
        _logger = logger;
        // Single semaphore to protect GDI+ rendering
        _renderSemaphore = new SemaphoreSlim(1, 1);
    }

    public async Task<byte[]> CaptureScreenAsync()
    {
        try
        {
            // Acquire render lock
            await _renderSemaphore.WaitAsync();

            _logger.LogDebug("Capturing screenshot");

            // Get primary display
            var screen = Screen.PrimaryScreen;
            int width = screen.Bounds.Width;
            int height = screen.Bounds.Height;

            // Create bitmap matching display resolution
            using (var bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb))
            {
                // Render screen to bitmap using GDI+
                using (var graphics = Graphics.FromImage(bitmap))
                {
                    graphics.CopyFromScreen(
                        screen.Bounds.Location,
                        Point.Empty,
                        screen.Bounds.Size,
                        CopyPixelOperation.SourceCopy);
                }

                // Encode to PNG
                using (var stream = new MemoryStream())
                {
                    // PNG encoding
                    var encoder = ImageCodecInfo.GetImageEncoders()
                        .First(c => c.FormatID == ImageFormat.Png.Guid);
                    var encoderParams = new EncoderParameters(1);
                    encoderParams.Param[0] = new EncoderParameter(
                        Encoder.Quality, 100L);  // PNG quality

                    bitmap.Save(stream, encoder, encoderParams);

                    var imageData = stream.ToArray();
                    _logger.LogDebug("Screenshot captured: {Width}x{Height}, {Size} bytes",
                        width, height, imageData.Length);

                    return imageData;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Screenshot capture failed");
            throw;
        }
        finally
        {
            _renderSemaphore.Release();
        }
    }

    public async Task<(byte[] image, ScreenshotMetadata metadata)> 
        CaptureScreenWithMetadataAsync()
    {
        var image = await CaptureScreenAsync();

        var metadata = new ScreenshotMetadata
        {
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Width = Screen.PrimaryScreen.Bounds.Width,
            Height = Screen.PrimaryScreen.Bounds.Height,
            Format = "PNG",
            CompressionLevel = 6,
            ImageHash = ComputeSHA256(image),
            SessionId = GetCurrentSessionId(),
            FileSizeBytes = image.Length
        };

        _lastMetadata = metadata;
        return (image, metadata);
    }

    public ScreenshotMetadata GetLastMetadata() => _lastMetadata;
}
```

## GDI+ Rendering

### Screen Capture Mechanism

**Method**: `Graphics.CopyFromScreen()`

```csharp
// Standard approach for screenshot capture
using (var graphics = Graphics.FromImage(bitmap))
{
    graphics.CopyFromScreen(
        sourceLocation: screen.Bounds.Location,      // Top-left of display
        destinationLocation: Point.Empty,             // Top-left of bitmap
        blockRegionSize: screen.Bounds.Size,          // Full screen
        copyPixelOperation: CopyPixelOperation.SourceCopy
    );
}
```

**Characteristics**:
- Captures entire primary display
- Includes desktop background, windows, cursor
- PixelFormat: 32-bit ARGB (1 byte each for A, R, G, B)
- Resolution: Native display resolution (typically 1920x1080+)
- Performance: 50-200ms depending on resolution

### Direct3D Capture (Future Enhancement)

For better performance on modern systems:

```csharp
// Future: Consider Direct3D 11/12 for GPU-accelerated capture
// Pros: GPU-based, faster, supports HDR
// Cons: More complex, requires D3D setup
```

## Image Encoding

### PNG Encoding

**Format**: Portable Network Graphics

**Advantages**:
- Lossless compression (perfect quality)
- Good compression ratio (typically 70-90% smaller than raw)
- No quality loss
- Wide compatibility

**Disadvantages**:
- Slower encoding than JPEG
- Larger than JPEG at same quality

**Implementation**:
```csharp
var pngEncoder = ImageCodecInfo.GetImageEncoders()
    .First(c => c.FormatID == ImageFormat.Png.Guid);

var encoderParams = new EncoderParameters(1);
encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 100L);

bitmap.Save(stream, pngEncoder, encoderParams);
```

### JPEG Encoding (Optional)

**Format**: Joint Photographic Experts Group

**Advantages**:
- Faster encoding than PNG
- Smaller file size (lossy)
- Suitable for high-refresh captures

**Disadvantages**:
- Lossy compression (quality loss)
- Compression artifacts visible at low quality

**Implementation**:
```csharp
var jpegEncoder = ImageCodecInfo.GetImageEncoders()
    .First(c => c.FormatID == ImageFormat.Jpeg.Guid);

var encoderParams = new EncoderParameters(1);
encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 85L);  // 85% quality

bitmap.Save(stream, jpegEncoder, encoderParams);
```

## Metadata

### ScreenshotMetadata Structure

```csharp
public class ScreenshotMetadata
{
    /// <summary>
    /// Unix timestamp (milliseconds since epoch)
    /// </summary>
    public long Timestamp { get; set; }

    /// <summary>
    /// Display width in pixels
    /// </summary>
    public int Width { get; set; }

    /// <summary>
    /// Display height in pixels
    /// </summary>
    public int Height { get; set; }

    /// <summary>
    /// Image format: "PNG" or "JPEG"
    /// </summary>
    public string Format { get; set; }

    /// <summary>
    /// Compression level (0-9 for PNG, 85-95 for JPEG)
    /// </summary>
    public int CompressionLevel { get; set; }

    /// <summary>
    /// SHA256 hash of image for integrity verification
    /// </summary>
    public string ImageHash { get; set; }

    /// <summary>
    /// Windows session ID (0=System, 1=User, etc.)
    /// </summary>
    public int SessionId { get; set; }

    /// <summary>
    /// Compressed image size in bytes
    /// </summary>
    public long FileSizeBytes { get; set; }
}
```

### Metadata Transmission

Metadata is sent as JSON alongside the binary image:

```json
{
  "timestamp": 1734592725000,
  "width": 1920,
  "height": 1080,
  "format": "png",
  "compressionLevel": 6,
  "imageHash": "sha256:a1b2c3d4e5f6...",
  "sessionId": 1,
  "fileSizeBytes": 234567
}
```

## Capture Flow

### Typical Capture Sequence

```
1. Service wants screenshot
   └─ Send IPC message: 0x01 (Screenshot Request)

2. Agent receives request
   └─ Call ScreenshotService.CaptureScreenWithMetadataAsync()

3. Screenshot Service acquires semaphore
   └─ Protects against concurrent captures

4. GDI+ capture
   └─ Graphics.CopyFromScreen() from primary display

5. Image encoding
   └─ Encode Bitmap to PNG/JPEG byte[]

6. Metadata generation
   └─ Create ScreenshotMetadata (timestamp, hash, etc.)

7. Release semaphore
   └─ Allow next capture

8. Agent sends IPC response
   └─ 0x81 message with image + metadata

9. Service receives and stores
   └─ Database, file system, or memory cache

10. Cleanup
    └─ Bitmap disposed, memory released
```

## Performance Optimization

### Capture Time Analysis

| Phase | Time | Notes |
|-------|------|-------|
| GDI+ capture | 50-100ms | Depends on resolution |
| PNG encoding | 20-80ms | Lossless compression |
| Metadata gen | <1ms | Timestamp, hashing |
| IPC transfer | 10-50ms | Named pipes |
| **Total** | **80-230ms** | Typical full cycle |

### Resolution Impact

| Resolution | Raw Size | PNG ~70% | JPEG ~50% | Capture Time |
|-----------|----------|----------|----------|--------------|
| 1280×720 | 3.7 MB | 1.1 MB | 1.8 MB | 50ms |
| 1920×1080 | 8.3 MB | 2.5 MB | 4.2 MB | 100ms |
| 2560×1440 | 14.7 MB | 4.4 MB | 7.4 MB | 150ms |
| 3840×2160 | 33.2 MB | 10 MB | 16.6 MB | 200ms |

### Optimization Strategies

#### 1. Downscaling for Remote Monitoring

```csharp
public async Task<byte[]> CaptureScreenOptimizedAsync(double scale = 1.0)
{
    if (scale < 1.0)
    {
        // Downscale before encoding
        using (var original = CaptureScreenAsync())
        {
            int scaledWidth = (int)(original.Width * scale);
            int scaledHeight = (int)(original.Height * scale);

            using (var scaled = new Bitmap(scaledWidth, scaledHeight))
            {
                using (var graphics = Graphics.FromImage(scaled))
                {
                    graphics.DrawImage(original, 0, 0, scaledWidth, scaledHeight);
                }
                return EncodeToBytes(scaled);
            }
        }
    }
    
    return await CaptureScreenAsync();
}
```

#### 2. Selective Refresh

```csharp
public async Task<byte[]> CaptureScreenPartialAsync(Rectangle region)
{
    await _renderSemaphore.WaitAsync();
    
    try
    {
        using (var bitmap = new Bitmap(region.Width, region.Height))
        {
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.CopyFromScreen(
                    region.Location, Point.Empty, region.Size,
                    CopyPixelOperation.SourceCopy);
            }
            return EncodeToBytes(bitmap);
        }
    }
    finally
    {
        _renderSemaphore.Release();
    }
}
```

#### 3. JPEG for High-Frequency Captures

```csharp
// Use JPEG for frequent captures to reduce bandwidth
var jpegImage = EncodeAsJpeg(bitmap, quality: 85);
// PNG for periodic archival (better quality)
var pngImage = EncodePng(bitmap);
```

## IPC Integration

### Screenshot Request Message (0x01)

```
┌──────────────────────────────┐
│ Message Type: 0x01           │
├──────────────────────────────┤
│ Payload:                     │
│  - Interval (uint32): 5000ms │
│  - Quality (byte): 0=PNG     │
│  - Flags (byte): 0x01        │
└──────────────────────────────┘
```

### Screenshot Response Message (0x81)

```
┌──────────────────────────────┐
│ Message Type: 0x81           │
├──────────────────────────────┤
│ Image Size (uint32): 234567  │
├──────────────────────────────┤
│ Image Data (binary)          │
├──────────────────────────────┤
│ Metadata Size (uint32): 234  │
├──────────────────────────────┤
│ Metadata JSON                │
└──────────────────────────────┘
```

## Hash Verification

### SHA256 Integrity Check

```csharp
public static string ComputeSHA256(byte[] data)
{
    using (var sha256 = SHA256.Create())
    {
        var hash = sha256.ComputeHash(data);
        return "sha256:" + BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}

// Verification
public static bool VerifyImageHash(byte[] image, string metadataHash)
{
    var computedHash = ComputeSHA256(image);
    return computedHash == metadataHash;
}
```

## Storage & Retention

### No Disk Storage (Design Goal)

The Agent **never writes to disk**. Screenshots are:
1. Captured to memory
2. Encoded to memory
3. Transmitted via IPC to Service
4. Service decides storage strategy

### Service-Side Options

```csharp
// Option 1: Database storage
await _screenshotDb.SaveAsync(sessionId, imageData, metadata);

// Option 2: File system with rotation
var filename = $"{sessionId}-{timestamp}.png";
await File.WriteAllBytesAsync(Path.Combine(_archivePath, filename), imageData);

// Option 3: Memory cache with eviction
_memoryCache.Set(cacheKey, imageData, options: new MemoryCacheEntryOptions
{
    AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(24)
});
```

## Troubleshooting

### Screenshots Blurry or Low Quality

1. Check encoding format (PNG vs JPEG)
2. Verify compression level settings
3. Check for resolution scaling/downsampling
4. Inspect ImageHash for data corruption

### Capture Taking Too Long

1. Monitor display resolution
2. Check for Bitmap disposal delays
3. Profile GDI+ vs IPC transfer time
4. Consider downscaling for high-res displays

### Memory Leaks

1. Verify Bitmap disposal in using statements
2. Check Graphics object cleanup
3. Monitor GC pressure during captures
4. Review IPC buffer allocation

### IPC Transfer Failing

1. Verify payload size < 16MB
2. Check pipe buffer isn't full
3. Ensure Service IPC server is listening
4. Review connection timeout settings

## Security Considerations

### Data Protection

- Screenshots contain sensitive information
- Never log image data or full hashes
- Transmit only over named pipes (local machine)
- Implement retention policies for archival

### Privacy

- Inform users screenshots are being captured
- Provide mechanisms to review/delete captures
- Audit who accesses screenshots
- Compliance with GDPR/privacy regulations

## Related Documentation

- [IPC Protocol Specification](./IPC_PROTOCOL.md)
- [Vorsight.Agent](../components/VORSIGHT_AGENT.md)
- [Vorsight.Core Screenshots Module](../components/VORSIGHT_CORE.md#4-screenshot-system-screenshots)
- [Architecture](../ARCHITECTURE.md)

