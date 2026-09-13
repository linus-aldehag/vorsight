namespace Vorsight.Infrastructure.IO;

public static class PathConfiguration
{
    private static readonly string BaseDataDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
        "Vorsight"
    );

    public static string GetBaseDataDirectory()
    {
        EnsureDirectoryExists(BaseDataDirectory);
        return BaseDataDirectory;
    }

    public static string GetServiceLogPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Logs", "Service");
        EnsureDirectoryExists(path);
        return path;
    }

    public static string GetAgentLogPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Logs", "Agent");
        EnsureDirectoryExists(path);
        return path;
    }

    public static string GetSessionLogPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Logs", "Sessions");
        EnsureDirectoryExists(path);
        return path;
    }

    public static string GetTempPath()
    {
        var path = Path.Combine(BaseDataDirectory, "Temp");
        EnsureDirectoryExists(path);
        return path;
    }

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
