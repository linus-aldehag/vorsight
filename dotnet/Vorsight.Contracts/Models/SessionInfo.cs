using System;

namespace Vorsight.Contracts.Models
{
    /// <summary>
    /// Represents information about an active user session.
    /// </summary>
    public class SessionInfo
    {
        /// <summary>
        /// Session ID (typically Session 0 = system, Session 1 = interactive user).
        /// </summary>
        public uint SessionId { get; set; }

        /// <summary>
        /// Username of the session owner.
        /// </summary>
        public string Username { get; set; }

        /// <summary>
        /// User SID (Security Identifier).
        /// </summary>
        public string UserSid { get; set; }

        /// <summary>
        /// Domain name (e.g., "COMPUTERNAME" for local accounts).
        /// </summary>
        public string Domain { get; set; }

        /// <summary>
        /// Session state (Active, Connected, Disconnected, etc.).
        /// </summary>
        public string State { get; set; }

        /// <summary>
        /// When this session was created.
        /// </summary>
        public DateTime SessionStartTime { get; set; }

        /// <summary>
        /// Whether this is an interactive (console) session.
        /// </summary>
        public bool IsInteractive { get; set; }

        /// <summary>
        /// Whether this is an RDP session.
        /// </summary>
        public bool IsRemote { get; set; }

        /// <summary>
        /// Client machine name (for RDP sessions).
        /// </summary>
        public string ClientName { get; set; }

        /// <summary>
        /// IP address of connected client.
        /// </summary>
        public string ClientIpAddress { get; set; }

        /// <summary>
        /// Process ID of the session manager process.
        /// </summary>
        public uint ProcessId { get; set; }

        /// <summary>
        /// Whether the Vörsight Agent is running in this session.
        /// </summary>
        public bool HasActiveAgent { get; set; }

        /// <summary>
        /// Last time we received communication from the Agent.
        /// </summary>
        public DateTime? LastAgentContact { get; set; }

        /// <summary>
        /// Custom data associated with this session.
        /// </summary>
        public string Metadata { get; set; }

        public SessionInfo()
        {
            SessionStartTime = DateTime.UtcNow;
            Username = string.Empty;
            UserSid = string.Empty;
            Domain = string.Empty;
            State = string.Empty;
            ClientName = string.Empty;
            ClientIpAddress = string.Empty;
            Metadata = string.Empty;
        }

        /// <summary>
        /// Gets the full username including domain.
        /// </summary>
        public string GetFullUsername()
        {
            if (string.IsNullOrEmpty(Domain) || Domain.Equals("LOCALHOST", StringComparison.OrdinalIgnoreCase))
                return Username;
            return $"{Domain}\\{Username}";
        }

        /// <summary>
        /// Gets a display name for this session.
        /// </summary>
        public string GetDisplayName()
        {
            var sessionType = IsRemote ? "RDP" : "Console";
            return $"Session {SessionId} - {GetFullUsername()} ({sessionType})";
        }
    }
}

