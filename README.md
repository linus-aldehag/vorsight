﻿# Vörsight - PC Management Suite for Child Safety

A comprehensive Windows-based PC management system designed to provide parental oversight, access scheduling, and activity auditing for child user accounts.

**📋 [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - See what's been built and the architecture details.
**📚 [Complete Documentation](docs/README.md)** - Browse comprehensive component and feature documentation in the `docs/` folder.

## Project Overview

Vörsight (`vorsight` in code) is a sophisticated client-server architecture built in C# and designed to run on Windows systems. It operates at the system level to manage access schedules, capture user activity, and maintain audit logs for a designated child user account.

### Core Components
- **Control Plane**:
  - **Vorsight.Server** (Node.js): The central dashboard backend and API.
  - **Vorsight.Web** (React): The web-based management interface.
- **System Plane**:
  - **Vorsight.Service** (C# .NET): The "Brain" (Windows Service, LocalSystem) that controls the PC.
  - **Vorsight.Agent** (C# .NET): The "Eye" (User Session Agent) that interacts with the user session.
- **Libraries**:
  - **Vorsight.Core**: Shared logic, IPC, and data models.
  - **Vorsight.Native**: Windows API P/Invoke wrappers.

## Key Features

- **IPC (Named Pipes)**: Secure, memory-only communication between Service and Agent.
- **Access Scheduling**: Time-based access control with forced logoff enforcement.
- **Audit Logging**: Real-time monitoring of Windows Event Logs for security events.
- **The Pulse**: Service-driven mechanism to trigger screenshots and activity checks.
- **Secure Architecture**: Service runs as LocalSystem; Agent runs in user session (unprivileged).

## Documentation

All detailed documentation has been moved to the `docs/` folder.

- **[Getting Started](docs/START_HERE.md)**
- **[Component Docs](docs/README.md#component-documentation)**
- **[Installation Guide](docs/INSTALLATION.md)**
- **[Configuration Guide](docs/CONFIGURATION.md)**
- **[Architecture](docs/ARCHITECTURE.md)**

## Project Structure

```
vorsight/
├── src/                # Source code
│   ├── Vorsight.Service/
│   ├── Vorsight.Agent/
│   ├── Vorsight.Core/
│   ├── Vorsight.Native/
│   └── Vorsight.Web/
├── docs/               # Documentation
└── README.md           # This file
```

## Status

**Current Status**: Early Development
**Last Updated**: December 2025

For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
