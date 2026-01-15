namespace Vorsight.Service.Utilities;

/// <summary>
/// Extension methods for common operations
/// </summary>
public static class Extensions
{
    /// <summary>
    /// Determines if an exception is a cancellation exception
    /// </summary>
    /// <param name="ex">The exception to check</param>
    /// <returns>True if the exception is a cancellation exception</returns>
    public static bool IsCancellation(this Exception ex) =>
        ex is OperationCanceledException
        || ex is TaskCanceledException
        || ex is AggregateException aggregateEx
            && aggregateEx.InnerExceptions.Any(inner => inner.IsCancellation());
}
