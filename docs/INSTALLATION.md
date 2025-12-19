# Installation & Setup

## Prerequisites

- **Windows 10/11** (x64 or x86)
- **.NET 6.0+** runtime
- Administrator privileges for initial installation

## Build and Install

### 1. Build the Agent
The Agent is built as `wuapihost.exe` for obfuscation purposes:

```bash
dotnet build src/Vorsight.Agent -c Release
# Output: bin/Release/wuapihost.exe
```

### 2. Service Installation
To install the service (requires admin):

```powershell
# Using sc.exe
sc create VorsightService binPath= "C:\Path\To\Vorsight.Service.exe" start= auto

# Start the service
net start VorsightService
```

To uninstall:

```powershell
net stop VorsightService
sc delete VorsightService
```

## Running Locally (Development)

### Service
Use the test harness in `Vorsight.Service`:

```bash
cd src/Vorsight.Service
dotnet run
```
This runs without requiring Windows Service installation.

### Agent
```bash
cd src/Vorsight.Agent
dotnet run -- --pipe-name "VorsightPipe_{SessionId}"
```
