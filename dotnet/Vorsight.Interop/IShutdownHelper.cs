namespace Vorsight.Interop
{
    public interface IShutdownHelper
    {
        bool TryLogoffSession(uint sessionId, bool wait = true);

        [System.Obsolete("Use TryForceLogoffInteractiveUser for service-initiated logoffs")]
        bool TryForceLogoff();

        bool TryForceLogoffInteractiveUser();
        bool TryInitiateShutdown(
            uint timeoutSeconds,
            string? message = null,
            bool forceAppsClose = false,
            bool rebootAfter = false
        );
        bool TryAbortShutdown();
        bool TryLockWorkstation();
        bool TryGetSessionIdForProcess(uint processId, out uint sessionId);
    }
}
