namespace Vorsight.Interop;

public interface IShutdownHelper
{
    bool TryLogoffSession(uint sessionId, bool wait = true);

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
