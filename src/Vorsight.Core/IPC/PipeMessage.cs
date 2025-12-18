using System;

namespace Vorsight.Core.IPC
{
    /// <summary>
    /// Represents a message transmitted over a Named Pipe.
    /// This is the protocol for communication between Service and Agent.
    /// </summary>
    [Serializable]
    public class PipeMessage
    {
        /// <summary>
        /// Message types in the Vörsight IPC protocol.
        /// </summary>
        public enum MessageType
        {
            Screenshot = 1,
            ScreenshotRequest = 2,
            ShutdownCommand = 3,
            PingRequest = 4,
            PingResponse = 5,
            ConfigurationUpdate = 6,
            AuditLog = 7
        }

        /// <summary>
        /// The type of this message.
        /// </summary>
        public MessageType Type { get; set; }

        /// <summary>
        /// Unique message ID for request/response correlation.
        /// </summary>
        public string MessageId { get; set; }

        /// <summary>
        /// Timestamp when the message was created (UTC).
        /// </summary>
        public DateTime CreatedUtc { get; set; }

        /// <summary>
        /// Session ID this message is associated with.
        /// </summary>
        public uint SessionId { get; set; }

        /// <summary>
        /// User SID associated with this message.
        /// </summary>
        public string UserSid { get; set; }

        /// <summary>
        /// Payload data - can be image bytes, JSON config, etc.
        /// For screenshots: raw PNG or JPEG bytes
        /// For other messages: UTF-8 encoded JSON
        /// </summary>
        public byte[] Payload { get; set; }

        /// <summary>
        /// Size of the payload in bytes.
        /// </summary>
        public int PayloadSize => Payload?.Length ?? 0;

        /// <summary>
        /// Optional metadata/properties dictionary (as JSON).
        /// </summary>
        public string Metadata { get; set; }

        public PipeMessage()
        {
            MessageId = Guid.NewGuid().ToString();
            CreatedUtc = DateTime.UtcNow;
        }

        public PipeMessage(MessageType type, uint sessionId, string userSid = null)
            : this()
        {
            Type = type;
            SessionId = sessionId;
            UserSid = userSid;
        }
    }
}

