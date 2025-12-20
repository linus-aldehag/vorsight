# Vorsight - Project Structure

## Overview
Vorsight is a multi-client monitoring system with a centralized Node.js server and Windows client services.

## Project Structure

```
vorsight/
├── src/
│   ├── Vorsight.Server/          # Node.js backend (Express + Socket.io)
│   │   ├── src/
│   │   │   ├── server.js         # Main entry point
│   │   │   ├── db/               # Database (SQLite)
│   │   │   ├── routes/           # REST API routes
│   │   │   ├── services/         # Business logic
│   │   │   ├── websocket/        # Socket.io handlers
│   │   │   └── middleware/       # Auth, error handling
│   │   ├── data/                 # SQLite database files (gitignored)
│   │   ├── public/               # Built React app (served by Express)
│   │   └── package.json
│   │
│   ├── Vorsight.Web/             # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── features/         # Feature modules
│   │   │   ├── api/              # API client
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── Vorsight.Service/         # Windows service (.NET)
│   ├── Vorsight.Agent/           # Screenshot/activity agent (.NET)
│   ├── Vorsight.Core/            # Shared .NET libraries
│   └── Vorsight.Native/          # Native Windows APIs
│
└── Vorsight.sln                  # .NET solution file

```

## Technology Stack

### Backend (Vorsight.Server)
- **Runtime**: Node.js 20+ LTS
- **Framework**: Express.js
- **WebSocket**: Socket.io
- **Database**: SQLite (better-sqlite3)
- **Deployment**: Raspberry Pi / Windows

### Frontend (Vorsight.Web)
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Mantine
- **State**: Zustand (planned)
- **Routing**: React Router (planned)

### Windows Client
- **Runtime**: .NET 10
- **Service**: Vorsight.Service (background service)
- **Agent**: Vorsight.Agent (screenshot/activity capture)

## Development Workflow

### Start Backend Server
```bash
cd src/Vorsight.Server
npm install
npm run dev          # Development with nodemon
# or
npm start            # Production
```

### Start Frontend Dev Server
```bash
cd src/Vorsight.Web
npm install
npm run dev          # Vite dev server on http://localhost:5174
```

### Build Frontend for Production
```bash
cd src/Vorsight.Web
npm run build
# Copy dist/ to src/Vorsight.Server/public/
```

### Start Windows Service
```bash
cd src/Vorsight.Service
dotnet run
```

## Deployment

### Raspberry Pi (Production)
1. Install Node.js 20 LTS
2. Copy `src/Vorsight.Server` to Pi
3. Build React frontend and copy to `public/`
4. Install PM2: `npm install -g pm2`
5. Start: `pm2 start src/server.js --name vorsight`

### Windows (Development)
- Run all components locally
- Server on http://localhost:3000
- Frontend dev on http://localhost:5174
- Service connects to localhost:3000

## Architecture

```
┌─────────────────────────────────┐
│   Raspberry Pi / Windows        │
│  ┌───────────────────────────┐  │
│  │  Vorsight.Server          │  │
│  │  - Express API            │  │
│  │  - Socket.io WebSocket    │  │
│  │  - Serves React SPA       │  │
│  │  - SQLite database        │  │
│  └───────────────────────────┘  │
└──────────────┬──────────────────┘
               │ HTTPS/WSS
    ┌──────────┴──────────┬────────┐
    │                     │        │
┌───▼────┐          ┌────▼───┐   ...
│Windows │          │Windows │
│Client 1│          │Client 2│
│Service │          │Service │
│+ Agent │          │+ Agent │
└────────┘          └────────┘
```

## Key Features

- **Multi-Client**: Centralized server manages multiple Windows machines
- **Real-Time**: WebSocket communication for live updates
- **Offline Support**: Clients queue data when disconnected
- **Hardware IDs**: Stable machine identification
- **Google Drive**: Screenshot storage
- **Activity Tracking**: Application usage monitoring
- **Scheduling**: Configurable monitoring windows
