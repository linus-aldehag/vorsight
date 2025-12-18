# 👋 Welcome to Vörsight

**A comprehensive PC management suite for child account oversight on Windows.**

---

## 🎯 What is Vörsight?

Vörsight is a sophisticated Windows-based system that provides parents with oversight of child user accounts through:

- **Access Scheduling** - Control when a child can use the computer
- **Screenshot Capture** - Monitor activity through periodic screenshots
- **Security Auditing** - Track system events and suspicious activity
- **Forced Enforcement** - Automatically log off when time expires

All while running securely as a Windows Service with proper privilege management.

---

## ⚡ Quick Start (5 minutes)

### Build the Project
```bash
cd C:\repos\vorsight
dotnet build Vorsight.sln -c Debug
```

### Run Service Locally
```bash
cd src\Vorsight.Service
dotnet run
```

### In Another Terminal, Run Agent
```bash
cd src\Vorsight.Agent
dotnet run
```

**Expected Output**:
- Service: `Named Pipe server started on pipe: VorsightIPC`
- Agent: `Connected to IPC server`

---

## 📚 Documentation

### For Different Audiences

**Just Arrived?** → [INDEX.md](INDEX.md) - Documentation map  
**Want to Build?** → [QUICKSTART.md](QUICKSTART.md) - Build guide  
**Need to Understand?** → [README.md](README.md) - Main documentation  
**Ready to Code?** → [CONTRIBUTING.md](CONTRIBUTING.md) - Development guide  
**Want Visual Overview?** → [VISUAL_SUMMARY.md](VISUAL_SUMMARY.md) - Diagrams  
**Checking Status?** → [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) - What's done  

---

## 🏗️ Project Structure

```
vorsight/
├── src/
│   ├── Vorsight.Native/       # Windows API wrappers (P/Invoke)
│   ├── Vorsight.Core/         # Business logic, IPC, scheduling
│   ├── Vorsight.Service/      # Windows Service (LocalSystem)
│   ├── Vorsight.Agent/        # User session CLI (wuapihost.exe)
│   └── Vorsight.Web/          # Web API & frontend (Phase 2)
├── README.md                  # Main documentation
├── QUICKSTART.md              # Build & test guide
├── ARCHITECTURE.md            # System design
├── CONTRIBUTING.md            # Development guide
└── ...other docs...
```

---

## 🎯 What You Get

### Phase 1 (Complete ✅)
- ✅ Service & Agent architecture
- ✅ Named Pipe IPC messaging
- ✅ Screenshot capture (GDI+)
- ✅ Access schedule enforcement
- ✅ Audit event monitoring
- ✅ P/Invoke layer (25+ signatures)
- ✅ Comprehensive documentation

### Phase 2 (Planned 📋)
- [ ] Web API with REST endpoints
- [ ] PSK authentication
- [ ] React dashboard
- [ ] Live screenshot viewer

### Phase 3 (Future 🚀)
- [ ] Database backend
- [ ] Screenshot encryption
- [ ] Mobile integration
- [ ] Advanced reporting

---

## 🔧 Development

### Prerequisites
- Windows 10/11 x64
- .NET 10 SDK
- Visual Studio / Rider (optional)
- Administrator access (for service testing)

### Setup
```bash
# Clone and navigate
cd C:\repos\vorsight

# Build
dotnet build

# Test locally
cd src\Vorsight.Service
dotnet run
```

Full instructions: [QUICKSTART.md](QUICKSTART.md)

---

## 📖 Key Concepts

### Service Architecture
- **Vorsight.Service** runs as Windows Service (LocalSystem privilege)
- **Vorsight.Agent** runs in child user session (unprivileged)
- Communication via Named Pipes (secure, local-only)

### Screenshot Capture
- Agent captures screen in user session using GDI+
- Sends PNG bytes directly over IPC (never touches disk)
- Service stores in memory for dashboard

### Access Enforcement
- Schedule Manager checks every 60 seconds
- If access time expired: Forces logoff via `ExitWindowsEx`
- 5-minute warning events before enforcement

### Security
- P/Invoke wrappers handle errors safely
- Privilege elevation validated before shutdown
- Audit events logged for all system changes

---

## 🚀 Running Service Locally

### Terminal 1 - Start Service
```bash
cd src\Vorsight.Service
dotnet run
```

You should see:
```
[INF] Vörsight Service starting...
[INF] Named Pipe server started on pipe: VorsightIPC
[INF] Schedule enforcement started
[INF] Audit manager initialized with 3 filters
```

