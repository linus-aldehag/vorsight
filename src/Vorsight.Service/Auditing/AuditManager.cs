using Vorsight.Service.Storage;
using System.Text;

namespace Vorsight.Service.Auditing;

public class AuditReport
{
    public bool Passed { get; set; } = true;
    public List<string> Warnings { get; set; } = new();
    public DateTime Timestamp { get; set; }
}

public interface IHealthAuditManager
{
    Task<AuditReport> PerformAuditAsync();
    AuditReport? GetLastReport();
}

public class HealthAuditManager : IHealthAuditManager
{
    private readonly ILogger<HealthAuditManager> _logger;
    private readonly IGoogleDriveService _driveService;
    private readonly IConfiguration _config;
    
    private AuditReport? _lastReport;
    private DateTime _lastAuditTime = DateTime.MinValue;

    public HealthAuditManager(
        ILogger<HealthAuditManager> logger,
        IGoogleDriveService driveService,
        IConfiguration config)
    {
        _logger = logger;
        _driveService = driveService;
        _config = config;
    }

    public AuditReport? GetLastReport() => _lastReport;

    public async Task<AuditReport> PerformAuditAsync()
    {
        // Don't audit too frequently (throttle to 1 minute)
        if (_lastReport != null && DateTime.UtcNow - _lastAuditTime < TimeSpan.FromMinutes(1))
        {
            return _lastReport;
        }

        var report = new AuditReport { Timestamp = DateTime.UtcNow };
        var warnings = new List<string>();

        try
        {
            // Check if Agent executable exists
            var agentPath = _config.GetValue<string>("Agent:ExecutablePath");
            if (string.IsNullOrEmpty(agentPath) || !File.Exists(agentPath))
            {
                // Try fallback paths
                var fallbackPath = Path.Combine(AppContext.BaseDirectory, "wuapihost.exe");
                if (!File.Exists(fallbackPath))
                {
                    var devPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../Vorsight.Agent/bin/Debug/net10.0-windows/win-x64/Vorsight.Agent.exe"));
                    if (!File.Exists(devPath))
                    {
                        warnings.Add("Agent executable not found.");
                    }
                }
            }

            // 3. Check Disk Space (Generic check on Temp path)
            var driveInfo = new DriveInfo(Path.GetPathRoot(Path.GetTempPath()) ?? "C:\\");
            if (driveInfo.AvailableFreeSpace < 100 * 1024 * 1024) // 100MB
            {
                warnings.Add($"Low disk space on {driveInfo.Name} (<100MB free).");
            }

            if (warnings.Count > 0)
            {
                report.Passed = false;
                report.Warnings = warnings;
                _logger.LogWarning("System Audit Failed: {Warnings}", string.Join(", ", warnings));
            }
            else
            {
                _logger.LogDebug("System Audit Passed");
            }
        }
        catch (Exception ex)
        {
            report.Passed = false;
            report.Warnings.Add($"Audit crashed: {ex.Message}");
            _logger.LogError(ex, "Audit failed with exception");
        }

        _lastReport = report;
        _lastAuditTime = DateTime.UtcNow;
        return report;
    }
}
