namespace Vorsight.Infrastructure.IO;

/// <summary>
/// Centralized path configuration for all Vörsight components.
/// All logs, config, and temp files are stored under %ProgramData%/Vorsight.
/// </summary>
public static class PathConfiguration
{
    private static readonly string BaseDataDirectory = 
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Vorsight");

    /// <summary>
    /// Gets the base Vörsight data directory: %ProgramData%/Vorsight
    /// </summary>
    public static string GetBaseDataDirectory()
    {
        EnsureDirectoryExists(BaseDataDirectory);
        return BaseDataDirectory;
    }

    /// <summary>
    /// Gets the service log directory: %ProgramData%/Vorsight/Logs/Service
    /// </summary>
    public static string GetServiceLogPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Logs", "Service");
        EnsureDirectoryExists(path);
        return path;
    }

    /// <summary>
    /// Gets the agent log directory: %ProgramData%/Vorsight/Logs/Agent
    /// </summary>
    public static string GetAgentLogPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Logs", "Agent");
        EnsureDirectoryExists(path);
        return path;
    }

    /// <summary>
    /// Gets the session log directory: %ProgramData%/Vorsight/Logs/Sessions
    /// </summary>
    public static string GetSessionLogPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Logs", "Sessions");
        EnsureDirectoryExists(path);
        return path;
    }

    /// <summary>
    /// Gets the temp directory: %ProgramData%/Vorsight/Temp
    /// </summary>
    public static string GetTempPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Temp");
        EnsureDirectoryExists(path);
        return path;
    }

    /// <summary>
    /// Gets the screenshot temp directory: %ProgramData%/Vorsight/Temp/Screenshots
    /// </summary>
    public static string GetScreenshotTempPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Temp", "Screenshots");
        EnsureDirectoryExists(path);
        return path;
    }

    private static void EnsureDirectoryExists(string path)
    {
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }
}
