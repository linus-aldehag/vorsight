
namespace Vorsight.Core.Models;

public class ActivityData
{
    public long Timestamp { get; set; }
    public uint SessionId { get; set; }
    public string ActiveWindow { get; set; } = string.Empty;
    public string ProcessName { get; set; } = string.Empty;
    public int DurationSeconds { get; set; }
    public string Username { get; set; } = string.Empty;
}
