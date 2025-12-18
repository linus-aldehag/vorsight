namespace Vorsight.Core.IPC;

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
        public string? UserSid { get; set; }

        /// <summary>
        /// Payload data - can be image bytes, JSON config, etc.
        /// For screenshots: raw PNG or JPEG bytes
        /// For other messages: UTF-8 encoded JSON
        /// </summary>
        public byte[]? Payload { get; set; }

        /// <summary>
        /// Size of the payload in bytes.
        /// </summary>
        public int PayloadSize => Payload?.Length ?? 0;

        /// <summary>
        /// Optional metadata/properties dictionary (as JSON).
        /// </summary>
        public string? Metadata { get; set; }

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

    /// <summary>
    /// Serializes the message to a byte array for transmission.
    /// Format: [Header][MetadataLength][Metadata][PayloadLength][Payload]
    /// </summary>
    public byte[] Serialize()
    {
        using (var ms = new MemoryStream())
        using (var writer = new BinaryWriter(ms))
        {
            // Write header
            writer.Write((int)Type);
            writer.Write(MessageId);
            writer.Write(CreatedUtc.Ticks);
            writer.Write(SessionId);
            writer.Write(UserSid ?? string.Empty);

            // Write metadata
            var metadataBytes = System.Text.Encoding.UTF8.GetBytes(Metadata ?? string.Empty);
            writer.Write(metadataBytes.Length);
            writer.Write(metadataBytes);

            // Write payload
            writer.Write(PayloadSize);
            if (Payload != null && Payload.Length > 0)
            {
                writer.Write(Payload);
            }

            return ms.ToArray();
        }
    }

    /// <summary>
    /// Deserializes a byte array back into a PipeMessage.
    /// </summary>
    public static PipeMessage Deserialize(byte[] data, int length)
    {
        if (data == null || length == 0)
            throw new ArgumentException("Invalid data for deserialization");

        using (var ms = new MemoryStream(data, 0, length))
        using (var reader = new BinaryReader(ms))
        {
            try
            {
                var messageType = (MessageType)reader.ReadInt32();
                var messageId = reader.ReadString();
                var createdTicks = reader.ReadInt64();
                var sessionId = reader.ReadUInt32();
                var userSid = reader.ReadString();

                var metadataLength = reader.ReadInt32();
                var metadataBytes = reader.ReadBytes(metadataLength);
                var metadata = System.Text.Encoding.UTF8.GetString(metadataBytes);

                var payloadLength = reader.ReadInt32();
                var payload = payloadLength > 0 ? reader.ReadBytes(payloadLength) : null;

                return new PipeMessage
                {
                    Type = messageType,
                    MessageId = messageId,
                    CreatedUtc = new DateTime(createdTicks),
                    SessionId = sessionId,
                    UserSid = string.IsNullOrEmpty(userSid) ? null : userSid,
                    Metadata = metadata,
                    Payload = payload
                };
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to deserialize PipeMessage", ex);
            }
        }
    }
}