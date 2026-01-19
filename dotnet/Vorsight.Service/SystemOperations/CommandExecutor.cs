using System.Diagnostics;
using Vorsight.Interop;

namespace Vorsight.Service.SystemOperations;

public interface ICommandExecutor
{
    bool RunCommandAsUser(string command, string arguments);
}

public class CommandExecutor(ILogger<CommandExecutor> logger) : ICommandExecutor
{
    public bool RunCommandAsUser(string command, string arguments)
    {
        try
        {
            logger.LogDebug(
                "Attempting to run command as user: {Command} {Args}",
                command,
                arguments
            );

            // 1. Get Active Session
            var sessionId = ProcessHelper.GetActiveConsoleSessionId();
            if (sessionId == 0xFFFFFFFF)
            {
                logger.LogError(
                    "No active console session found. User may not be logged in or terminal services not running."
                );
                return false;
            }

            logger.LogDebug("Active console session ID: {SessionId}", sessionId);

            // Optimization: If we are already in the target session, just start the process directly
            if (Process.GetCurrentProcess().SessionId == sessionId)
            {
                logger.LogInformation(
                    "Service is running in target session {SessionId}. Using direct Process.Start.",
                    sessionId
                );
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c {command} {arguments}",
                    UseShellExecute = false, // Must be false for CreateNoWindow to work
                    CreateNoWindow = true,
                };
                Process.Start(psi);
                return true;
            }

            // 2. Find a process in that session (Explorer is best bet)
            var userProcess = Process
                .GetProcessesByName("explorer")
                .FirstOrDefault(p => p.SessionId == sessionId);

            if (userProcess == null)
            {
                // Check if LogonUI is present (User at login screen)
                var isLoginScreen = Process
                    .GetProcessesByName("LogonUI")
                    .Any(p => p.SessionId == sessionId);

                if (isLoginScreen)
                {
                    logger.LogInformation(
                        "Session {SessionId} is at login screen (LogonUI detected). Skipping command execution.",
                        sessionId
                    );
                    return false;
                }

                // Log all processes in the session for diagnostics
                var sessionProcesses = Process
                    .GetProcesses()
                    .Where(p => p.SessionId == sessionId)
                    .Select(p => p.ProcessName)
                    .Take(10)
                    .ToArray();

                logger.LogError(
                    "Could not find explorer.exe in session {SessionId}. This usually means explorer.exe crashed or user is at login screen. "
                        + "Available processes in session: {Processes}. Suggestion: Wait for user to log in fully.",
                    sessionId,
                    string.Join(", ", sessionProcesses)
                );
                return false;
            }

            logger.LogDebug(
                "Found explorer.exe with PID {Pid} in session {SessionId}",
                userProcess.Id,
                sessionId
            );

            // 3. Open Process Token
            // 3. Open Process Token
            // Use specific access rights to avoid Access Denied from Process.Handle (which requests ALL_ACCESS)
            if (
                !ProcessHelper.TryOpenProcess(
                    (uint)userProcess.Id,
                    ProcessInterop.PROCESS_QUERY_LIMITED_INFORMATION,
                    out var hProcess
                )
            )
            {
                logger.LogError(
                    "Failed to open process handle for explorer.exe (PID: {Pid})",
                    userProcess.Id
                );
                return false;
            }

            try
            {
                if (
                    !ProcessHelper.TryOpenProcessToken(
                        hProcess,
                        ProcessInterop.TOKEN_DUPLICATE,
                        out var hToken
                    )
                )
                {
                    logger.LogError(
                        "Failed to open process token for explorer.exe. This may indicate insufficient service permissions. "
                            + "Ensure the service is running as SYSTEM or with appropriate privileges."
                    );
                    return false;
                }

                try
                {
                    // 4. Duplicate Token
                    if (
                        !ProcessHelper.TryDuplicateTokenEx(
                            hToken,
                            ProcessInterop.TOKEN_ASSIGN_PRIMARY
                                | ProcessInterop.TOKEN_DUPLICATE
                                | ProcessInterop.TOKEN_QUERY
                                | ProcessInterop.TOKEN_ADJUST_PRIVILEGES,
                            ProcessInterop.SecurityImpersonation,
                            ProcessInterop.TokenPrimary,
                            out var hUserToken
                        )
                    )
                    {
                        logger.LogError(
                            "Failed to duplicate token. Check service permissions and Windows security policy."
                        );
                        return false;
                    }

                    try
                    {
                        // 5. Create Process as User
                        if (
                            ProcessHelper.TryCreateProcessAsUser(
                                hUserToken,
                                null!, // Application Name
                                $"{command} {arguments}", // Command Line
                                null!, // Working Directory (default)
                                out var pid
                            )
                        )
                        {
                            logger.LogDebug("Successfully started process {Pid} as user", pid);
                            return true;
                        }
                        else
                        {
                            logger.LogError(
                                "Failed to CreateProcessAsUser for command: {Command}. This may be due to UAC restrictions or invalid executable path.",
                                command
                            );
                            return false;
                        }
                    }
                    finally
                    {
                        ProcessInterop.CloseHandle(hUserToken);
                    }
                }
                finally
                {
                    ProcessInterop.CloseHandle(hToken);
                }
            }
            finally
            {
                ProcessInterop.CloseHandle(hProcess);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to execute command as user");
            return false;
        }
    }
}
