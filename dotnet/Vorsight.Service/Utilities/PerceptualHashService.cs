using System.Drawing;
using Shipwreck.Phash;
using Shipwreck.Phash.Bitmaps;

namespace Vorsight.Service.Utilities;

/// <summary>
/// Service for calculating and comparing perceptual hashes of screenshots.
/// Uses pHash algorithm to detect visually similar images.
/// </summary>
public interface IPerceptualHashService
{
    /// <summary>
    /// Compute perceptual hash from PNG/image bytes.
    /// </summary>
    string ComputeHash(byte[] imageBytes);

    /// <summary>
    /// Calculate similarity percentage between two hashes (0-100%).
    /// Returns the Hamming distance as a percentage.
    /// </summary>
    double GetSimilarityPercentage(string hash1, string hash2);

    /// <summary>
    /// Check if two hashes are similar based on threshold.
    /// </summary>
    bool IsSimilar(string hash1, string hash2, double thresholdPercent = 5.0);
}

public class PerceptualHashService : IPerceptualHashService
{
    // Hardcoded threshold for initial phase - can be made configurable later
    private const double DefaultThreshold = 5.0;

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public string ComputeHash(byte[] imageBytes)
    {
        using var ms = new MemoryStream(imageBytes);
        using var bitmap = new Bitmap(ms);

        // Convert to luminance image for hashing
        var luminanceImage = bitmap.ToLuminanceImage();

        // Compute pHash digest
        var digest = ImagePhash.ComputeDigest(luminanceImage);

        // Digest.Coefficients is byte[] - convert to base64 string for storage
        return Convert.ToBase64String(digest.Coefficients);
    }

    public double GetSimilarityPercentage(string hash1, string hash2)
    {
        if (string.IsNullOrEmpty(hash1) || string.IsNullOrEmpty(hash2))
        {
            return 100.0; // Treat as completely different
        }

        try
        {
            // Decode base64 hashes to byte arrays
            var bytes1 = Convert.FromBase64String(hash1);
            var bytes2 = Convert.FromBase64String(hash2);

            // Create digests from byte arrays
            Digest digest1 = new Digest();
            digest1.Coefficients = bytes1;
            Digest digest2 = new Digest();
            digest2.Coefficients = bytes2;

            // Calculate cross-correlation (similarity measure)
            // Returns value between 0 (identical) and 1 (completely different)
            var correlation = ImagePhash.GetCrossCorrelation(digest1, digest2);

            // Convert to percentage (0 = identical, 100 = completely different)
            return correlation * 100.0;
        }
        catch
        {
            // On any error, treat as completely different
            return 100.0;
        }
    }

    public bool IsSimilar(string hash1, string hash2, double thresholdPercent = DefaultThreshold)
    {
        var similarity = GetSimilarityPercentage(hash1, hash2);

        // If similarity percentage < threshold, images are considered similar
        return similarity < thresholdPercent;
    }
}
