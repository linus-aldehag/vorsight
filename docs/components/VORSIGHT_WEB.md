# Vörsight Web (Vorsight.Web)

## Overview

Vörsight.Web is the web API and frontend component served by the Kestrel web server running in the Vörsight Service. It provides a management interface and API endpoints for monitoring, configuration, and control of the system.

**Current Status**: Early development phase - basic scaffolding in place

## Project Structure

```
Vorsight.Web/
├── Program.cs                      # Web application setup
├── Vorsight.Web.csproj             # Project file
├── appsettings.json                # Production configuration
├── appsettings.Development.json    # Development configuration
├── Properties/
│   └── launchSettings.json         # Launch configuration
└── wwwroot/                        # Static files (future)
    ├── index.html                  # React app entry (planned)
    ├── css/                        # Stylesheets (planned)
    ├── js/                         # JavaScript (planned)
    └── assets/                     # Images, icons (planned)
```

## Current Implementation

### Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();
```

**Status**: Basic Kestrel server scaffold

## Planned Architecture

### Layered Structure

```
Controllers/
├── HealthController.cs            # Health checks
├── ScheduleController.cs          # Schedule CRUD operations
├── AuditController.cs             # Audit event queries
└── ScreenshotController.cs        # Screenshot retrieval

Services/
├── IScheduleService.cs            # Schedule business logic
├── IAuditService.cs               # Audit querying
├── IScreenshotService.cs          # Screenshot retrieval
└── IAuthenticationService.cs      # PSK header validation

Models/
├── ScheduleDto.cs                 # Schedule transfer object
├── AuditEventDto.cs               # Audit event transfer object
├── ScreenshotDto.cs               # Screenshot transfer object
└── ApiResponse.cs                 # Standard response wrapper

Middleware/
├── AuthenticationMiddleware.cs     # PSK validation
├── ErrorHandlingMiddleware.cs      # Global error handling
└── LoggingMiddleware.cs            # Request/response logging
```

## Planned Features

### 1. REST API Endpoints

#### Health & Status

```
GET /api/health
Response: { "status": "healthy", "uptime": "01:23:45", "activeAgents": 2 }
```

#### Schedule Management

```
GET    /api/schedules                    # List all schedules
POST   /api/schedules                    # Create schedule
GET    /api/schedules/{id}               # Get schedule
PUT    /api/schedules/{id}               # Update schedule
DELETE /api/schedules/{id}               # Delete schedule
PUT    /api/schedules/{id}/enforce       # Enforce schedule now
```

#### Audit Events

```
GET    /api/audit/events                 # List events (paginated)
GET    /api/audit/events/{id}            # Get event details
GET    /api/audit/events?filter=critical # Filter by severity
POST   /api/audit/events/search          # Full-text search
```

#### Screenshots

```
GET    /api/screenshots/latest           # Latest screenshot
GET    /api/screenshots/{sessionId}      # Session's latest
GET    /api/screenshots?from=ts&to=ts    # Time range
DELETE /api/screenshots/{id}             # Delete screenshot
```

### 2. Authentication

#### PSK Header Validation

```csharp
public class AuthenticationMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Missing PSK header");
            return;
        }

        string[] headerParts = authHeader.ToString().Split(' ');
        if (headerParts.Length != 2 || headerParts[0] != "PSK")
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Invalid PSK format");
            return;
        }

        string providedKey = headerParts[1];
        string expectedKey = _configuration["Security:PSKKey"];

        if (providedKey != expectedKey)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsync("Invalid PSK");
            return;
        }

        await _next(context);
    }
}
```

### 3. React Frontend (Planned)

#### Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│          Vörsight Management Dashboard               │
├──────────────┬──────────────────────────────────────┤
│ Navigation   │                                       │
│ - Dashboard  │  Dashboard                            │
│ - Schedules  │  ┌─────────────────────────┐         │
│ - Audit      │  │ System Status: Healthy  │         │
│ - Settings   │  │ Active Sessions: 2      │         │
│              │  │ Last Audit: 5min ago    │         │
│              │  └─────────────────────────┘         │
│              │                                       │
│              │  Recent Events                        │
│              │  ┌─────────────────────────┐         │
│              │  │ [Table of events]       │         │
│              │  └─────────────────────────┘         │
│              │                                       │
└──────────────┴──────────────────────────────────────┘
```

#### Component Structure (Planned)

```
src/
├── App.tsx                    # Root component
├── pages/
│   ├── DashboardPage.tsx     # Main dashboard
│   ├── SchedulesPage.tsx     # Schedule management
│   ├── AuditPage.tsx         # Audit event viewer
│   └── SettingsPage.tsx      # Configuration
├── components/
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   ├── ScheduleCard.tsx
│   ├── EventTable.tsx
│   └── ScreenshotViewer.tsx
├── services/
│   ├── api.ts                # Axios API client
│   ├── scheduleService.ts
│   ├── auditService.ts
│   └── authService.ts
└── styles/
    ├── App.css
    └── index.css
```

