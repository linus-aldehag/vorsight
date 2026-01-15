using System;
using System.Runtime.InteropServices;

namespace Vorsight.Interop
{
    /// <summary>
    /// P/Invoke declarations for Windows process and session management.
    /// Enables launching processes into specific user sessions (e.g., Session 1).
    /// </summary>
    public static class ProcessInterop
    {
        // Constants
        public const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
        public const uint NORMAL_PRIORITY_CLASS = 0x00000020;
        public const uint CREATE_NO_WINDOW = 0x08000000;

        // Delegate for process information
        [StructLayout(LayoutKind.Sequential)]
        public struct PROCESS_INFORMATION
        {
            public IntPtr hProcess;
            public IntPtr hThread;
            public uint dwProcessId;
            public uint dwThreadId;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct STARTUPINFO
        {
            public uint cb;
            public string? lpReserved;
            public string? lpDesktop;
            public string? lpTitle;
            public uint dwX;
            public uint dwY;
            public uint dwXSize;
            public uint dwYSize;
            public uint dwXCountChars;
            public uint dwYCountChars;
            public uint dwFillAttribute;
            public uint dwFlags;
            public ushort wShowWindow;
            public ushort cbReserved2;
            public IntPtr lpReserved2;
            public IntPtr hStdInput;
            public IntPtr hStdOutput;
            public IntPtr hStdError;
        }

        /// <summary>
        /// Creates a process as a specified user in a specific session.
        /// This is the critical function for launching wuapihost.exe into the interactive session.
        /// </summary>
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern bool CreateProcessAsUser(
            IntPtr hToken,
            string? lpApplicationName,
            string? lpCommandLine,
            IntPtr lpProcessAttributes,
            IntPtr lpThreadAttributes,
            bool bInheritHandles,
            uint dwCreationFlags,
            IntPtr lpEnvironment,
            string? lpCurrentDirectory,
            ref STARTUPINFO lpStartupInfo,
            out PROCESS_INFORMATION lpProcessInformation
        );

        /// <summary>
        /// Opens the access token associated with a process.
        /// </summary>
        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern bool OpenProcessToken(
            IntPtr ProcessHandle,
            uint DesiredAccess,
            out IntPtr TokenHandle
        );

        /// <summary>
        /// Duplicates an access token so it can be used in CreateProcessAsUser.
        /// </summary>
        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern bool DuplicateTokenEx(
            IntPtr hExistingToken,
            uint dwDesiredAccess,
            IntPtr lpTokenAttributes,
            int ImpersonationLevel,
            int TokenType,
            out IntPtr phNewToken
        );

        /// <summary>
        /// Gets the process handle for a given process ID.
        /// </summary>
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr OpenProcess(
            uint dwDesiredAccess,
            bool bInheritHandle,
            uint dwProcessId
        );

        /// <summary>
        /// Closes an open handle.
        /// </summary>
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool CloseHandle(IntPtr hObject);

        [DllImport("kernel32.dll")]
        public static extern bool ProcessIdToSessionId(uint dwProcessId, out uint pSessionId);

        [DllImport("kernel32.dll")]
        public static extern uint GetCurrentProcessId();

        [DllImport("userenv.dll", SetLastError = true)]
        public static extern bool CreateEnvironmentBlock(
            out IntPtr lpEnvironment,
            IntPtr hToken,
            bool bInherit
        );

        [DllImport("userenv.dll", SetLastError = true)]
        public static extern bool DestroyEnvironmentBlock(IntPtr lpEnvironment);

        // Process access rights
        public const uint PROCESS_ALL_ACCESS = 0x001F0FFF;
        public const uint PROCESS_QUERY_INFORMATION = 0x0400;
        public const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
        public const uint TOKEN_ADJUST_PRIVILEGES = 0x0020;
        public const uint TOKEN_QUERY = 0x0008;
        public const uint TOKEN_DUPLICATE = 0x0002;
        public const uint TOKEN_ASSIGN_PRIMARY = 0x0001;
        public const uint TOKEN_IMPERSONATE = 0x0004;
        public const uint TOKEN_READ = 0x00020008;
        public const uint TOKEN_ALL_ACCESS = 0xF01FF;

        // Impersonation levels
        public const int SecurityImpersonation = 2;

        // Token types
        public const int TokenPrimary = 1;
        public const int TokenImpersonation = 2;
    }
}
