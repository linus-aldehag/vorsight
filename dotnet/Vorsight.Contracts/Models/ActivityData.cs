namespace Vorsight.Contracts.Models;

public class ActivityData
{
    public long Timestamp { get; init; }
    public uint SessionId { get; init; }
    public string ActiveWindow { get; init; } = string.Empty;
    public string ProcessName { get; init; } = string.Empty;
    public int DurationSeconds { get; init; }
    public string Username { get; init; } = string.Empty;
}
