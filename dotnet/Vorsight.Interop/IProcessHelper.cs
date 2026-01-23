using System;

namespace Vorsight.Interop
{
    public interface IProcessHelper
    {
        bool TryOpenProcessToken(IntPtr processHandle, uint desiredAccess, out IntPtr tokenHandle);
        bool TryDuplicateTokenEx(
            IntPtr existingToken,
            uint desiredAccess,
            int impersonationLevel,
            int tokenType,
            out IntPtr newToken
        );
        bool TryOpenProcess(uint processId, uint desiredAccess, out IntPtr processHandle);
        bool TryCreateProcessAsUser(
            IntPtr userToken,
            string applicationPath,
            string commandLine,
            string workingDirectory,
            out uint processId
        );
        uint GetActiveConsoleSessionId();
        bool TryQuerySessionInformation(
            uint sessionId,
            SessionInterop.WTS_INFO_CLASS infoClass,
            out string? result
        );
        bool TryEnumerateSessions(out SessionInterop.WTS_SESSION_INFO[]? sessions);
        bool TryEnablePrivilege(string privilegeName);
    }
}
