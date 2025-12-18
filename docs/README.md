# Vörsight Documentation

Welcome to the Vörsight documentation index. This folder contains comprehensive documentation for all components and features of the Vörsight PC Management Suite.

## Core Documentation

### [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
High-level overview of Vörsight, its purpose, and main components.

### [ARCHITECTURE.md](./ARCHITECTURE.md)
Detailed system architecture, component interactions, and design patterns.

### [QUICKSTART.md](./QUICKSTART.md)
Step-by-step guide to building, testing, and deploying Vörsight.

## Component Documentation

### Service Components

- **[VORSIGHT_SERVICE.md](./components/VORSIGHT_SERVICE.md)** - Main Windows Service running as LocalSystem
  - Kestrel web server setup
  - IPC server implementation
  - Service worker and health checks
  - Configuration and logging

- **[VORSIGHT_AGENT.md](./components/VORSIGHT_AGENT.md)** - Client-side agent (wuapihost.exe)
  - Screenshot capture functionality
  - IPC client communication
  - Session management
  - Deployment and execution

- **[VORSIGHT_CORE.md](./components/VORSIGHT_CORE.md)** - Shared business logic
  - Audit system and event filtering
  - IPC protocol and message handling
  - Access scheduling and enforcement
  - Data models and interfaces

- **[VORSIGHT_NATIVE.md](./components/VORSIGHT_NATIVE.md)** - Windows API P/Invoke wrappers
  - Process creation and session management
  - Session and token manipulation
  - System shutdown and logout operations
  - Privilege escalation helpers

- **[VORSIGHT_WEB.md](./components/VORSIGHT_WEB.md)** - Web frontend and API
  - Web API endpoints
  - React frontend (planned)
  - Authentication and authorization
  - Dashboard and monitoring UI

## Feature Documentation

### [ACCESS_SCHEDULING.md](./features/ACCESS_SCHEDULING.md)
Time-based access control, scheduling policies, and enforcement mechanisms.

### [AUDIT_SYSTEM.md](./features/AUDIT_SYSTEM.md)
Event logging, security monitoring, and tamper detection.

### [IPC_PROTOCOL.md](./features/IPC_PROTOCOL.md)
Named pipes communication, message formats, and protocol specifications.

### [SCREENSHOT_CAPTURE.md](./features/SCREENSHOT_CAPTURE.md)
Screenshot capture mechanism, GDI+ integration, and data transmission.

## Development Guides

### [CONTRIBUTING.md](./CONTRIBUTING.md)
Guidelines for contributing to Vörsight, including coding standards and pull request procedures.

### [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)
Local development environment setup and debugging instructions.

### [BUILD_SYSTEM.md](./BUILD_SYSTEM.md)
Build process, configuration, and deployment options.

## Deployment

### [INSTALLATION.md](./INSTALLATION.md)
Service installation, configuration, and initial setup procedures.

### [CONFIGURATION.md](./CONFIGURATION.md)
Configuration files, settings, and customization options.

### [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
Common issues, diagnostics, and solutions.

## API Reference

### [API_REFERENCE.md](./API_REFERENCE.md)
REST API endpoint documentation, request/response formats, and authentication.

## Security

### [SECURITY.md](./SECURITY.md)
Security design, authentication mechanisms, and best practices.

---

**Last Updated:** December 2025

For the main project README, see [../README.md](../README.md)

