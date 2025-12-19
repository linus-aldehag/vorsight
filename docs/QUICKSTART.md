# Quick Start - Building & Testing Vörsight

## Prerequisites

- Windows 10/11 (x64)
- .NET 10 SDK installed
- PowerShell 5.1+ (included with Windows)
- Administrator privileges (for service installation)

## Build Instructions

### Step 1: Clone/Navigate to Repository
```powershell
cd C:\repos\vorsight
```

### Step 2: Restore and Build
```powershell
# Clean previous build artifacts
dotnet clean

# Restore dependencies
dotnet restore

# Build solution (Debug)
dotnet build Vorsight.sln -c Debug

# Or build for Release
dotnet build Vorsight.sln -c Release
```

### Step 3: Build Individual Projects

```powershell
# Build Service
cd src\Vorsight.Service
dotnet build -c Debug

# Build Agent (as wuapihost.exe)
cd ..\Vorsight.Agent
dotnet build -c Debug
# Output: bin\Debug\net10.0\win-x64\wuapihost.exe

# Build Core
cd ..\Vorsight.Core
dotnet build -c Debug
```

## Testing Locally (Without Service Installation)

### Run the Service in Console Mode

```powershell
cd C:\repos\vorsight\src\Vorsight.Service

# Run in console (perfect for debugging)
dotnet run

# Expected output:
# [INF] Vörsight Service starting...
# [INF] Application directory: C:\repos\vorsight\src\Vorsight.Service\bin\Debug\net10.0\
# [INF] Named Pipe server started on pipe: VorsightIPC
# [INF] Schedule enforcement started
# [INF] Audit manager initialized with 3 filters
```

### Run the Agent in a Separate Console

```powershell
cd C:\repos\vorsight\src\Vorsight.Agent

# Run in console
dotnet run

# Expected output:
# [INF] Vörsight Agent starting...
# [INF] Agent running in session 1
# [INF] Connecting to IPC server on pipe: VorsightIPC
# [INF] Connected to IPC server
```

## Build Output Locations

```
Debug builds:
├── src\Vorsight.Service\bin\Debug\net10.0\
│   ├── Vorsight.Service.exe
│   └── logs\
│       └── vorsight-service-*.log

├── src\Vorsight.Agent\bin\Debug\net10.0\win-x64\
│   ├── wuapihost.exe
│   └── wuapihost.dll

├── src\Vorsight.Core\bin\Debug\net10.0\
│   └── Vorsight.Core.dll

└── src\Vorsight.Native\bin\Debug\net10.0\
    └── Vorsight.Native.dll

Release builds:
└── Same structure under bin\Release\net10.0\
```

## Verifying the Build

### Check Service Build
```powershell
cd C:\repos\vorsight\src\Vorsight.Service\bin\Debug\net10.0

# List executable
ls *.exe

# View dependencies
ls *.dll | Sort-Object

# Check log directory created
mkdir logs -ErrorAction SilentlyContinue
```

### Check Agent Build
```powershell
cd C:\repos\vorsight\src\Vorsight.Agent\bin\Debug\net10.0\win-x64

# Verify wuapihost.exe exists
ls wuapihost.exe

# Check file size (should be ~150KB+ for self-contained)
(ls wuapihost.exe).Length / 1KB
```

## Troubleshooting

### Error: "The type or namespace name 'Screen' could not be found"
**Cause**: System.Drawing.Common not restored
**Fix**: 
```powershell
dotnet restore
dotnet build -c Debug
```

### Error: "EventLogWatcher could not be found"
**Cause**: System.Diagnostics.EventLog package missing
**Fix**:
```powershell
dotnet add src\Vorsight.Core\Vorsight.Core.csproj package System.Diagnostics.EventLog
dotnet restore
```

### Error: "ILogger<> could not be found"
**Cause**: Microsoft.Extensions.Logging not in using statements
**Fix**: Verify `using Microsoft.Extensions.Logging;` is at top of file
- `ScreenshotService.cs` ✅
- `ScheduleManager.cs` ✅
- `AuditManager.cs` ✅
- `NamedPipeServer.cs` ✅

### Service Won't Start
**Common causes**:
1. Port 5443 or 9443 already in use
2. Logs directory doesn't exist (created automatically)
3. Another instance already running
4. Antivirus blocking file access

**Debug**:
```powershell
# Check if logs directory exists
ls C:\repos\vorsight\src\Vorsight.Service\bin\Debug\net10.0\logs

# Check for port conflicts
netstat -ano | findstr ":5443\|:9443"

# Kill any lingering processes
Get-Process | Where-Object {$_.ProcessName -like "*vorsight*"} | Stop-Process -Force
```

## Clean Build

If you encounter persistent build issues:

```powershell
cd C:\repos\vorsight

# Remove all build artifacts
Remove-Item -Path "src\*/bin" -Recurse -Force
Remove-Item -Path "src\*/obj" -Recurse -Force

# Restore and rebuild
dotnet clean
dotnet restore
dotnet build Vorsight.sln -c Debug
```

## Publishing for Production

### Create Release Build
```powershell
cd C:\repos\vorsight

# Build all projects
dotnet build Vorsight.sln -c Release

# Publish Service as self-contained
dotnet publish src\Vorsight.Service -c Release -o publish\Service --self-contained

# Publish Agent as self-contained
dotnet publish src\Vorsight.Agent -c Release -o publish\Agent --self-contained

# Copy Agent to System32
copy publish\Agent\wuapihost.exe C:\Windows\System32\
```

## Next Steps

After successful build:

1. **Read** [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
2. **Test** local execution of Service and Agent
3. **Review** `appsettings.json` for configuration
4. **Check** log output for any warnings
5. **Explore** `src/Vorsight.Core/IPC` for message protocol
6. **Study** `src/Vorsight.Native` P/Invoke signatures
7. **Plan** Phase 2 - Web API and React frontend

---

**Last Updated**: December 18, 2025
**Target Framework**: .NET 10.0
**Platforms**: Windows x64

