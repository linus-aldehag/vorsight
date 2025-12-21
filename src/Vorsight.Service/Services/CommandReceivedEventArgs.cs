namespace Vorsight.Service.Services;

public class CommandReceivedEventArgs : EventArgs
{
    public string CommandType { get; set; } = string.Empty;
    public object? Data { get; set; }
}
