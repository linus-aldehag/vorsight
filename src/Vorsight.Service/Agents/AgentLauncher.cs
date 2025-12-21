using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Vorsight.Native;

namespace Vorsight.Service.Agents;

public interface IAgentLauncher
{
    Task LaunchScreenshotAgentAsync();
}

public class AgentLauncher : IAgentLauncher
{
    private readonly ILogger<AgentLauncher> _logger;
    private readonly string _agentPath;

    public AgentLauncher(ILogger<AgentLauncher> logger, IConfiguration configuration)
    {
        _logger = logger;
        
        var configuredPath = configuration["Agent:ExecutablePath"];
        if (string.IsNullOrEmpty(configuredPath))
        {
            _logger.LogError("Agent:ExecutablePath not configured in settings");
            _agentPath = Path.Combine(AppContext.BaseDirectory, "Vorsight.Agent.exe"); // Fallback
        }
        else
        {
            // Resolve relative paths if necessary (though config usually has absolute in dev)
            _agentPath = Path.IsPathRooted(configuredPath) 
                ? configuredPath 
                : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, configuredPath));
                
            if (!File.Exists(_agentPath))
            {
                _logger.LogWarning("Configured agent path does not exist: {Path}", _agentPath);
            }
            else
            {
                 _logger.LogInformation("Using configured agent path: {Path}", _agentPath);
            }
        }
    }

    public Task LaunchScreenshotAgentAsync()
    {
        try
        {
            if (!File.Exists(_agentPath))
            {
                _logger.LogError("Agent executable not found at {Path}", _agentPath);
                return Task.CompletedTask;
            }

            _logger.LogInformation("Attempting to launch agent from {Path}", _agentPath);

            // 1. Get Active Session
            var sessionId = ProcessHelper.GetActiveConsoleSessionId();
            if (sessionId == 0xFFFFFFFF)
            {
                _logger.LogWarning("No active console session found");
                return Task.CompletedTask;
            }

            _logger.LogInformation("Target Session ID: {SessionId}", sessionId);

            // 2. We need a user token. 
            // Strategy: Find Explorer.exe in that session
            var explorerProcesses = Process.GetProcessesByName("explorer");
            var userProcess = explorerProcesses.FirstOrDefault(p => (uint)p.SessionId == sessionId);

            if (userProcess == null)
            {
                _logger.LogWarning("Explorer.exe not found in session {SessionId}. User might not be logged in.", sessionId);
                return Task.CompletedTask;
            }

            // 3. Duplicate Token
            if (!ProcessHelper.TryOpenProcess((uint)userProcess.Id, ProcessInterop.PROCESS_QUERY_INFORMATION, out var processHandle))
            {
                _logger.LogError("Failed to open Explorer process");
                return Task.CompletedTask;
            }

            try
            {
                if (!ProcessHelper.TryOpenProcessToken(processHandle, ProcessInterop.TOKEN_DUPLICATE | ProcessInterop.TOKEN_QUERY | ProcessInterop.TOKEN_ASSIGN_PRIMARY, out var tokenHandle))
                {
                    _logger.LogError("Failed to open process token");
                    return Task.CompletedTask;
                }

                try
                {
                    if (!ProcessHelper.TryDuplicateTokenEx(tokenHandle, ProcessInterop.TOKEN_ALL_ACCESS, 2, 1, out var newToken)) // SecurityImpersonation, TokenPrimary
                    {
                        _logger.LogError("Failed to duplicate token");
                        return Task.CompletedTask;
                    }

                    try
                    {
                        // 4. Launch Agent
                        // Command: "screenshot"
                        var cmdLine = $"\"{_agentPath}\" screenshot";
                        
                        // Working directory: Agent folder
                        var workingDir = Path.GetDirectoryName(_agentPath) ?? string.Empty;

                        if (ProcessHelper.TryCreateProcessAsUser(newToken, _agentPath, cmdLine, workingDir, out var newPid))
                        {
                            _logger.LogInformation("Successfully launched Agent (PID: {Pid}) in session {SessionId}", newPid, sessionId);
                        }
                        else
                        {
                            _logger.LogError("Failed to create process as user");
                        }
                    }
                    finally
                    {
                        ProcessInterop.CloseHandle(newToken);
                    }
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to launch agent");
        }

        return Task.CompletedTask;
    }
}
