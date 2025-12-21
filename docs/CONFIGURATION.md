# Configuration

# Configuration

Vörsight uses two primary configuration files: `.env` for the Server and `appsettings.json` for the Service.

## 1. Server Configuration (`src/Vorsight.Server/.env`)

The Node.js Server requires a `.env` file in its root directory:

```ini
PORT=5050
NODE_ENV=development
# Secret key for JWT tokens (Web UI)
JWT_SECRET=your-secret-key-change-me
# Secret key for Service authentication (must match Service config)
SERVICE_API_KEY=your-service-key-change-me
```

## 2. Service Configuration (`src/Vorsight.Service/appsettings.json`)

The C# Service configuration focuses on system integration and connection to the Server.

```json
{
  "OutputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}",
  "Agent": {
    "ExecutablePath": "C:\\Windows\\System32\\wuapihost.exe"
  },
  "Schedule": {
    "DataDirectory": "C:\\ProgramData\\Vorsight"
  },
  "Server": {
      "BaseUrl": "http://localhost:5050",
      "ApiKey": "your-service-key-change-me"
  }
}
```

### Settings Reference

| Section | Setting | Description | Default |
|---------|---------|-------------|---------|
| `Server` | `BaseUrl` | URL of the Node.js Server. | `http://localhost:5050` |
| `Server` | `ApiKey` | Secret key to authenticate with the Server. Must match `.env`. | - |
| `Agent` | `ExecutablePath` | Full path to the `wuapihost.exe` agent binary. | (Path) |
| `Schedule` | `DataDirectory` | Directory where offline schedules are cached. | `C:\ProgramData\Vorsight` |

