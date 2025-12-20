using System;
using System.Runtime.InteropServices;

namespace Vorsight.Native
{
    /// <summary>
    /// P/Invoke declarations for Windows shutdown and logoff operations.
    /// Used for "The Threshold" - forcing user logoff when access time expires.
    /// </summary>
    public static class ShutdownInterop
    {
        /// <summary>
        /// Shuts down, restarts, or logs off the system.
        /// </summary>
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool ExitWindowsEx(uint uFlags, uint dwReason);

        /// <summary>
        /// Shuts down and optionally restarts the system.
        /// Modern alternative to ExitWindowsEx with more control.
        /// </summary>
        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern uint InitiateSystemShutdownEx(
            string? lpMachineName,
            string? lpMessage,
            uint dwTimeout,
            bool bForceAppsClosed,
            bool bRebootAfterShutdown,
            uint dwReason);

        /// <summary>
        /// Prevents the system from shutting down (aborts a previous InitiateSystemShutdownEx call).
        /// </summary>
        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern uint AbortSystemShutdown(string? lpMachineName);

        /// <summary>
        /// Locks the workstation display, saving any open documents on all desktops.
        /// </summary>
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool LockWorkStation();

        /// <summary>
        /// Gets the session ID of the current thread.
        /// </summary>
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool ProcessIdToSessionId(uint dwProcessId, out uint pSessionId);

        // Exit flags for ExitWindowsEx
        /// <summary>
        /// Logs off the current user. This terminates the user session.
        /// </summary>
        public const uint EWX_LOGOFF = 0;

        /// <summary>
        /// Shuts down the system.
        /// </summary>
        public const uint EWX_SHUTDOWN = 1;

        /// <summary>
        /// Shuts down and restarts the system.
        /// </summary>
        public const uint EWX_REBOOT = 2;

        /// <summary>
        /// Turns off power (if supported by hardware).
        /// </summary>
        public const uint EWX_POWEROFF = 8;

        /// <summary>
        /// Forces all applications to close.
        /// </summary>
        public const uint EWX_FORCE = 4;

        /// <summary>
        /// Forces all applications to close and shutdown without delay.
        /// </summary>
        public const uint EWX_FORCEIFHUNG = 16;

        /// <summary>
        /// Shutdown reason flags for audit logging.
        /// </summary>
        public const uint SHTDN_REASON_FLAG_PLANNED = 0x80000000;
        public const uint SHTDN_REASON_FLAG_USER_DEFINED = 0x40000000;
        public const uint SHTDN_REASON_MAJOR_APPLICATION = 4;
        public const uint SHTDN_REASON_MINOR_OTHER = 0;
    }
}

