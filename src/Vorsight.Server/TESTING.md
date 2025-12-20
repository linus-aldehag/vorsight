# Vorsight Server - Testing Guide

## Current Status
✅ Node.js server running on http://localhost:3000
✅ Client registration implemented
✅ WebSocket communication ready

## Manual Testing Steps

### 1. Verify Server is Running
```bash
curl http://localhost:3000/api/health
```
Expected: `{"status":"ok","timestamp":"..."}`

### 2. Start Vorsight Service
```bash
cd c:\repos\vorsight
dotnet run --project src/Vorsight.Service/Vorsight.Service.csproj
```

**Watch for:**
- "Component started: ServerConnection" in logs
- "Machine ID: {guid}" in logs
- "Successfully registered with server" in logs
- "WebSocket connected" in logs
- "Machine authenticated with server" in logs

### 3. Check Database
```bash
cd src/Vorsight.Server
# Install sqlite3 if needed: npm install -g sqlite3
sqlite3 data/vorsight.db "SELECT * FROM machines;"
```

Expected: One row with your machine's info

### 4. Test API Endpoints
```bash
# List all machines
curl http://localhost:3000/api/machines

# Get specific machine (use ID from above)
curl http://localhost:3000/api/machines/{machine-id}

# Get machine state
curl http://localhost:3000/api/machines/{machine-id}/state
```

### 5. Monitor WebSocket Events
Open browser console at http://localhost:3000 and run:
```javascript
const socket = io('http://localhost:3000');
socket.on('machine:online', (data) => console.log('Machine online:', data));
socket.on('machine:state', (data) => console.log('State update:', data));
```

## Troubleshooting

**Service won't start:**
- Check if Node server is running on port 3000
- Check logs in `src/Vorsight.Service/bin/Debug/net10.0/win-x64/logs/`

**Registration fails:**
- Verify server is accessible: `curl http://localhost:3000/api/health`
- Check server logs in terminal running `npm start`

**WebSocket won't connect:**
- Check firewall settings
- Verify CORS settings in server

## Next Steps
Once registration works:
- Heartbeat will send every 30 seconds
- Activity updates will stream in real-time
- Screenshot notifications will appear
- Build React frontend and test multi-machine dashboard
