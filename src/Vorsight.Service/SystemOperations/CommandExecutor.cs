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
            logger.LogInformation("Attempting to run command as user: {Command} {Args}", command, arguments);

            // 1. Get Active Session
            var sessionId = ProcessHelper.GetActiveConsoleSessionId();
            if (sessionId == 0xFFFFFFFF)
            {
                logger.LogError("No active console session found");
                return false;
            }

            // Optimization: If we are already in the target session, just start the process directly
            if (System.Diagnostics.Process.GetCurrentProcess().SessionId == sessionId)
            {
                logger.LogInformation("Service is running in target session {SessionId}. Using direct Process.Start.", sessionId);
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c {command} {arguments}",
                    UseShellExecute = false,
                    CreateNoWindow = true // Or false if we want to see it
                };
                System.Diagnostics.Process.Start(psi);
                return true;
            }

            // 2. Find a process in that session (Explorer is best bet)
            var userProcess = System.Diagnostics.Process.GetProcessesByName("explorer")
                .FirstOrDefault(p => p.SessionId == sessionId);

            if (userProcess == null)
            {
                logger.LogError("Could not find explorer.exe in session {SessionId}", sessionId);
                return false;
            }

            // 3. Open Process Token
            // 3. Open Process Token
            // Use specific access rights to avoid Access Denied from Process.Handle (which requests ALL_ACCESS)
            if (!ProcessHelper.TryOpenProcess((uint)userProcess.Id, ProcessInterop.PROCESS_QUERY_LIMITED_INFORMATION, out var hProcess))
            {
                logger.LogError("Failed to open process handle for explorer.exe (PID: {Pid})", userProcess.Id);
                return false;
            }

            try
            {
                if (!ProcessHelper.TryOpenProcessToken(hProcess, ProcessInterop.TOKEN_DUPLICATE, out var hToken))
                {
                    logger.LogError("Failed to open process token for explorer.exe");
                    return false;
                }

                try
                {
                // 4. Duplicate Token
                if (!ProcessHelper.TryDuplicateTokenEx(
                    hToken, 
                    ProcessInterop.TOKEN_ASSIGN_PRIMARY | 
                    ProcessInterop.TOKEN_DUPLICATE | 
                    ProcessInterop.TOKEN_QUERY | 
                    ProcessInterop.TOKEN_ADJUST_PRIVILEGES,
                    ProcessInterop.SecurityImpersonation,
                    ProcessInterop.TokenPrimary,
                    out var hUserToken))
                {
                    logger.LogError("Failed to duplicate token");
                    return false;
                }

                try
                {
                    // 5. Create Process as User
                    if (ProcessHelper.TryCreateProcessAsUser(
                        hUserToken,
                        null!, // Application Name
                        $"{command} {arguments}", // Command Line
                        null!, // Working Directory (default)
                        out var pid))
                    {
                        logger.LogInformation("Successfully started process {Pid} as user", pid);
                        return true;
                    }
                    else
                    {
                        logger.LogError("Failed to CreateProcessAsUser");
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
