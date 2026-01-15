namespace Vorsight.Service.Monitoring;

/// <summary>
/// Represents the health status of activity tracking
/// </summary>
public enum ActivityHealthStatus
{
    /// <summary>
    /// Health status unknown (no data received yet)
    /// </summary>
    Unknown,

    /// <summary>
    /// Activity tracking is healthy
    /// </summary>
    Healthy,

    /// <summary>
    /// Activity tracking is degraded (some failures)
    /// </summary>
    Degraded,

    /// <summary>
    /// Activity tracking has failed (no recent data)
    /// </summary>
    Failed,
}
