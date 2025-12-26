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

### Etymology

**Vörsight** = **Vör** + **foresight**

**Pronunciation**: /ˈvœrˌsaɪt/ (VURR-site) — with Swedish/Nordic **ö** (like the "u" in "hurt").

[Vör](https://en.wikipedia.org/wiki/V%C3%B6r) is a Norse goddess of wisdom and vigilance. She is described as wise and inquisitive, with the ability to perceive and understand all that happens. The name Vör means "the careful one" or "the aware one."

Combined with "foresight" (the ability to predict or anticipate future events), **Vörsight** embodies:
- **Vigilance**: Constant, watchful monitoring
- **Wisdom**: Understanding patterns and behaviors 
- **Foresight**: Anticipating issues before they occur

Perfect for a system that watches over and protects through awareness and anticipation.

## Key Features

### 🔒 **Security & Privacy**
- Windows Service runs as LocalSystem for full system access
- Agent runs unprivileged in user session
- Secure IPC via Named Pipes (memory-only, no network exposure)
- Pre-shared key authentication between client and server

### 📸 **Activity Monitoring**
- Automated screenshot capture at configurable intervals
- **Direct upload to Google Drive** from Windows client (server provides OAuth credentials)
- Organized folder structure: `/Vorsight/MachineName/YYYY-MM-DD/`
- Timeline view of all activity with Drive links

### 🛡️ **Audit & Security Events**
- Windows Event Log monitoring for security events
- Detects user creation, group changes, privilege escalations
- Web-based alert dashboard with persistent dismissal

### ⏰ **Access Control**
- Scheduled access windows
- Forced logoff enforcement
- Real-time schedule updates

### 🌐 **Web Dashboard**
- Modern React-based UI
- Real-time machine status via WebSocket
- **Machine display names** with inline editing
- Screenshot gallery with **direct Google Drive links**
- Activity timeline and statistics
- Audit event management with persistent dismissal
- Multi-machine support

### 🔧 **Streamlined Installation**
- MSI installer with guided setup
- Server configuration during installation
- **Google Drive OAuth** integrated into installer flow
- **Optional stealth mode** for parental monitoring (appears as "Windows Update Helper")

## Quick Start

### Windows PC Installation

Download the latest `VorsightSetup.msi` from [GitHub Releases](../../releases):

1. Run the installer
2. Configure server connection:
   - Server URL (e.g., `http://raspberrypi.local:3000`)
   - Pre-shared key (match server configuration)
3. **(Optional)** Enable stealth mode:
   - Checkbox: "Use stealth application naming"
   - Installs as "Windows Update Helper" for parental monitoring
4. Complete installation

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

See [Linux Deployment Guide](deploy/linux/README.md) for detailed instructions.

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
│   └── linux/                  # Linux deployment scripts & docs
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
  "Agent": {
    "ExecutablePath": "Agent\\Vorsight.Agent.exe"
  }
}
```

### Server (`.env` on Linux)

```bash
PORT=3000
NODE_ENV=production
CLIENT_ORIGIN=http://your-server-ip:3000
JWT_SECRET=your-secure-random-secret  # Auto-generated by installer
PSK=your-secure-key  # Must match Windows client
DB_PATH=./data/vorsight.db

# Google Drive OAuth (configured during setup)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
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
./deploy/linux/build.sh
```

## Google Drive Integration

Vörsight uses a **client-side direct upload architecture** for screenshots:

1. **Windows client** captures screenshots
2. **Client requests OAuth token** from server via `/api/oauth/google/credentials`
3. **Client uploads directly** to Google Drive (no data through server)
4. **Server provides credentials only**, not file throughput

This keeps the lightweight Node.js server focused on coordination and authentication.

### Setup via Installer (Recommended)

1. Create a Google Cloud Project
2. Enable Google Drive API
3. Create OAuth 2.0 credentials (Desktop app)
4. Download JSON
5. **During MSI installation**, paste the JSON content in the Google Drive dialog
6. Browser opens automatically for OAuth consent
7. Credentials ready when service starts

### Architecture Details

**Server-side** (Linux):
- Stores OAuth refresh tokens
- Provides access tokens via authenticated API endpoint
- No screenshot file handling

**Client-side** (Windows):
- Captures screenshots
- Requests fresh access tokens from server
- Uploads directly to Google Drive API
- Organizes files in folder structure: `/Vorsight/MachineName/YYYY-MM-DD/`

### Folder Organization

Screenshots are organized automatically:
```
/Vorsight/
  └── MACHINE-NAME/
      └── 2025-12-26/
          ├── 14-30-15 - Chrome.png
          └── 14-45-22 - Visual Studio.png
```

## Stealth Mode (Parental Monitoring)

For parental monitoring scenarios, the installer offers an optional "stealth mode" that makes the software less obvious to tech-savvy users.

**When enabled during installation:**
- Directory: `C:\Program Files\Windows Update Helper\`
- Service: `WindowsUpdateService.exe` / `Windows Update Helper Service`
- Agent: `wuhelper.exe` / `WindowsUpdateHelper`
- Description: "Provides background update checking and system health monitoring"

**Functionality:** Identical to normal mode, only the naming changes.

**To enable:** Check "Use stealth application naming" during MSI installation.

## Troubleshooting

### Service Won't Start
- Verify running as LocalSystem
- Check `C:\ProgramData\Vorsight\logs\`
- Ensure Agent executable path is correct in appsettings.json

### Screenshots Not Uploading
- Verify server has valid Google OAuth credentials (check server `.env`)
- Check Windows service can reach server: test `/api/oauth/google/credentials` endpoint with PSK header
- Check service logs at `C:\ProgramData\Vorsight\logs\` for upload errors
- Verify Google Drive API is enabled in your Google Cloud Project

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

**Last Updated**: December 26, 2025

---

**Built with**: .NET 10, Node.js 25, React 19, Socket.IO, SQLite, Google Drive API
