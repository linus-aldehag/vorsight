using System.Runtime.InteropServices;
using System.Text;

namespace Vorsight.Native;

public struct ActivitySnapshot
{
    public string ActiveWindowTitle { get; set; }
    public string ProcessName { get; set; }
    public DateTime Timestamp { get; set; }
}

public interface IUserActivityMonitor
{
    ActivitySnapshot GetSnapshot();
}

public class UserActivityMonitor : IUserActivityMonitor
{
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    public ActivitySnapshot GetSnapshot()
    {
        var handle = GetForegroundWindow();
        return new ActivitySnapshot
        {
            ActiveWindowTitle = GetActiveWindowTitle(handle),
            ProcessName = GetProcessName(handle),
            Timestamp = DateTime.UtcNow
        };
    }

    private string GetActiveWindowTitle(IntPtr handle)
    {
        var buff = new StringBuilder(256);
        return GetWindowText(handle, buff, buff.Capacity) > 0 ? buff.ToString() : string.Empty;
    }

    private string GetProcessName(IntPtr handle)
    {
        try
        {
            GetWindowThreadProcessId(handle, out var processId);
            if (processId == 0) return string.Empty;
            return System.Diagnostics.Process.GetProcessById((int)processId).ProcessName;
        }
        catch
        {
            return string.Empty;
        }
    }
}
