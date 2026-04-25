using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Vorsight.Interop;
using Vorsight.Service.SystemOperations;

namespace Vorsight.Service.Agents;

public interface IAgentLauncher
{
    Task LaunchScreenshotAgentAsync(string metadata = "");
    Task LaunchActivityCaptureAsync(CancellationToken cancellationToken);
}

public class AgentLauncher : IAgentLauncher
{
    private readonly ILogger<AgentLauncher> _logger;
    private readonly ICommandExecutor _commandExecutor;
    private readonly string _agentPath;

    public AgentLauncher(
        ILogger<AgentLauncher> logger,
        IConfiguration configuration,
        ICommandExecutor commandExecutor
    )
    {
        _logger = logger;
        _commandExecutor = commandExecutor;
        _agentPath = ResolveAgentPath(configuration);
    }

    private string ResolveAgentPath(IConfiguration config)
    {
        // First, try the configured path (may be relative or absolute)
        var configuredPath = config.GetValue<string>("Agent:ExecutablePath");
        if (!string.IsNullOrEmpty(configuredPath))
        {
            if (File.Exists(configuredPath))
                return configuredPath;

            var absolutePath = Path.Combine(AppContext.BaseDirectory, configuredPath);
            if (File.Exists(absolutePath))
                return absolutePath;
        }

        // Fallback: Look for wuapihost.exe in the same directory (production default)
        var agentPath = Path.Combine(AppContext.BaseDirectory, "wuapihost.exe");
        if (File.Exists(agentPath))
            return agentPath;

        _logger.LogError(
            "Could not resolve Agent executable path. Configuration path was: {ConfiguredPath}",
            configuredPath
        );
        return string.Empty;
    }

    public Task LaunchScreenshotAgentAsync(string metadata = "")
    {
        var args = string.IsNullOrEmpty(metadata) ? "screenshot" : $"screenshot \"{metadata}\"";
        return LaunchAgentWithCommand(args);
    }

    public Task LaunchActivityCaptureAsync(CancellationToken cancellationToken)
    {
        return LaunchAgentWithCommand("activity");
    }

    private Task LaunchAgentWithCommand(string args)
    {
        try
        {
            if (string.IsNullOrEmpty(_agentPath) || !File.Exists(_agentPath))
            {
                _logger.LogError("Agent executable not found at {Path}", _agentPath);
                return Task.CompletedTask;
            }

            _logger.LogInformation(
                "Attempting to launch agent from {Path} with args: {Args}",
                _agentPath,
                args
            );

            // Wrap agent path in quotes to handle spaces
            _commandExecutor.RunCommandAsUser($"\"{_agentPath}\"", args);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to launch agent with args: {Args}", args);
        }

        return Task.CompletedTask;
    }
}
