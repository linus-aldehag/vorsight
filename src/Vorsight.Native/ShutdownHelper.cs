using System;
using System.Diagnostics;

namespace Vorsight.Native
{
    /// <summary>
    /// Safe wrapper utilities for shutdown and session management operations.
    /// Provides managed error handling and privilege elevation helpers.
    /// </summary>
    public static class ShutdownHelper
    {
        /// <summary>
        /// Safely forces logoff of a specific session.
        /// </summary>
        public static bool TryLogoffSession(uint sessionId, bool wait = true)
        {
            try
            {
                // Ensure we have shutdown privilege
                ProcessHelper.TryEnablePrivilege(TokenInterop.SE_SHUTDOWN_NAME);

                // Get the current server handle
                var serverHandle = SessionInterop.WTS_CURRENT_SERVER_HANDLE;

                // Log off the session
                return SessionInterop.WTSLogoffSession(serverHandle, sessionId, wait);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"TryLogoffSession failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Safely forces current user logoff using ExitWindowsEx.
        /// NOTE: This logs off the CALLING PROCESS's session (LocalSystem/Session 0).
        /// For interactive user logoff, use TryForceLogoffInteractiveUser() instead.
        /// </summary>
        [Obsolete("Use TryForceLogoffInteractiveUser for service-initiated logoffs")]
        public static bool TryForceLogoff()
        {
            try
            {
                // Ensure we have shutdown privilege
                ProcessHelper.TryEnablePrivilege(TokenInterop.SE_SHUTDOWN_NAME);

                // Force logoff without saving
                return ShutdownInterop.ExitWindowsEx(
                    ShutdownInterop.EWX_LOGOFF | ShutdownInterop.EWX_FORCE,
                    ShutdownInterop.SHTDN_REASON_FLAG_PLANNED | ShutdownInterop.SHTDN_REASON_MAJOR_APPLICATION);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"TryForceLogoff failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Safely forces logoff of the active interactive user session.
        /// This should be used by services to log off the console user.
        /// </summary>
        public static bool TryForceLogoffInteractiveUser()
        {
            try
            {
                // Ensure we have shutdown privilege
                ProcessHelper.TryEnablePrivilege(TokenInterop.SE_SHUTDOWN_NAME);

                // Get active console session (the logged-in user at the physical console)
                var sessionId = SessionInterop.WTSGetActiveConsoleSessionId();

                // 0xFFFFFFFF means no active console session
                if (sessionId == 0xFFFFFFFF)
                {
                    Debug.WriteLine("No active console session found - no user logged in");
                    return false;
                }

                // Session 0 is typically the services session (shouldn't happen with console API)
                if (sessionId == 0)
                {
                    Debug.WriteLine("Active console session is 0 (services) - unexpected");
                    return false;
                }

                Debug.WriteLine($"Logging off active console session: {sessionId}");

                // Log off the active session
                return TryLogoffSession(sessionId, wait: true);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"TryForceLogoffInteractiveUser failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Safely initiates system shutdown with a timeout and optional message.
        /// </summary>
        public static bool TryInitiateShutdown(
            uint timeoutSeconds,
            string? message = null,
            bool forceAppsClose = false,
            bool rebootAfter = false)
        {
            try
            {
                // Ensure we have shutdown privilege
                ProcessHelper.TryEnablePrivilege(TokenInterop.SE_SHUTDOWN_NAME);

                var reason = ShutdownInterop.SHTDN_REASON_FLAG_PLANNED |
                           ShutdownInterop.SHTDN_REASON_MAJOR_APPLICATION |
                           ShutdownInterop.SHTDN_REASON_MINOR_OTHER;

                var result = ShutdownInterop.InitiateSystemShutdownEx(
                    null, // Local machine
                    message ?? "System will shut down shortly",
                    timeoutSeconds,
                    forceAppsClose,
                    rebootAfter,
                    reason);

                return result == 0; // ERROR_SUCCESS
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"TryInitiateShutdown failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Safely aborts a previously initiated system shutdown.
        /// </summary>
        public static bool TryAbortShutdown()
        {
            try
            {
                var result = ShutdownInterop.AbortSystemShutdown(null); // Local machine
                return result == 0; // ERROR_SUCCESS
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"TryAbortShutdown failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Safely locks the current workstation.
        /// </summary>
        public static bool TryLockWorkstation()
        {
            try
            {
                return ShutdownInterop.LockWorkStation();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"TryLockWorkstation failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Gets the session ID for a given process ID.
        /// </summary>
        public static bool TryGetSessionIdForProcess(uint processId, out uint sessionId)
        {
            sessionId = 0;
            try
            {
                return ShutdownInterop.ProcessIdToSessionId(processId, out sessionId);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"TryGetSessionIdForProcess failed: {ex.Message}");
                return false;
            }
        }
    }
}

