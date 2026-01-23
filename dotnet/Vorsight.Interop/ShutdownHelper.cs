using System;
using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Vorsight.Interop
{
    /// <summary>
    /// Safe wrapper utilities for shutdown and session management operations.
    /// Provides managed error handling and privilege elevation helpers.
    /// </summary>
    public class ShutdownHelper : IShutdownHelper
    {
        private readonly ILogger<ShutdownHelper> _logger;
        private readonly IProcessHelper _processHelper;

        public ShutdownHelper(ILogger<ShutdownHelper> logger, IProcessHelper processHelper)
        {
            _logger = logger;
            _processHelper = processHelper;
        }

        /// <summary>
        /// Safely forces logoff of a specific session.
        /// </summary>
        public bool TryLogoffSession(uint sessionId, bool wait = true)
        {
            try
            {
                // Ensure we have shutdown privilege
                _processHelper.TryEnablePrivilege(TokenInterop.SE_SHUTDOWN_NAME);

                // Get the current server handle
                var serverHandle = SessionInterop.WTS_CURRENT_SERVER_HANDLE;

                // Log off the session
                return SessionInterop.WTSLogoffSession(serverHandle, sessionId, wait);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TryLogoffSession failed");
                return false;
            }
        }

        /// <summary>
        /// Safely forces current user logoff using ExitWindowsEx.
        /// NOTE: This logs off the CALLING PROCESS's session (LocalSystem/Session 0).
        /// For interactive user logoff, use TryForceLogoffInteractiveUser() instead.
        /// </summary>
        [Obsolete("Use TryForceLogoffInteractiveUser for service-initiated logoffs")]
        public bool TryForceLogoff()
        {
            try
            {
                // Ensure we have shutdown privilege
                _processHelper.TryEnablePrivilege(TokenInterop.SE_SHUTDOWN_NAME);

                // Force logoff without saving
                return ShutdownInterop.ExitWindowsEx(
                    ShutdownInterop.EWX_LOGOFF | ShutdownInterop.EWX_FORCE,
                    ShutdownInterop.SHTDN_REASON_FLAG_PLANNED
                        | ShutdownInterop.SHTDN_REASON_MAJOR_APPLICATION
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TryForceLogoff failed");
                return false;
            }
        }

        /// <summary>
        /// Safely forces logoff of the active interactive user session.
        /// This should be used by services to log off the console user.
        /// </summary>
        public bool TryForceLogoffInteractiveUser()
        {
            try
            {
                // Ensure we have shutdown privilege
                _processHelper.TryEnablePrivilege(TokenInterop.SE_SHUTDOWN_NAME);

                // Get active console session (the logged-in user at the physical console)
                var sessionId = SessionInterop.WTSGetActiveConsoleSessionId();

                // 0xFFFFFFFF means no active console session
                if (sessionId == 0xFFFFFFFF)
                {
                    _logger.LogInformation("No active console session found - no user logged in");
                    return false;
                }

                // Session 0 is typically the services session (shouldn't happen with console API)
                if (sessionId == 0)
                {
                    _logger.LogWarning("Active console session is 0 (services) - unexpected");
                    return false;
                }

                _logger.LogInformation(
                    "Logging off active console session: {SessionId}",
                    sessionId
                );

                // Log off the active session
                return TryLogoffSession(sessionId, wait: true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TryForceLogoffInteractiveUser failed");
                return false;
            }
        }

        /// <summary>
        /// Safely initiates system shutdown with a timeout and optional message.
        /// </summary>
        public bool TryInitiateShutdown(
            uint timeoutSeconds,
            string? message = null,
            bool forceAppsClose = false,
            bool rebootAfter = false
        )
        {
            try
            {
                // Ensure we have shutdown privilege
                _processHelper.TryEnablePrivilege(TokenInterop.SE_SHUTDOWN_NAME);

                var reason =
                    ShutdownInterop.SHTDN_REASON_FLAG_PLANNED
                    | ShutdownInterop.SHTDN_REASON_MAJOR_APPLICATION
                    | ShutdownInterop.SHTDN_REASON_MINOR_OTHER;

                var result = ShutdownInterop.InitiateSystemShutdownEx(
                    null, // Local machine
                    message ?? "System will shut down shortly",
                    timeoutSeconds,
                    forceAppsClose,
                    rebootAfter,
                    reason
                );

                return result == 0; // ERROR_SUCCESS
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TryInitiateShutdown failed");
                return false;
            }
        }

        /// <summary>
        /// Safely aborts a previously initiated system shutdown.
        /// </summary>
        public bool TryAbortShutdown()
        {
            try
            {
                var result = ShutdownInterop.AbortSystemShutdown(null); // Local machine
                return result == 0; // ERROR_SUCCESS
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TryAbortShutdown failed");
                return false;
            }
        }

        /// <summary>
        /// Safely locks the current workstation.
        /// </summary>
        public bool TryLockWorkstation()
        {
            try
            {
                return ShutdownInterop.LockWorkStation();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TryLockWorkstation failed");
                return false;
            }
        }

        /// <summary>
        /// Gets the session ID for a given process ID.
        /// </summary>
        public bool TryGetSessionIdForProcess(uint processId, out uint sessionId)
        {
            sessionId = 0;
            try
            {
                return ShutdownInterop.ProcessIdToSessionId(processId, out sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TryGetSessionIdForProcess failed");
                return false;
            }
        }
    }
}
