namespace Vorsight.Contracts.Models
{
    public class SessionInfo(uint sessionId, bool isInteractive)
    {
        private uint SessionId { get; } = sessionId;
        private string Username { get; } = string.Empty;
        private string Domain { get; } = string.Empty;
        public bool IsInteractive { get; set; } = isInteractive;
        public bool IsRemote { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string ClientIpAddress { get; set; } = string.Empty;
        public uint ProcessId { get; set; }
        public bool HasActiveAgent { get; set; }
        public DateTime? LastAgentContact { get; set; }
        public string Metadata { get; set; } = string.Empty;

        public string GetFullUsername()
        {
            if (
                string.IsNullOrEmpty(Domain)
                || Domain.Equals("LOCALHOST", StringComparison.OrdinalIgnoreCase)
            )
                return Username;
            return $"{Domain}\\{Username}";
        }

        public string GetDisplayName()
        {
            var sessionType = IsRemote ? "RDP" : "Console";
            return $"Session {SessionId} - {GetFullUsername()} ({sessionType})";
        }
    }
}
