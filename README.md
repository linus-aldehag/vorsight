![Vörsight Logo](./.github/assets/vorsight-banner.png)
# Vörsight - Comprehensive PC Monitoring & Management System

A monitoring system for Windows PCs with centralized web dashboard for parental oversight, activity tracking, and secure screenshot archival.

⚖️ Licensing & Intent
Vörsight is Source Available under the Polyform Noncommercial 1.0.0 license.
Personal & Local Use: Always free. We believe users should own their own surveillance and data-gathering tools.
Open Contributions: Pull Requests are highly encouraged! By contributing, you agree to license your work under the project's existing terms.
Commercial Restriction: Use in for-profit corporate environments or for direct commercial gain is strictly restricted. If you are interested in a commercial license, please contact the author.
For the full legal text, please refer to the LICENSE file in the root of this repository.

## Overview

Vörsight is a client-server monitoring solution designed for Windows PCs with a Linux server. It provides real-time activity monitoring, screenshot capture, access scheduling, and comprehensive audit logging through a modern web interface.

### Architecture

![Vörsight Architecture](./.github/assets/vorsight-architecture.jpg)

### Etymology

**Vörsight** = **Vör** + **foresight**

**Pronunciation**: /ˈvœrˌsaɪt/ (VURR-site) — with Swedish/Nordic **ö** (like the "u" in "hurt").

[Vör](https://en.wikipedia.org/wiki/V%C3%B6r) is a Norse goddess of wisdom and vigilance. She is described as wise and inquisitive, with the ability to perceive and understand all that happens. The name Vör means "the careful one" or "the aware one."

Combined with "foresight" (the ability to predict or anticipate future events), **Vörsight** embodies:
- **Vigilance**: Constant, watchful monitoring
- **Wisdom**: Understanding patterns and behaviors 
- **Foresight**: Anticipating issues before they occur

## Key Features

### 🔒 **Security & Privacy**
- Windows Service runs as LocalSystem for full system access
- Agent runs unprivileged in user session for live screen access
- Secure IPC via Named Pipes (memory-only, no network exposure)
- Machine API key authentication for client-server communication
- Service key for web dashboard authentication

### 📸 **Activity Monitoring**
- Automated screenshot capture at configurable intervals
- Direct upload to Google Drive
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
- Windows installer (Inno Setup) with guided setup
- Server generates service key automatically during Linux setup
- **Optional stealth mode** for parental monitoring (appears as "Windows Update Helper")

## Quick Start

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
sudo ./setup.sh
```

See [Linux Deployment Guide](deploy/linux/README.md) for detailed instructions.

### Windows PC Installation

Download the latest `VorsightSetup.exe` from [GitHub Releases](../../releases):

1. Run the installer
2. Configure server connection:
   - **Server Address** (e.g., `raspberrypi.local` or IP address)
   - **Server Port** (default: `3000`)
   - **Service Key** (obtained from Linux server installation output)
3. **(Optional)** Enable stealth mode:
   - Checkbox: "Use stealth application naming"
   - Installs as "Windows Update Helper" for parental monitoring
4. Complete installation

The service starts automatically and begins monitoring.

## Project Structure

```
vorsight/
├── src/
│   ├── Vorsight.Service/      # Windows Service (C#) - "The Brain"
│   ├── Vorsight.Agent/         # User Session Agent (C#) - "The Eye"
│   ├── Vorsight.Core/          # Shared libraries
│   ├── Vorsight.Native/        # Windows P/Invoke wrappers
│   ├── Vorsight.Server/        # Node.js API server
│   └── Vorsight.Web/           # React web dashboard
├── installer/                  # Inno Setup installer script
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
    "Url": "http://your-server:3000"
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
CLIENT_ORIGIN=http://your-server-address:3000
SERVICE_KEY=your-secure-random-secret  # Service key - Auto-generated by installer
DB_PATH=./data/vorsight.db

# Google Drive OAuth (configured during setup)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

## Deployment & Releases

### Automated Releases

GitHub Actions will:
1. Build Windows installer (Inno Setup)
2. Build Linux deployment package (`.tar.gz`)
3. Create GitHub Release
4. Attach both artifacts

## Google Drive Integration

Vörsight uses a **client-side direct upload architecture** for screenshots:

1. **Windows client** captures screenshots
2. **Client requests OAuth token** from server via `/api/oauth/google/credentials`
3. **Client uploads directly** to Google Drive (no data through server)
4. **Server provides credentials only**, not file throughput

This keeps the lightweight Node.js server focused on coordination and authentication.

### Setup via Server Installation

1. Create a Google Cloud Project
2. Enable Google Drive API
3. Create OAuth 2.0 credentials (Web application)
4. **During Linux server installation**, provide Client ID and Client Secret
5. After setup, connect via web dashboard Settings page
6. Complete OAuth flow in browser
7. Server stores refresh token, provides access tokens to Windows clients

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
- Check Windows service can reach server: test `/api/oauth/google/credentials` endpoint
- Check service logs at `C:\ProgramData\Vorsight\logs\` for upload errors
- Verify Google Drive API is enabled in your Google Cloud Project
- Ensure machine is registered and has valid API key

### Web Dashboard Shows "Offline"
- Verify server is running: `sudo systemctl status vorsight`
- Check server URL in Windows `appsettings.json`
- Verify machine has registered successfully and received API key
- Check firewall allows port 3000
- Check WebSocket connection in browser console

### Agent Not Launching
- Verify path in `appsettings.json` → `Agent:ExecutablePath`
- Check Event Viewer → Application logs
- Run agent manually to test: `Vorsight.Agent.exe`
