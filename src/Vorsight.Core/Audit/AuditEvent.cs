namespace Vorsight.Core.Audit;

/// <summary>
/// Represents an audit event in the Vörsight audit trail.
/// </summary>
public record AuditEvent
{
    public string EventId { get; set; }
    public string EventType { get; set; }
    public string Username { get; set; }
    public DateTime Timestamp { get; set; }
    public string Details { get; set; }
    public bool IsFlagged { get; set; }
    public string SourceLogName { get; set; }
}
