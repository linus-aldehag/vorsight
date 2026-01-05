namespace Vorsight.Contracts.Settings;

public class AgentSettings
{
    public int ScreenshotIntervalSeconds { get; set; } = 0;
    public int PingIntervalSeconds { get; set; } = 0;
    public bool IsMonitoringEnabled { get; set; } = false;
    public bool IsAuditEnabled { get; set; } = false;
}
