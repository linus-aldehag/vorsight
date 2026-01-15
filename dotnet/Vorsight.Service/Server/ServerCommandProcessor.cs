using Microsoft.Extensions.Logging;
using Vorsight.Service.Agents;
using Vorsight.Service.SystemOperations;

namespace Vorsight.Service.Server;

public interface IServerCommandProcessor
{
    void ProcessCommand(object? sender, CommandReceivedEventArgs e);
}

public class ServerCommandProcessor : IServerCommandProcessor
{
    private readonly IAgentLauncher _agentLauncher;
    private readonly ICommandExecutor _commandExecutor;
    private readonly ILogger<ServerCommandProcessor> _logger;

    public ServerCommandProcessor(
        IAgentLauncher agentLauncher,
        ICommandExecutor commandExecutor,
        ILogger<ServerCommandProcessor> logger
    )
    {
        _agentLauncher = agentLauncher;
        _commandExecutor = commandExecutor;
        _logger = logger;
    }

    public void ProcessCommand(object? sender, CommandReceivedEventArgs e)
    {
        try
        {
            if (e.CommandType == "screenshot")
            {
                _logger.LogInformation("Processing screenshot command from server");
                _ = _agentLauncher.LaunchScreenshotAgentAsync();
            }
            else if (e.CommandType == "shutdown")
            {
                _logger.LogInformation("Processing shutdown command from server");
                _commandExecutor.RunCommandAsUser("shutdown", "/s /t 0");
            }
            else if (e.CommandType == "logout")
            {
                _logger.LogInformation("Processing logout command from server");
                _commandExecutor.RunCommandAsUser("shutdown", "/l");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing server command");
        }
    }
}
