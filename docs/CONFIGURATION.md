# Configuration

The Service reads configuration from `appsettings.json`.

## Service Configuration

```json
{
  "Service": {
    "ListeningPort": 9443,
    "PresharedKey": "your-psk-here",
    "MaxScreenshotInterval": 5000,
    "AuditLogRetention": 90
  },
  "ChildUser": {
    "Username": "child",
    "SessionId": 1
  },
  "Agent": {
    "ExecutablePath": "C:\\Windows\\System32\\wuapihost.exe"
  }
}
```

### Settings Reference

| Setting | Description | Default |
|---------|-------------|---------|
| `ListeningPort` | Port for the Kestrel web server. Should be high-numbered. | 9443 |
| `PresharedKey` | Secret key for API authentication intent. | (User Defined) |
| `MaxScreenshotInterval` | Milliseconds between screen captures. | 5000 |
| `AuditLogRetention` | Days to keep audit logs in the database. | 90 |
| `ChildUser.SessionId` | The session ID of the interactive user to monitor. | 1 |
| `Agent.ExecutablePath` | Full path to the `wuapihost.exe` agent binary. | (Path) |

**Important Notes:**
- The PSK should be extracted at installation and stored securely.
- Session ID for interactive user is typically **1**.
- Port should be high-numbered and non-standard for security.
