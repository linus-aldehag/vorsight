using System;
using System.Runtime.InteropServices;
using System.Text;

namespace Vorsight.Interop
{
    public static class User32
    {
        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr OpenInputDesktop(
            uint dwFlags,
            bool fInherit,
            uint dwDesiredAccess
        );

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool CloseDesktop(IntPtr hDesktop);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool GetUserObjectInformation(
            IntPtr hObj,
            int nIndex,
            IntPtr pvInfo,
            int nLength,
            out int lpnLengthNeeded
        );

        public const uint DISCONNECT_IF_SUSPENDED = 0x0100;
        public const uint DESKTOP_READOBJECTS = 0x0001;
        public const uint DESKTOP_CREATEWINDOW = 0x0002;
        public const uint DESKTOP_CREATEMENU = 0x0004;
        public const uint DESKTOP_HOOKCONTROL = 0x0008;
        public const uint DESKTOP_JOURNALRECORD = 0x0010;
        public const uint DESKTOP_JOURNALPLAYBACK = 0x0020;
        public const uint DESKTOP_ENUMERATE = 0x0040;
        public const uint DESKTOP_WRITEOBJECTS = 0x0080;
        public const uint DESKTOP_SWITCHDESKTOP = 0x0100;

        public const int UOI_NAME = 2;

        public static string? GetDesktopName(IntPtr hDesktop)
        {
            int neededLength = 0;
            GetUserObjectInformation(hDesktop, UOI_NAME, IntPtr.Zero, 0, out neededLength);

            if (neededLength == 0)
                return null;

            IntPtr ptr = Marshal.AllocHGlobal(neededLength);
            try
            {
                if (
                    GetUserObjectInformation(
                        hDesktop,
                        UOI_NAME,
                        ptr,
                        neededLength,
                        out neededLength
                    )
                )
                {
                    return Marshal.PtrToStringAnsi(ptr);
                }
            }
            finally
            {
                Marshal.FreeHGlobal(ptr);
            }

            return null;
        }
    }
}
