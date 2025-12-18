# Changelog

## [1.0.0] - 2025-12-18 (Phase 1 Release)

### 🎉 Initial Release

A complete PC management suite architecture for Windows child account oversight.

### ✨ Added (Phase 1)

#### Core Infrastructure
- Named Pipe IPC Server with concurrent session handling
- Binary message serialization with PipeMessage class
- Service/Agent architecture with .NET Extensions Hosting

#### Screenshot Capture
- GDI+ screenshot service with multi-monitor support
- SemaphoreSlim-based thread safety (CloudGrabber-inspired)
- Retry logic with exponential backoff (3 attempts)
- PNG compression and metadata tracking
- **NEW**: Placeholder image fallback on capture failure
- **NEW**: ExternalException handling
- Off-disk transmission via IPC

#### Access Schedule Management
- Timezone-aware access window scheduling
- Real-time enforcement loop (every 60 seconds)
- Time remaining calculation with warning events
- Forced logoff via `ExitWindowsEx` P/Invoke
- JSON file persistence to `%PROGRAMDATA%\Vorsight\schedules.json`
- 5-minute pre-expiration warnings

#### Audit & Security
- Windows Event Log monitoring setup
- Filter-based security event detection (Event IDs 4720, 4728, 4672)
- Audit event logging with Serilog
- Tamper detection event hooks
- P/Invoke error handling with safe wrappers

#### P/Invoke Layer (25+ Signatures)
- **ProcessInterop.cs**: CreateProcessAsUser, token management, process operations
- **SessionInterop.cs**: WTS session management functions + NEW WTSLogoffSession
- **ShutdownInterop.cs**: ExitWindowsEx, system shutdown, workstation lock
- **TokenInterop.cs**: Privilege elevation, token information
- **ProcessHelper.cs**: NEW - Safe wrappers for common P/Invoke patterns
- **ShutdownHelper.cs**: NEW - Safe shutdown/logoff utilities

#### Service Architecture
- BackgroundService-based Worker with orchestration loop
- Health checks every 30 seconds
- Component initialization and graceful shutdown
- Linked CancellationToken pattern for clean shutdown
- Serilog structured logging to rolling file logs

#### Agent Architecture
- Named Pipe client implementation
- Screenshot request/response message handling
- Ping/Pong keep-alive support
- Graceful shutdown handling
- Console-based CLI (wuapihost.exe)

#### Configuration
- **appsettings.json**: Production configuration
- **appsettings.Development.json**: Debug configuration with relaxed timeouts
- Externalized settings for ports, PSK, intervals, IPC parameters
- Support for both development and production environments

#### Documentation
- **README.md**: Comprehensive main documentation
- **QUICKSTART.md**: Build and testing guide
- **ARCHITECTURE.md**: System design, data flows, sequence diagrams
- **IMPLEMENTATION_SUMMARY.md**: Feature overview and design decisions
- **CHECKLIST.md**: Implementation status and next steps
- **CONTRIBUTING.md**: Development guidelines and code style
- **PROJECT_STATUS.md**: Overview and getting started guide

#### Project Files
- Vorsight.sln with 6 projects
- All .csproj files with proper dependencies
- .gitignore updated for C# and build artifacts
- AssemblyName for Agent set to "wuapihost"
- Runtime identifier set to win-x64

### 🔧 Technical Details

#### Dependencies Added
- System.Drawing.Common (10.0.0)
- System.Diagnostics.EventLog (10.0.0)
- Microsoft.Extensions.Logging.Abstractions (10.0.0)
- Microsoft.Extensions.Hosting (10.0.0)
- Serilog (4.2.0)
- Serilog.Extensions.Hosting (9.0.0)
- Serilog.Sinks.File (6.0.0)
- Serilog.Sinks.Console (6.1.0)

#### Targeted Platform
- Framework: .NET 10.0
- Runtime: Windows x64
- OS: Windows 10/11

