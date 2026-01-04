namespace Vorsight.Agent.Contracts;

public interface IActivityService
{
    Task CollectAndReportAsync(uint sessionId, CancellationToken cancellationToken = default);
}
