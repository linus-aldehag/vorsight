![Vörsight Logo](./.github/assets/vorsight-banner.png)
# Vörsight - Comprehensive PC Monitoring & Management System

A professional Windows-based monitoring system with centralized web dashboard for parental oversight, activity tracking, and secure screenshot archival.

**⚠️ Production Ready** - Automated releases, simplified configuration

## Overview

Vörsight is a client-server monitoring solution designed for Windows PCs with a Linux server. It provides real-time activity monitoring, screenshot capture, access scheduling, and comprehensive audit logging through a modern web interface.

### Architecture

```
┌─────────────────────────┐
│   Windows PC (Client)   │
│  ┌──────────────────┐   │
│  │ Vorsight.Service │───┼──┐
│  │ (Windows Service)│   │  │
│  └────────┬─────────┘   │  │
│           │ IPC         │  │
│  ┌────────▼─────────┐   │  │
│  │  Vorsight.Agent  │   │  │  WebSocket +
│  │ (User Session)   │   │  │  HTTP/S
│  └──────────────────┘   │  │
└─────────────────────────┘  │
                             │
┌────────────────────────────▼─────────┐
│  Linux (Server)                      │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ Node.js API  │  │  React SPA   │  │
│  │              │──│              │  │
│  │  Socket.IO   │  │  Dashboard   │  │
│  └──────┬───────┘  └──────────────┘  │
│         │                            │
│  ┌──────▼───────┐                    │
│  │   SQLite DB  │                    │
│  └──────────────┘                    │
└──────────────────────────────────────┘
         │
         ▼
  Google Drive
  (Screenshot Repository)
```

## Key Features

### 🔒 **Security & Privacy**
- Windows Service runs as LocalSystem for full system access
- Agent runs unprivileged in user session
- Secure IPC via Named Pipes (memory-only, no network exposure)
- Pre-shared key authentication between client and server

### 📸 **Activity Monitoring**
- Automated screenshot capture at configurable intervals
- Automatic upload to Google Drive (`/Vorsight/MachineName/YYYY-MM-DD/`)
- Timeline view of all activity

### 🛡️ **Audit & Security Events**
- Windows Event Log monitoring for security events
- Detects user creation, group changes, privilege escalations
- Web-based alert dashboard with persistent dismissal

### ⏰ **Access Control** (Future Feature)
- Scheduled access windows
- Forced logoff enforcement
- Real-time schedule updates

### 🌐 **Web Dashboard**
- Modern React-based UI
- Real-time machine status via WebSocket
- Screenshot gallery
- Audit event management
- Multi-machine support

## Quick Start

### Windows PC Installation

Download the latest `VorsightSetup.msi` from [GitHub Releases](../../releases):

1. Run the installer
2. Configure server connection:
   - Server URL (e.g., `http://raspberrypi.local:3000`)
   - Pre-shared key (match server configuration)
3. Complete installation

The service starts automatically and begins monitoring.

### Linux Server Setup

The server runs on any Linux system (Ubuntu, Debian, Raspberry Pi OS, etc.).

Download `vorsight-server-*.tar.gz` from [GitHub Releases](../../releases):

**Example:**
```bash
# Transfer to server
scp vorsight-server-*.tar.gz user@server:~/

# SSH and install
ssh user@server
tar -xzf vorsight-server-*.tar.gz
cd vorsight-server
sudo ./install.sh
```

See [Linux Deployment Guide](deploy/pi/README.md) for detailed instructions.

## Development Setup

### Prerequisites
- .NET 10.0 SDK
- Node.js 25+
- Visual Studio 2022 / Rider / VS Code

### Local Development

```powershell
# Clone
git clone https://github.com/your-repo/vorsight.git
cd vorsight

# Setup development environment
# (Creates appsettings.Development.json, .env files, etc.)
# Follow the prompts
dotnet run --project scripts/setup-dev

# Start Node.js server (Terminal 1)
cd src/Vorsight.Server
npm install
npm run dev

# Start React dev server (Terminal 2)
cd src/Vorsight.Web
npm install
npm run dev

# Run the Service (Terminal 3, as Administrator)
cd src/Vorsight.Service
dotnet run
```

