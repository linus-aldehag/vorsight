# Contributing to Vörsight

This document explains how the project is organized and how to contribute.

## Project Organization

```
vorsight/
├── docs/                           # Documentation (could be moved here)
│   ├── ARCHITECTURE.md            
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── CHECKLIST.md
│   └── QUICKSTART.md
├── src/
│   ├── Vorsight.Native/           # P/Invoke wrappers (no deps)
│   ├── Vorsight.Core/             # Business logic & IPC
│   ├── Vorsight.Service/          # Windows Service
│   ├── Vorsight.Agent/            # User session CLI
│   └── Vorsight.Web/              # Web API & frontend (Phase 2)
├── tests/                          # Unit/integration tests (Phase 2)
├── .gitignore
├── README.md                       # Main documentation
└── Vorsight.sln
```

## Development Setup

### Prerequisites
- Windows 10/11 x64
- .NET 10 SDK
- Visual Studio 2022 or JetBrains Rider
- Administrator privileges (for service install/uninstall)

### First Time Setup
```bash
git clone https://github.com/[org]/vorsight.git
cd vorsight
dotnet restore
dotnet build
```

See **QUICKSTART.md** for detailed build instructions.

## Architecture Overview

Vörsight is a multi-process system:

1. **Service** (LocalSystem privilege): Runs as Windows Service
   - Manages IPC communication
   - Enforces access schedules
   - Monitors security events
   - Hosts web API (future)

2. **Agent** (User session): Lightweight CLI tool
   - Communicates via Named Pipes
   - Captures screenshots
   - Sends data to Service

3. **Shared Libraries**:
   - **Vorsight.Core**: Business logic, IPC, scheduling
   - **Vorsight.Native**: P/Invoke wrappers

See **ARCHITECTURE.md** for detailed diagrams and flows.

## Key Technologies

- **IPC**: Named Pipes (Windows-native, local-only)
- **Screenshot Capture**: GDI+ with SemaphoreSlim threading
- **Service Framework**: .NET Extensions Hosting
- **Logging**: Serilog with file/console sinks
- **P/Invoke**: Windows API wrappers with safe helpers

## Code Style

### C# Conventions
- Use `PascalCase` for public members, `_camelCase` for private fields
- Enable nullable reference types (`#nullable enable`)
- Use implicit usings
- Document public APIs with XML comments
- Use consistent indentation (4 spaces)

