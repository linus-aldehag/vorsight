using System.Runtime.InteropServices;
using System.Text;

namespace Vorsight.Native;

public struct ActivitySnapshot
{
    public string ActiveWindowTitle { get; set; }
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

    public ActivitySnapshot GetSnapshot()
    {
        return new ActivitySnapshot
        {
            ActiveWindowTitle = GetActiveWindowTitle(),
            Timestamp = DateTime.UtcNow
        };
    }

    private string GetActiveWindowTitle()
    {
        var handle = GetForegroundWindow();
        var buff = new StringBuilder(256);
        return GetWindowText(handle, buff, buff.Capacity) > 0 ? buff.ToString() : string.Empty;
    }
}