## Configuration

### appsettings.json (Production)

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://0.0.0.0:9443",
        "Certificate": {
          "Path": "/var/lib/vorsight/certs/server.pfx",
          "Password": ""
        }
      }
    }
  },
  "Security": {
    "PSKKey": "your-secure-preshared-key"
  }
}
```

### appsettings.Development.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Debug"
    }
  },
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://localhost:5443"
      }
    }
  },
  "Security": {
    "PSKKey": "dev-key-12345"
  }
}
```

## API Response Format

### Success Response

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "scheduleId": "sched-001",
    "userId": 1000,
    "startTime": "2025-12-18T14:00:00Z",
    "endTime": "2025-12-18T22:00:00Z"
  },
  "message": "Schedule retrieved successfully"
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Invalid schedule configuration",
  "errors": [
    {
      "field": "endTime",
      "message": "End time must be after start time"
    }
  ]
}
```

## Security Considerations

### Authentication

- **PSK Header**: Pre-shared key in HTTP header
- **HTTPS Only**: All connections encrypted
- **No CORS**: Localhost-only by default
- **No Session Storage**: Stateless API

### Authorization

Currently all authenticated requests have full access. Future enhancements:
- Role-based access control (RBAC)
- Per-schedule permissions
- Audit log filtering by user role
- Administrative vs. viewer roles

### Data Protection

- Sensitive data never logged
- Certificates stored securely (OS certificate store)
- Configuration secrets encrypted
- Screenshot data cleared after retention period

## Development Workflow

### Run in Development

```powershell
cd src\Vorsight.Web
dotnet run --configuration Debug
# Server runs on https://localhost:5443
```

### Build for Production

```powershell
cd src\Vorsight.Web
dotnet publish -c Release -o .\publish
```

### React Development (Planned)

```powershell
cd src\Vorsight.Web\ClientApp
npm install
npm start  # Hot reload on http://localhost:3000
```

## Integration with Service

The Web component runs as part of the Vörsight Service:

```csharp
// In Vorsight.Service/Program.cs
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWebHosting();  // Add web hosting
builder.Services.AddVorsightServices();  // Add business logic

var host = builder.Build();
// Web server starts automatically with host
await host.RunAsync();
```

### Accessing Business Logic

Controllers inject Core services:

```csharp
[ApiController]
[Route("api/[controller]")]
public class SchedulesController : ControllerBase
{
    private readonly IScheduleManager _scheduleManager;
    private readonly ILogger<SchedulesController> _logger;

    public SchedulesController(
        IScheduleManager scheduleManager,
        ILogger<SchedulesController> logger)
    {
        _scheduleManager = scheduleManager;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetSchedules()
    {
        var schedules = await _scheduleManager.GetSchedulesAsync();
        return Ok(new { success = true, data = schedules });
    }
}
```

## Performance Optimization

### Caching

```csharp
// Cache schedule queries for 5 minutes
services.AddStackExchangeRedis(options =>
{
    options.Configuration = Configuration.GetConnectionString("Redis");
});

// In controller
[ResponseCache(Duration = 300)]
[HttpGet]
public async Task<IActionResult> GetSchedules() { ... }
```

### Pagination

```csharp
[HttpGet]
public async Task<IActionResult> GetEvents(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 50)
{
    var events = await _auditService.GetEventsPagedAsync(page, pageSize);
    return Ok(new { success = true, data = events });
}
```

### Compression

```csharp
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});
```

## Deployment Considerations

### Certificate Management

```powershell
# Generate self-signed certificate (dev)
New-SelfSignedCertificate -CertStoreLocation Cert:\LocalMachine\My `
  -DnsName localhost -FriendlyName VorsightDev

# Export for PFXCERT
$cert = Get-ChildItem -Path Cert:\LocalMachine\My -FriendlyName VorsightDev
Export-PfxCertificate -Cert $cert -FilePath c:\temp\vorsight-dev.pfx -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)
```

### Reverse Proxy Setup (Optional)

```
nginx/IIS proxy → https://localhost:9443 (Kestrel)
```

## Monitoring & Diagnostics

### Health Endpoint

```csharp
app.MapHealthChecks("/api/health", new HealthCheckOptions
{
    Predicate = _ => true,
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            uptime = TimeSpan.FromMilliseconds(GC.GetTotalMemory(false)),
            activeAgents = ...,
            timestamp = DateTime.UtcNow
        };
        await context.Response.WriteAsJsonAsync(response);
    }
});
```

### Structured Logging

```csharp
builder.Services.AddSerilog((services, lc) => lc
    .ReadFrom.Configuration(configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/web-.log", rollingInterval: RollingInterval.Day));
```

## Related Documentation

- [Vorsight.Service](./VORSIGHT_SERVICE.md)
- [Vorsight.Core](./VORSIGHT_CORE.md)
- [API Reference](../API_REFERENCE.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Security](../SECURITY.md)

