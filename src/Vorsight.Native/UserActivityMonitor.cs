using System.Runtime.InteropServices;
using System.Text;

namespace Vorsight.Native;

public struct ActivitySnapshot
{
    public string ActiveWindowTitle { get; set; }
    public TimeSpan TimeSinceLastInput { get; set; }
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

    [StructLayout(LayoutKind.Sequential)]
    struct LASTINPUTINFO
    {
        public static readonly int SizeOf = Marshal.SizeOf(typeof(LASTINPUTINFO));

        [MarshalAs(UnmanagedType.U4)]
        public UInt32 cbSize;
        [MarshalAs(UnmanagedType.U4)]
        public UInt32 dwTime;
    }

    [DllImport("user32.dll")]
    private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    public ActivitySnapshot GetSnapshot()
    {
        return new ActivitySnapshot
        {
            ActiveWindowTitle = GetActiveWindowTitle(),
            TimeSinceLastInput = GetTimeSinceLastInput(),
            Timestamp = DateTime.UtcNow
        };
    }

    private string GetActiveWindowTitle()
    {
        var handle = GetForegroundWindow();
        var buff = new StringBuilder(256);
        return GetWindowText(handle, buff, buff.Capacity) > 0 ? buff.ToString() : string.Empty;
    }

    private TimeSpan GetTimeSinceLastInput()
    {
        var lastInputInfo = new LASTINPUTINFO();
        lastInputInfo.cbSize = (uint)Marshal.SizeOf(lastInputInfo);
        
        if (GetLastInputInfo(ref lastInputInfo))
        {
            var envTicks = (uint)Environment.TickCount;
            // Handle wrap-around gracefully-ish (though TickCount wraps every 49.7 days)
            var lastInputTick = lastInputInfo.dwTime;
            
            // This calculation is simple but effective for recent activity
            // If the system has been up for > 49 days, TickCount might wrap vs dwTime
            // Standard way:
            var idleTicks = envTicks - lastInputTick;
            return TimeSpan.FromMilliseconds(idleTicks);
        }

        return TimeSpan.Zero;
    }
}
