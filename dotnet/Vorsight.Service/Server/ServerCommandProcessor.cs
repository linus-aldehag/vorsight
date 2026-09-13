using Vorsight.Service.Monitoring;
using Vorsight.Service.SystemOperations;

namespace Vorsight.Service.Server;

public interface IServerCommandProcessor
{
    void ProcessCommand(object? _, CommandReceivedEventArgs e);
}

public class ServerCommandProcessor(
    ICommandExecutor commandExecutor,
    IActivityCoordinator activityCoordinator,
    ILogger<ServerCommandProcessor> logger
) : IServerCommandProcessor
{
    public void ProcessCommand(object? sender, CommandReceivedEventArgs e)
    {
        try
        {
            switch (e.CommandType)
            {
                case "screenshot":
                    logger.LogInformation("Processing screenshot command from server");
                    _ = activityCoordinator.RequestManualScreenshotAsync("Manual");
                    break;
                case "shutdown":
                    logger.LogInformation("Processing shutdown command from server");
                    commandExecutor.RunCommandAsUser("shutdown", "/s /t 0");
                    break;
                case "logout":
                    logger.LogInformation("Processing logout command from server");
                    commandExecutor.RunCommandAsUser("shutdown", "/l");
                    break;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing server command");
        }
    }
}