Access the web UI at `http://localhost:5174` (React dev) or `http://localhost:3000` (production build).

For detailed setup instructions, see the [Development Setup Workflow](.agent/workflows/setup-dev.md).

## Project Structure

```
vorsight/
├── src/
│   ├── Vorsight.Service/      # Windows Service (C#) - "The Brain"
│   ├── Vorsight.Agent/         # User Session Agent (C#) - "The Eye"
│   ├── Vorsight.Core/          # Shared libraries
│   ├── Vorsight.Native/        # Windows P/Invoke wrappers
│   ├── Vorsight.Server/        # Node.js API server
│   ├── Vorsight.Web/           # React web dashboard
│   └── Vorsight.Setup/         # WiX installer project
├── deploy/
│   └── pi/                     # Pi deployment scripts & docs
├── .github/workflows/          # CI/CD automation
└── .agent/workflows/           # Development workflows
```

## Configuration

### Windows Service (`appsettings.json`)

```json
{
  "Server": {
    "Url": "http://your-pi:3000"
  },
  "Service": {
    "PresharedKey": "your-secure-key",
    "MaxScreenshotInterval": 10000
  },
  "GoogleDrive": {
    "ApplicationName": "Vorsight",
    "ClientSecretsPath": "client_secrets.json"
  },
  "Agent": {
    "ExecutablePath": "Vorsight.Agent.exe"
  }
}
```

### Server (`.env` on Linux)

```bash
PORT=3000
NODE_ENV=production
CLIENT_ORIGIN=http://your-server-ip:3000
JWT_SECRET=your-secure-random-secret
PSK=your-secure-key  # Must match Windows client
DB_PATH=./data/vorsight.db
```

## Deployment & Releases

### Automated Releases

GitHub Actions will:
1. Build Windows MSI installer
2. Build Pi deployment package (`.tar.gz`)
3. Create GitHub Release
4. Attach both artifacts

### Manual Development Build

```powershell
# Windows Installer
cd src/Vorsight.Setup
dotnet build -c Release

# Linux Package (Linux/WSL or GitHub Actions)
./deploy/pi/build.sh
```

## Google Drive Integration

Vörsight automatically backs up screenshots to Google Drive.

### Setup

1. Create a Google Cloud Project
2. Enable Google Drive API
3. Create OAuth 2.0 credentials (Desktop app)
4. Download `client_secrets.json`
5. Place in service directory (e.g., `C:\Program Files\Vörsight\`)
6. First run will open browser for OAuth consent

Screenshots are organized automatically:
```
/Vorsight/
  └── MACHINE-NAME/
      └── 2025-12-22/
          ├── screenshot_001.png
          └── screenshot_002.png
```

## Troubleshooting

### Service Won't Start
- Verify running as LocalSystem
- Check `C:\ProgramData\Vorsight\logs\`
- Ensure Agent executable path is correct in appsettings.json

### Screenshots Not Uploading
- Check Google Drive OAuth is complete (look for `DriveCredentials/` folder)
- Verify `client_secrets.json` exists and is valid
- Check service logs for upload errors

### Web Dashboard Shows "Offline"
- Verify Pi server is running: `sudo systemctl status vorsight`
- Check server URL in Windows `appsettings.json`
- Verify PSK matches on both client and server
- Check firewall allows port 3000

### Agent Not Launching
- Verify path in `appsettings.json` → `Agent:ExecutablePath`
- Check Event Viewer → Application logs
- Run agent manually to test: `Vorsight.Agent.exe`

## Contributing

This is currently a personal project. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

*License TBD*

## Status

**Current Version**: v1.0.0

**Status**: Production Ready

**Last Updated**: December 2025

---

**Built with**: .NET 10, Node.js 25, React 19, Socket.IO, SQLite, Google Drive API
