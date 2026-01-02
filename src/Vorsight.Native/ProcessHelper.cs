using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

namespace Vorsight.Native
{
    /// <summary>
    /// Safe wrapper utilities for P/Invoke process operations.
    /// Provides managed error handling and exception translation.
    /// </summary>
    public static class ProcessHelper
    {
        /// <summary>
        /// Safely opens a process token with proper error handling.
        /// </summary>
        public static bool TryOpenProcessToken(IntPtr processHandle, uint desiredAccess, out IntPtr tokenHandle)
        {
            if (!ProcessInterop.OpenProcessToken(processHandle, desiredAccess, out tokenHandle))
            {
                var err = Marshal.GetLastWin32Error();
                System.Diagnostics.Debug.WriteLine($"OpenProcessToken failed: {err}");
                return false;
            }
            return true;
        }

        /// <summary>
        /// Safely duplicates a token with proper error handling.
        /// </summary>
        public static bool TryDuplicateTokenEx(
            IntPtr existingToken,
            uint desiredAccess,
            int impersonationLevel,
            int tokenType,
            out IntPtr newToken)
        {
            if (!ProcessInterop.DuplicateTokenEx(
                existingToken,
                desiredAccess,
                IntPtr.Zero,
                impersonationLevel,
                tokenType,
                out newToken))
            {
                var err = Marshal.GetLastWin32Error();
                System.Diagnostics.Debug.WriteLine($"DuplicateTokenEx failed: {err}");
                return false;
            }
            return true;
        }

        /// <summary>
        /// Safely opens a process by ID with proper error handling.
        /// </summary>
        public static bool TryOpenProcess(uint processId, uint desiredAccess, out IntPtr processHandle)
        {
            processHandle = ProcessInterop.OpenProcess(desiredAccess, false, processId);
            if (processHandle == IntPtr.Zero)
            {
                var err = Marshal.GetLastWin32Error();
                System.Diagnostics.Debug.WriteLine($"OpenProcess failed: {err}");
                return false;
            }
            return true;
        }

        /// <summary>
        /// Safely creates a process as a user with comprehensive error handling.
        /// </summary>
        public static bool TryCreateProcessAsUser(
            IntPtr userToken,
            string applicationPath,
            string commandLine,
            string workingDirectory,
            out uint processId)
        {
            processId = 0;

            var startupInfo = new ProcessInterop.STARTUPINFO
            {
                cb = (uint)Marshal.SizeOf(typeof(ProcessInterop.STARTUPINFO)),
                lpDesktop = "winsta0\\default",
                dwFlags = 0
            };

            if (!ProcessInterop.CreateProcessAsUser(
                userToken,
                applicationPath,
                commandLine,
                IntPtr.Zero,
                IntPtr.Zero,
                false,
                ProcessInterop.CREATE_UNICODE_ENVIRONMENT | ProcessInterop.NORMAL_PRIORITY_CLASS | ProcessInterop.CREATE_NO_WINDOW,
                IntPtr.Zero,
                workingDirectory,
                ref startupInfo,
                out var processInfo))
            {
                var err = Marshal.GetLastWin32Error();
                System.Diagnostics.Debug.WriteLine($"CreateProcessAsUser failed: {err}");
                return false;
            }

            processId = processInfo.dwProcessId;
            ProcessInterop.CloseHandle(processInfo.hProcess);
            ProcessInterop.CloseHandle(processInfo.hThread);
            return true;
        }

        /// <summary>
        /// Safely gets the active console session ID.
        /// </summary>
        public static uint GetActiveConsoleSessionId()
        {
            return SessionInterop.WTSGetActiveConsoleSessionId();
        }

        /// <summary>
        /// Safely queries session information with proper error handling.
        /// </summary>
        public static bool TryQuerySessionInformation(
            uint sessionId,
            SessionInterop.WTS_INFO_CLASS infoClass,
            out string? result)
        {
            result = null;
            var serverHandle = SessionInterop.WTS_CURRENT_SERVER_HANDLE;

            if (!SessionInterop.WTSQuerySessionInformation(
                serverHandle,
                sessionId,
                infoClass,
                out var buffer,
                out _))
            {
                var err = Marshal.GetLastWin32Error();
                System.Diagnostics.Debug.WriteLine($"WTSQuerySessionInformation failed: {err}");
                return false;
            }

            try
            {
                result = Marshal.PtrToStringAnsi(buffer);
                return true;
            }
            finally
            {
                SessionInterop.WTSFreeMemory(buffer);
            }
        }

        /// <summary>
        /// Safely enumerates all sessions.
        /// </summary>
        public static bool TryEnumerateSessions(out SessionInterop.WTS_SESSION_INFO[]? sessions)
        {
            sessions = null;
            var serverHandle = SessionInterop.WTS_CURRENT_SERVER_HANDLE;

            if (!SessionInterop.WTSEnumerateSessions(
                serverHandle,
                0,
                1,
                out var sessionInfoPtr,
                out var sessionCount))
            {
                var err = Marshal.GetLastWin32Error();
                System.Diagnostics.Debug.WriteLine($"WTSEnumerateSessions failed: {err}");
                return false;
            }

            try
            {
                sessions = new SessionInterop.WTS_SESSION_INFO[sessionCount];
                var structSize = Marshal.SizeOf(typeof(SessionInterop.WTS_SESSION_INFO));

                for (int i = 0; i < sessionCount; i++)
                {
                    var structPtr = sessionInfoPtr + (i * structSize);
                    var structure = Marshal.PtrToStructure(structPtr, typeof(SessionInterop.WTS_SESSION_INFO));
                    if (structure != null)
                    {
                        sessions[i] = (SessionInterop.WTS_SESSION_INFO)structure;
                    }
                }

                return true;
            }
            finally
            {
                SessionInterop.WTSFreeMemory(sessionInfoPtr);
            }
        }

        /// <summary>
        /// Safely enables a privilege in the current token.
        /// </summary>
        public static bool TryEnablePrivilege(string privilegeName)
        {
            var processHandle = ProcessInterop.OpenProcess(ProcessInterop.PROCESS_QUERY_INFORMATION, false, (uint)System.Diagnostics.Process.GetCurrentProcess().Id);
            if (processHandle == IntPtr.Zero)
                return false;

            try
            {
                if (!ProcessInterop.OpenProcessToken(
                    processHandle,
                    ProcessInterop.TOKEN_ADJUST_PRIVILEGES | ProcessInterop.TOKEN_QUERY,
                    out var tokenHandle))
                    return false;

                try
                {
                    if (!TokenInterop.LookupPrivilegeValue(null, privilegeName, out var luid))
                        return false;

                    var tokenPrivileges = new TokenInterop.TOKEN_PRIVILEGES
                    {
                        PrivilegeCount = 1,
                        Privileges = new TokenInterop.LUID_AND_ATTRIBUTES[1]
                        {
                            new TokenInterop.LUID_AND_ATTRIBUTES
                            {
                                Luid = new TokenInterop.LUID { LowPart = (uint)(luid & 0xFFFFFFFF), HighPart = (int)(luid >> 32) },
                                Attributes = TokenInterop.SE_PRIVILEGE_ENABLED
                            }
                        }
                    };

                    return TokenInterop.AdjustTokenPrivileges(
                        tokenHandle,
                        false,
                        ref tokenPrivileges,
                        0,
                        IntPtr.Zero,
                        IntPtr.Zero);
                }
                finally
                {
                    ProcessInterop.CloseHandle(tokenHandle);
                }
            }
            finally
            {
                ProcessInterop.CloseHandle(processHandle);
            }
        }
    }
}