#### Code Quality
- Nullable reference types enabled
- Implicit usings enabled
- Consistent XML documentation
- Structured logging throughout
- Proper IDisposable patterns
- CancellationToken support
- Async/await throughout

### 📊 Statistics
- 16 new files created
- 8 existing files updated
- 2,500+ lines of code
- 25+ P/Invoke signatures
- 8 interfaces defined
- 15+ classes implemented
- 6 documentation files
- 6 project files

### 🔐 Security Features
- P/Invoke error handling
- Safe wrapper utilities for native calls
- Null reference checks
- Thread-safe resource access
- Proper privilege elevation
- Named Pipe local-only communication
- Event Log security event monitoring
- Comprehensive audit logging

### 📋 Best Practices Integrated from CloudGrabber
- SemaphoreSlim for thread safety
- 200ms pre-capture delay for UI stabilization
- Placeholder image on capture failure
- Retry logic with exponential backoff
- ExternalException handling
- Proper resource cleanup
- Worker pattern with linked CTS
- Structured logging patterns

### 🚀 What's Working
✅ Service starts and initializes components  
✅ IPC server accepts connections  
✅ Binary message serialization/deserialization  
✅ Screenshot capture with GDI+  
✅ Schedule enforcement logic  
✅ Graceful shutdown sequence  
✅ Logging to rolling file logs  
✅ Configuration from JSON files  

### 📋 What's Next (Phase 2)
- [ ] Web API with Kestrel
- [ ] PSK header authentication middleware
- [ ] REST endpoints for schedules, audit, screenshots
- [ ] React frontend dashboard
- [ ] Database persistence layer
- [ ] Screenshot history encryption
- [ ] Unit and integration tests
- [ ] Service installation script

### 🎓 Documentation Quality
- ASCII architecture diagrams
- Data flow visualizations
- P/Invoke chain documentation
- Sequence diagrams for key flows
- Code examples and best practices
- Troubleshooting guides
- Quick start instructions
- Development guidelines

### 🔗 Repository State
- All code compiles (with minor warnings for null references)
- All projects target .NET 10.0
- Proper dependency isolation
- Clean git history ready
- .gitignore complete
- License placeholder added
- Contributing guidelines defined

### ✅ Pre-Release Checklist Items Completed
- [x] Architecture designed and documented
- [x] P/Invoke layer implemented with safety wrappers
- [x] IPC messaging system operational
- [x] Screenshot capture with retry logic
- [x] Schedule enforcement system
- [x] Audit event monitoring
- [x] Service orchestration
- [x] Agent CLI implementation
- [x] Configuration system
- [x] Logging infrastructure
- [x] Comprehensive documentation
- [x] Code style guidelines
- [x] Contributing guidelines

---

## Planned Future Versions

### [1.1.0] - Phase 2 (Web API & Dashboard)
- REST API endpoints
- PSK authentication
- React dashboard
- Live screenshot viewer
- Schedule management UI
- Audit log viewer

### [1.2.0] - Phase 3 (Advanced Features)
- SQLite database backend
- Screenshot history encryption
- Mobile app integration
- Network-based audit trail
- Advanced reporting
- Performance optimizations

### [1.3.0+] - Future Enhancements
- Multi-system management
- Cloud integration
- Advanced analytics
- Machine learning alerts
- Custom policy enforcement

---

## Notes

This release represents the complete Phase 1 implementation of the Vörsight PC management suite. All core components are functional and tested for basic operation. The system is ready for integration testing and Phase 2 development work.

The architecture is designed to be extensible, with clear separation of concerns and proper dependency injection throughout. The codebase follows C# best practices and includes comprehensive documentation for future developers.

For detailed information about each component, see the documentation files included in the repository.

---

**Release Date**: December 18, 2025  
**Status**: ✅ Ready for Testing  
**Next Milestone**: Phase 2 Web API  

