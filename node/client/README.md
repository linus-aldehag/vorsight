# Vörsight Web Dashboard

React-based web dashboard for the Vörsight monitoring system.

## Features

- **Real-time monitoring** via WebSocket connections
- **Machine management** with custom display names (inline editing)
- **Screenshot gallery** with timeline view
- **Audit event tracking** with dismissal persistence  
- **Access control** schedule management
- **Multi-machine support** with online/offline status

## Technology Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Redux Toolkit** for state management
- **Socket.IO Client** for real-time updates
- **Tailwind CSS** + **shadcn/ui** components
- **Recharts** for data visualization
- **Lucide React** for icons

## Development

```bash
npm install
npm run dev
```

Access at `http://localhost:5174`

## Building

```bash
npm run build
```

Output in `dist/` directory, served by Node.js server in production.

## Key Components

- **MachineSelector** - Multi-machine switcher with display name editing
- **EditableMachineName** - Inline editing for custom machine names
- **HealthStats** - Real-time system metrics
- **ScreenshotGallery** - Image viewer with timeline
- **AuditEventsList** - Security event monitoring
- **ScheduleManager** - Access control configuration

## State Management

- **MachineContext** - Selected machine, online status, display names
- **Redux** - Screenshots, audit events, schedules

## API Integration

REST endpoints at `/api/*` and WebSocket at `/socket.io`.

See main README for full documentation.
