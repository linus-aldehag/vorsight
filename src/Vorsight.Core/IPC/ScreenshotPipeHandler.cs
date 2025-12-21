using System;
using System.Collections.Concurrent;
using System.IO.Pipes;
using System.Threading.Tasks;

namespace Vorsight.Core.IPC
{
    /// <summary>
    /// Handles Named Pipe connections for receiving screenshot data from Agent.
    /// Data stays in-memory (off-disk) for processing and audit storage.
    /// </summary>
    public class ScreenshotPipeHandler
    {
        private readonly string _pipeName;
        private readonly ConcurrentDictionary<uint, PipeConnection> _connections;
        private NamedPipeServerStream? _pipeServer;
        private volatile bool _isRunning;

        /// <summary>
        /// In-memory storage of screenshots keyed by session ID.
        /// Each session maintains the last N screenshots.
        /// </summary>
        private readonly ConcurrentDictionary<uint, ScreenshotBuffer> _screenshotBuffers;
        private const int MaxScreenshotsPerSession = 10;

        public event EventHandler<ScreenshotReceivedEventArgs>? ScreenshotReceived;

        public ScreenshotPipeHandler(string pipeName)
        {
            _pipeName = pipeName ?? $"vorsight-screenshots-{Guid.NewGuid():N}";
            _connections = new ConcurrentDictionary<uint, PipeConnection>();
            _screenshotBuffers = new ConcurrentDictionary<uint, ScreenshotBuffer>();
        }

        /// <summary>
        /// Starts listening for incoming connections on the Named Pipe.
        /// </summary>
        public async Task StartAsync()
        {
            _isRunning = true;
            await Task.Run(() => ListenForConnections());
        }

        /// <summary>
        /// Stops the pipe server and closes all connections.
        /// </summary>
        public void Stop()
        {
            _isRunning = false;
            _pipeServer?.Dispose();
            
            foreach (var connection in _connections.Values)
            {
                connection?.Dispose();
            }
            _connections.Clear();
        }

        private void ListenForConnections()
        {
            while (_isRunning)
            {
                try
                {
                    _pipeServer = new NamedPipeServerStream(
                        _pipeName,
                        PipeDirection.InOut,
                        NamedPipeServerStream.MaxAllowedServerInstances,
                        PipeTransmissionMode.Byte,
                        PipeOptions.Asynchronous);

                    var task = _pipeServer.WaitForConnectionAsync();
                    task.Wait();

                    if (_pipeServer.IsConnected)
                    {
                        _ = HandleConnectionAsync(_pipeServer);
                        _pipeServer = null; // Prepare for next connection
                    }
                }
                catch (Exception ex)
                {
                    // Log exception but continue listening
                    System.Diagnostics.Debug.WriteLine($"Error in pipe listener: {ex.Message}");
                }
            }
        }

        private async Task HandleConnectionAsync(NamedPipeServerStream pipeServer)
        {
            try
            {
                var connection = new PipeConnection(pipeServer);
                
                while (_isRunning && pipeServer.IsConnected)
                {
                    var message = await connection.ReadMessageAsync();
                    
                    if (message != null)
                    {
                        ProcessIncomingMessage(message);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error handling pipe connection: {ex.Message}");
            }
            finally
            {
                pipeServer?.Dispose();
            }
        }

        private void ProcessIncomingMessage(PipeMessage message)
        {
            if (message.Type == PipeMessage.MessageType.Screenshot)
            {
                StoreScreenshot(message);
                ScreenshotReceived?.Invoke(this, new ScreenshotReceivedEventArgs
                {
                    Message = message,
                    SessionId = message.SessionId,
                    ScreenshotData = message.Payload!,
                    Timestamp = message.CreatedUtc
                });
            }
        }

        private void StoreScreenshot(PipeMessage message)
        {
            var buffer = _screenshotBuffers.GetOrAdd(
                message.SessionId,
                _ => new ScreenshotBuffer(MaxScreenshotsPerSession));

            buffer.AddScreenshot(message);
        }

        /// <summary>
        /// Retrieves the most recent screenshot for a session.
        /// </summary>
        public byte[]? GetLatestScreenshot(uint sessionId)
        {
            if (_screenshotBuffers.TryGetValue(sessionId, out var buffer))
            {
                return buffer.GetLatestScreenshot();
            }
            return null;
        }

        /// <summary>
        /// Retrieves all stored screenshots for a session.
        /// </summary>
        public byte[][] GetSessionScreenshots(uint sessionId)
        {
            if (_screenshotBuffers.TryGetValue(sessionId, out var buffer))
            {
                return buffer.GetAllScreenshots();
            }
            return Array.Empty<byte[]>();
        }

        public string PipeName => _pipeName;
        public bool IsRunning => _isRunning;

        /// <summary>
        /// Internal class for managing a pipe connection.
        /// </summary>
        private class PipeConnection : IDisposable
        {
            private readonly NamedPipeServerStream _pipe;
            private const int BufferSize = 4096;

            public PipeConnection(NamedPipeServerStream pipe)
            {
                _pipe = pipe;
            }

            public async Task<PipeMessage?> ReadMessageAsync()
            {
                try
                {
                    byte[] lengthBuffer = new byte[4];
                    int bytesRead = _pipe.Read(lengthBuffer, 0, 4);
                    if (bytesRead != 4)
                        return null!;
                    
                    int messageLength = BitConverter.ToInt32(lengthBuffer, 0);

                    if (messageLength <= 0 || messageLength > 10 * 1024 * 1024) // 10MB max
                        return null!;

                    byte[] messageData = new byte[messageLength];
                    int totalRead = 0;

                    while (totalRead < messageLength)
                    {
                        int read = _pipe.Read(messageData, totalRead, messageLength - totalRead);
                        if (read == 0) break;
                        totalRead += read;
                    }

                    // Deserialize from messageData (simplified - use JSON serialization in production)
                    return DeserializeMessage(messageData);
                }
                catch
                {
                    return null;
                }
            }

            private PipeMessage? DeserializeMessage(byte[] data)
            {
                // TODO: Implement proper serialization (e.g., using System.Text.Json or protobuf)
                return new PipeMessage();
            }

            public void Dispose()
            {
                _pipe?.Dispose();
            }
        }

        /// <summary>
        /// Internal class for circular buffer of screenshots.
        /// </summary>
        private class ScreenshotBuffer
        {
            private readonly byte[][] _buffer;
            private int _currentIndex = 0;
            private readonly object _lock = new object();

            public ScreenshotBuffer(int capacity)
            {
                _buffer = new byte[capacity][];
            }

            public void AddScreenshot(PipeMessage message)
            {
                lock (_lock)
                {
                    _buffer[_currentIndex] = message.Payload!;
                    _currentIndex = (_currentIndex + 1) % _buffer.Length;
                }
            }

            public byte[] GetLatestScreenshot()
            {
                lock (_lock)
                {
                    int lastIndex = (_currentIndex - 1 + _buffer.Length) % _buffer.Length;
                    return _buffer[lastIndex];
                }
            }

            public byte[][] GetAllScreenshots()
            {
                lock (_lock)
                {
                    return (byte[][])_buffer.Clone();
                }
            }
        }
    }

    /// <summary>
    /// Event args for screenshot received.
    /// </summary>
    public class ScreenshotReceivedEventArgs : EventArgs
    {
        public required PipeMessage Message { get; set; }
        public uint SessionId { get; set; }
        public required byte[] ScreenshotData { get; set; }
        public DateTime Timestamp { get; set; }
    }
}

