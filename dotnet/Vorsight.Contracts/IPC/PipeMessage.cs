using System.Text;

namespace Vorsight.Contracts.IPC;

[Serializable]
public class PipeMessage()
{
    public enum MessageType
    {
        Screenshot = 1,
        ScreenshotRequest = 2,
        ShutdownCommand = 3,
        Activity = 4,
    }

    public MessageType Type { get; set; }
    public string MessageId { get; set; } = Guid.NewGuid().ToString();
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public uint SessionId { get; set; }
    public string? UserSid { get; set; }
    public byte[]? Payload { get; set; }
    public int PayloadSize => Payload?.Length ?? 0;
    public string? Metadata { get; set; }

    public PipeMessage(MessageType type, uint sessionId, string? userSid = null)
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
        using var ms = new MemoryStream();
        using var writer = new BinaryWriter(ms);

        // Write header
        writer.Write((int)Type);
        writer.Write(MessageId);
        writer.Write(CreatedUtc.Ticks);
        writer.Write(SessionId);
        writer.Write(UserSid ?? string.Empty);

        // Write metadata
        var metadataBytes = Encoding.UTF8.GetBytes(Metadata ?? string.Empty);
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

    public static PipeMessage Deserialize(byte[] data, int length)
    {
        if (data == null || length == 0)
            throw new ArgumentException("Invalid data for deserialization");

        using var ms = new MemoryStream(data, 0, length);
        using var reader = new BinaryReader(ms);

        try
        {
            //Read header
            var messageType = (MessageType)reader.ReadInt32();
            var messageId = reader.ReadString();
            var createdTicks = reader.ReadInt64();
            var sessionId = reader.ReadUInt32();
            var userSid = reader.ReadString();

            //Read metadata
            var metadataLength = reader.ReadInt32();
            var metadataBytes = reader.ReadBytes(metadataLength);
            var metadata = Encoding.UTF8.GetString(metadataBytes);

            //Read payload
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
                Payload = payload,
            };
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Failed to deserialize PipeMessage", ex);
        }
    }
}
