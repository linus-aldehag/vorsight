namespace Vorsight.Contracts.Audit;

/// <summary>
/// Represents an audit event in the Vörsight audit trail.
/// </summary>
public record AuditEvent
{
    public required string EventId { get; set; }
    public required string EventType { get; set; }
    public required string Username { get; set; }
    public DateTime Timestamp { get; set; }
    public required string Details { get; set; }
    public bool IsFlagged { get; set; }
    public required string SourceLogName { get; set; }
}
