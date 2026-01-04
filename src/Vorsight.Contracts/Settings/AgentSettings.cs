namespace Vorsight.Contracts.Settings;

public class AgentSettings
{
    public int ScreenshotIntervalSeconds { get; set; } = 300;
    public int PingIntervalSeconds { get; set; } = 30;
    public bool IsMonitoringEnabled { get; set; } = true;
    public bool IsAuditEnabled { get; set; } = true;
}