### Best Practices
- Always use `using` for IDisposable resources
- Use `CancellationToken` for async operations
- Log with context (use Serilog's structured logging)
- Handle Windows API errors with P/Invoke helpers
- Clean up P/Invoke resources in finally blocks

### Example
```csharp
public async Task<byte[]> CaptureScreenAsync(CancellationToken cancellationToken = default)
{
    try
    {
        await _lock.WaitAsync(cancellationToken);
        
        var bitmap = CaptureScreenInternal();
        try
        {
            using var ms = new MemoryStream();
            bitmap.Save(ms, ImageFormat.Png);
            return ms.ToArray();
        }
        finally
        {
            bitmap?.Dispose();
        }
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Screenshot capture failed");
        throw;
    }
    finally
    {
        _lock.Release();
    }
}
```

## Testing

### Unit Testing (TODO: Phase 2)
```bash
dotnet test Vorsight.Tests
```

### Local Integration Testing
```bash
# In one terminal - run Service
cd src/Vorsight.Service
dotnet run

# In another terminal - run Agent
cd src/Vorsight.Agent
dotnet run
```

### Expected Output
- Service: "Named Pipe server started on pipe: VorsightIPC"
- Agent: "Connected to IPC server"
- No errors in logs

## Debugging

### Enable Debug Logging
Edit `appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug"  // Change from "Information"
    }
  }
}
```

### Check Log Output
```bash
# Service logs
Get-Content src\Vorsight.Service\bin\Debug\net10.0\logs\* -Tail 50 -Wait

# Agent logs
Get-Content $env:TEMP\vorsight\logs\* -Tail 50 -Wait
```

### Attach Debugger
1. Start Service in console: `dotnet run`
2. In Visual Studio: Debug → Attach to Process
3. Find and select `dotnet.exe` process
4. Set breakpoints

## Common Tasks

### Add a New Feature
1. Create interface in `Vorsight.Core` if it's shared logic
2. Implement concrete class
3. Register in DI container (`Program.cs`)
4. Add tests (Phase 2)
5. Document in code comments
6. Update README if public-facing

### Add P/Invoke Wrapper
1. Add signature to `Vorsight.Native/[InteropClass].cs`
2. Create safe wrapper in `ProcessHelper.cs` or `ShutdownHelper.cs`
3. Add error handling
4. Document with XML comments

### Update Configuration
1. Modify `appsettings.json` (production values)
2. Update `appsettings.Development.json` (dev values)
3. Update documentation in README
4. Don't commit local secrets

### Add Logging
Use Serilog's structured logging:
```csharp
_logger.LogInformation("Schedule created: {ScheduleId} for {Username}", 
    schedule.ScheduleId, schedule.ChildUsername);

_logger.LogWarning("Access expiring: {TimeRemaining} remaining", timeRemaining);

_logger.LogError(ex, "Failed to force logoff for {User}", username);
```

## Commit Guidelines

- Use descriptive commit messages
- Reference issues: "Fixes #123"
- Keep commits atomic and logical
- Don't commit build artifacts or secrets
- Sign commits if configured

Example:
```
feat: Add placeholder image fallback for screenshot failures

- Implement CreatePlaceholderImage() with error details
- Add ExternalException handling for capture retries
- Inspired by CloudGrabber implementation

Fixes #45
```

## Pull Request Process

1. Create feature branch: `git checkout -b feature/name`
2. Make changes following code style
3. Test locally: `dotnet build && dotnet run`
4. Commit with descriptive message
5. Push: `git push origin feature/name`
6. Create Pull Request with description
7. Link to related issues
8. Ensure tests pass

## Performance Considerations

### Screenshot Capture
- SemaphoreSlim ensures only one capture at a time
- 200ms pre-capture delay allows UI to stabilize
- PNG compression reduces payload size
- Retry logic prevents flaky captures

### IPC Communication
- 64KB buffer per session supports large messages
- Binary format minimizes serialization overhead
- Concurrent session handling prevents bottlenecks

### Schedule Enforcement
- Checks every 60 seconds (configurable)
- In-memory operations only
- JSON persistence async

## Security Guidelines

### What We Do
- Service runs as LocalSystem (maximal privileges)
- Agent runs in child user context (limited)
- All P/Invoke calls validated with error codes
- Windows API errors logged and handled
- SemaphoreSlim prevents race conditions

### What We Don't Do (Yet)
- Don't trust user input without validation
- Don't commit secrets or hardcoded PSK
- Don't use deprecated Windows APIs
- Don't skip error handling

### Future Security
- Implement PSK authentication middleware
- Add request validation and sanitization
- Use HTTPS for web API
- Encrypt screenshot storage
- Implement audit log integrity checking

## Documentation Standards

Every public class/method should have XML docs:

```csharp
/// <summary>
/// Captures a screenshot of all connected displays.
/// </summary>
/// <param name="cancellationToken">Cancellation token for async operation</param>
/// <returns>Screenshot data as PNG bytes, or null on complete failure</returns>
/// <exception cref="InvalidOperationException">Thrown if all capture attempts fail</exception>
public async Task<byte[]> CaptureScreenAsync(CancellationToken cancellationToken = default)
```

## Release Process (Future)

1. Update version in project files
2. Update CHANGELOG.md
3. Create GitHub release with notes
4. Build release binaries
5. Create installation package
6. Test on clean Windows machine

## Getting Help

- Check **README.md** for overview
- Read **ARCHITECTURE.md** for design details
- See **IMPLEMENTATION_SUMMARY.md** for feature list
- Follow **QUICKSTART.md** for local testing
- Review **CHECKLIST.md** for remaining tasks

## License

[To be determined - add license file]

## Code of Conduct

Please be respectful and constructive in all interactions.

---

**Last Updated**: December 18, 2025

