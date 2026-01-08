namespace Vorsight.Contracts.Settings;

public class AgentSettings
{
    public int ScreenshotIntervalSeconds { get; set; } = 0;
    public int PingIntervalSeconds { get; set; } = 0;
    public bool IsMonitoringEnabled { get; set; } = false;
    public bool IsAuditEnabled { get; set; } = false;
    
    // Feature enable flags (separate from interval configuration)
    public bool IsScreenshotEnabled { get; set; } = false;
    public bool IsActivityEnabled { get; set; } = false;
    public bool IsAccessControlEnabled { get; set; } = false;
    public bool FilterDuplicateScreenshots { get; set; } = true;
    
    // Preserve interval values when features are disabled
    public int? ScreenshotIntervalSecondsWhenEnabled { get; set; }
    public int? PingIntervalSecondsWhenEnabled { get; set; }
}
