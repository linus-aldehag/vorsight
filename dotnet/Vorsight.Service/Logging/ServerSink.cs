using System.Collections.Concurrent;
using Serilog.Events;
using Serilog.Sinks.PeriodicBatching;
using Vorsight.Service.Server;

namespace Vorsight.Service.Logging;

public class ServerSink : IBatchedLogEventSink, IDisposable
{
    // Static reference to allow global logging configuration to access the singleton connection
    public static IServerConnection? CurrentConnection { get; set; }

    private readonly LogEventLevel _minimumLevel;

    public ServerSink(LogEventLevel minimumLevel)
    {
        _minimumLevel = minimumLevel;
    }

    public async Task EmitBatchAsync(IEnumerable<LogEvent> batch)
    {
        var connection = CurrentConnection;
        if (connection == null || !connection.IsConnected)
            return;

        var logsToSend = batch
            .Where(le => le.Level >= _minimumLevel)
            .Select(le => new LogEventDto
            {
                Timestamp = le.Timestamp.ToString("o"),
                Level = le.Level.ToString(),
                Message = le.RenderMessage(),
                Exception = le.Exception?.ToString(),
                SourceContext = le.Properties.TryGetValue("SourceContext", out var property)
                    ? property.ToString().Trim('"')
                    : null,
            })
            .ToList();

        if (!logsToSend.Any())
            return;

        try
        {
            await connection.SendLogBatchAsync(logsToSend);
        }
        catch
        {
            // Sink failures should catch exceptions to avoid crashing the upstack logger
        }
    }

    public Task OnEmptyBatchAsync()
    {
        return Task.CompletedTask;
    }

    public void Dispose() { }
}

public class LogEventDto
{
    public string Timestamp { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public string? SourceContext { get; set; }
}
