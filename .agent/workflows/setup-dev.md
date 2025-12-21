---
description: Setup local development environment
---

# Development Environment Setup

This workflow guides you through setting up your local Vorsight development environment.

## Prerequisites

- .NET 10.0 SDK
- Node.js 18+ 
- Visual Studio, Rider, or VS Code

## Steps

### 1. Clone and Restore Dependencies

```powershell
git clone <repository-url>
cd vorsight
dotnet restore
cd src/Vorsight.Server
npm install
```

### 2. Create Development Configuration for Service

Create `src/Vorsight.Service/appsettings.Development.json`:

```json
{
  "Service": {
    "PresharedKey": "local-dev-psk-change-this"
  },
  "Agent": {
    "ExecutablePath": "C:\\repos\\vorsight\\src\\Vorsight.Agent\\bin\\Debug\\net10.0-windows\\win-x64\\Vorsight.Agent.exe"
  },
  "IPC": {
    "PipeName": "VorsightIPC_Dev"
  },
  "GoogleDrive": {
    "ParentFolderId": "your-folder-id-here"
  }
}
```

> **Note:** Adjust the `Agent:ExecutablePath` to match your actual repository location.

### 3. Create Environment File for Server

```powershell
cd src/Vorsight.Server
cp .env.example .env
```

Edit `.env` with your local values:
```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5174
JWT_SECRET=local-dev-jwt-secret-change-this
DB_PATH=./data/vorsight.db
```

### 4. Build React Web App

```powershell
cd ../Vorsight.Web
npm install
npm run build
```

### 5. Copy Web Build to Server

```powershell
cd ../Vorsight.Server
npm run copy:web
```

## Running the Application

### Option A: Full Stack (Recommended for Testing)

1. **Start the Node.js server:**
   ```powershell
   cd src/Vorsight.Server
   npm run dev
   ```

2. **Run the C# Service (as Administrator):**
   ```powershell
   cd src/Vorsight.Service
   dotnet run
   ```

3. **Access the web UI:**
   - Navigate to `http://localhost:3000`

### Option B: Development Mode (UI Changes)

```powershell
# Terminal 1: Node.js server
cd src/Vorsight.Server
npm run dev

# Terminal 2: React dev server (hot reload)
cd src/Vorsight.Web
npm run dev

# Terminal 3: C# Service
cd src/Vorsight.Service
dotnet run
```

Access React dev server at `http://localhost:5174`

## Troubleshooting

### Service Can't Find Agent

Make sure the `Agent:ExecutablePath` in `appsettings.Development.json` points to the correct location. Build the agent first:

```powershell
cd src/Vorsight.Agent
dotnet build
```

### Database Errors

The database is automatically created on first run. If you encounter issues:

```powershell
rm src/Vorsight.Server/data/vorsight.db
# Restart the Node.js server
```

### Port Conflicts

If port 3000 or 5050 are in use, change them in:
- `.env` (PORT=3000)
- `appsettings.Development.json` (Service:ListeningPort)