### Terminal 2 - Start Agent
```bash
cd src\Vorsight.Agent
dotnet run
```

You should see:
```
[INF] Vörsight Agent starting...
[INF] Agent running in session 1
[INF] Connecting to IPC server on pipe: VorsightIPC
[INF] Connected to IPC server
```

### Check Logs
```bash
Get-Content src\Vorsight.Service\bin\Debug\net10.0\logs\* -Tail 20 -Wait
Get-Content $env:TEMP\vorsight\logs\* -Tail 20 -Wait
```

---

## 🆘 Need Help?

### Common Questions
- **How do I build?** → [QUICKSTART.md](QUICKSTART.md#build-instructions)
- **How do I test?** → [QUICKSTART.md](QUICKSTART.md#testing-locally-without-service-installation)
- **What's the architecture?** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **How do I contribute?** → [CONTRIBUTING.md](CONTRIBUTING.md)
- **What's the status?** → [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)
- **Where do I start?** → [INDEX.md](INDEX.md)

### Troubleshooting
- [QUICKSTART.md#troubleshooting](QUICKSTART.md#troubleshooting)
- Check log files for error details
- Ensure port 5443/9443 not in use

---

## 📋 Status Overview

| Component | Status | Notes |
|-----------|--------|-------|
| P/Invoke Layer | ✅ Complete | 25+ signatures |
| IPC Messaging | ✅ Complete | Binary serialization |
| Screenshot | ✅ Complete | GDI+ with retry |
| Scheduling | ✅ Complete | Timezone-aware |
| Audit | ✅ Complete | Event Log ready |
| Service | ✅ Complete | Orchestration |
| Agent | ✅ Complete | CLI tool |
| Documentation | ✅ Complete | 10 guides |
| Web API | 📋 Planned | Phase 2 |
| Dashboard | 📋 Planned | Phase 2 |

---

## 🎓 Learning Path

**Start Here** (5 min):
1. Read this file
2. Look at [VISUAL_SUMMARY.md](VISUAL_SUMMARY.md)

**Understand the System** (15 min):
1. Read [README.md](README.md)
2. Read [ARCHITECTURE.md](ARCHITECTURE.md)

**Get It Running** (30 min):
1. Follow [QUICKSTART.md](QUICKSTART.md)
2. Build and test locally
3. Check logs

**Start Developing** (60 min):
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Review code examples
3. Follow code style
4. Make small change

---

## 📞 Quick Links

| Link | Purpose |
|------|---------|
| [README.md](README.md) | Main documentation |
| [QUICKSTART.md](QUICKSTART.md) | Build & test |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development guide |
| [INDEX.md](INDEX.md) | Documentation index |
| [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) | Status |

---

## ✨ Key Features

### Screenshot Capture
- Captures screen every N seconds (configurable)
- Multi-monitor support
- Retry logic (3 attempts, exponential backoff)
- Placeholder image on failure
- PNG compression
- Off-disk transmission

### Access Scheduling
- Define access hours (timezone-aware)
- Specify allowed days of week
- Maximum daily screen time
- Automatic enforcement
- 5-minute warning before logoff

### Audit Monitoring
- Windows Event Log monitoring
- Security event detection
- Tamper detection alerts
- Real-time logging

### System Integration
- Windows Service (LocalSystem)
- Session-aware agent launch
- Graceful shutdown
- Comprehensive logging

---

## 🎉 Getting Started Now

1. **Clone/Navigate**
   ```bash
   cd C:\repos\vorsight
   ```

2. **Build**
   ```bash
   dotnet build Vorsight.sln -c Debug
   ```

3. **Test**
   ```bash
   # Terminal 1
   cd src\Vorsight.Service && dotnet run
   
   # Terminal 2
   cd src\Vorsight.Agent && dotnet run
   ```

4. **Check Logs**
   ```bash
   Get-Content src\Vorsight.Service\bin\Debug\net10.0\logs\* -Tail 50
   ```

---

## 🚀 Next Steps

- [ ] Read [README.md](README.md)
- [ ] Follow [QUICKSTART.md](QUICKSTART.md)
- [ ] Build and run locally
- [ ] Review [ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] Check [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)
- [ ] Plan Phase 2 work

---

**Welcome to Vörsight! 🎯**

For more information, start with [README.md](README.md) or check the [documentation index](INDEX.md).

---

**Project Status**: ✅ Phase 1 Complete  
**Last Updated**: December 18, 2025  
**Ready for**: Integration Testing & Phase 2 Development

