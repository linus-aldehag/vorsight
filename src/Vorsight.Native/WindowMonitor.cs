using System.Runtime.InteropServices;
using System.Text;

namespace Vorsight.Native;

public interface IWindowMonitor
{
    string GetActiveWindowTitle();
}

public class WindowMonitor : IWindowMonitor
{
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    public string GetActiveWindowTitle()
    {
        var handle = GetForegroundWindow();
        var buff = new StringBuilder(256); // Increased buffer size just in case
        return GetWindowText(handle, buff, buff.Capacity) > 0 ? buff.ToString() : string.Empty;
    }
}
