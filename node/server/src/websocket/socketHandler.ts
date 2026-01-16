import { Server, Socket } from 'socket.io';
import { prisma } from '../db/database';
import { getConnectionStatus, getStatusText } from '../utils/statusHelper';
import { StatePayload, ActivityPayload, AuditEventPayload, ScreenshotPayload } from '../types';
// Removed unused MachineSettings import

// Extend Socket interface to include machineId
interface ExtendedSocket extends Socket {
    machineId?: string;
}

// Helper: Broadcast updated machine list to all web clients
async function broadcastMachineList(io: Server) {
    try {
        const machines = await prisma.machine.findMany({
            include: { state: true },
            orderBy: { name: 'asc' }
        });

        const machinesList = machines.map(m => {
            // Parse settings to get pingIntervalSeconds
            let pingIntervalSeconds = 30; // default
            try {
                if (m.state?.settings) {
                    const settings = JSON.parse(m.state.settings);
                    pingIntervalSeconds = settings.monitoring?.pingIntervalSeconds || settings.pingIntervalSeconds || 30;
                }
            } catch (e) {
                // Use default
            }

            const status = getConnectionStatus(m.lastSeen, pingIntervalSeconds);

            let pingReachable = false;
            if (m.state?.healthStatus) {
                try {
                    const health = JSON.parse(m.state.healthStatus);
                    if (health.status === 'reachable' || health === 'reachable') pingReachable = true;
                } catch (e) {
                    if (m.state.healthStatus === 'reachable') pingReachable = true;
                }
            }

            let connectionStatus = status.connectionStatus;
            if (connectionStatus === 'offline' && pingReachable) {
                connectionStatus = 'reachable';
            }

            const machineObj = {
                id: m.id,
                name: m.name,
                displayName: m.displayName,
                hostname: m.hostname,
                ipAddress: m.ipAddress,
                isOnline: status.isOnline,
                connectionStatus,
                pingStatus: pingReachable ? 'reachable' : undefined,
                settings: m.state?.settings,
                lastSeen: m.lastSeen,
                status: m.status || 'active',
                metadata: m.metadata ? JSON.parse(m.metadata) : {},
                statusText: ''
            };

            machineObj.statusText = getStatusText(machineObj);

            return machineObj;
        });

        io.emit('machines:list', machinesList);
    } catch (error) {
        console.error('Error broadcasting machines list:', error);
    }
}

// Internal helper reused for single socket
async function broadcastToSocket(socket: Socket) {
    try {
        const machines = await prisma.machine.findMany({
            include: { state: true },
            orderBy: { name: 'asc' }
        });

        const machinesList = machines.map(m => {
            let pingIntervalSeconds = 30;
            try {
                if (m.state?.settings) {
                    const settings = JSON.parse(m.state.settings);
                    pingIntervalSeconds = settings.pingIntervalSeconds || 30;
                }
            } catch (e) { }

            const status = getConnectionStatus(m.lastSeen, pingIntervalSeconds);
            let pingReachable = false;
            if (m.state?.healthStatus) {
                try {
                    const health = JSON.parse(m.state.healthStatus);
                    if (health.status === 'reachable' || health === 'reachable') pingReachable = true;
                } catch (e) {
                    if (m.state.healthStatus === 'reachable') pingReachable = true;
                }
            }

            let connectionStatus = status.connectionStatus;
            if (connectionStatus === 'offline' && pingReachable) {
                connectionStatus = 'reachable';
            }

            const machineObj = {
                id: m.id,
                name: m.name,
                displayName: m.displayName,
                hostname: m.hostname,
                ipAddress: m.ipAddress,
                isOnline: status.isOnline,
                connectionStatus,
                pingStatus: pingReachable ? 'reachable' : undefined,
                settings: m.state?.settings,
                lastSeen: m.lastSeen,
                status: m.status || 'active',
                metadata: m.metadata ? JSON.parse(m.metadata) : {},
                statusText: ''
            };

            machineObj.statusText = getStatusText(machineObj);
            return machineObj;
        });

        socket.emit('machines:list', machinesList);
    } catch (error) {
        console.error('Error sending machines list:', error);
    }
}

export default (io: Server) => {
    io.on('connection', (socket: ExtendedSocket) => {

        // Web client connects - send current machines list
        socket.on('web:subscribe', async () => {
            // Removed unused 'ip' variable
            try {
                await broadcastToSocket(socket);
            } catch (error) {
                console.error('Error sending machines list:', error);
            }
        });

        // Web client wants to watch a specific machine (for high-frequency updates like activity/screenshots)
        socket.on('web:watch', (machineId: string) => {
            if (machineId) {
                // Leave other machine rooms? 
                // For simplicity, we can just join. Ideally we might want to leave others if we only view one.
                // But user might have multiple tabs or want alerts.
                // Let's just join.
                socket.join(`machine:${machineId}`);
                // console.log(`Socket ${socket.id} joined room machine:${machineId}`);
            }
        });

        socket.on('web:unwatch', (machineId: string) => {
            if (machineId) {
                socket.leave(`machine:${machineId}`);
            }
        });

        // Machine connects
        socket.on('machine:connect', async (data) => {
            try {
                const { machineId, apiKey } = data;

                if (!machineId || !apiKey) {
                    const ipAddress = (socket.handshake.address ||
                        socket.conn.remoteAddress ||
                        socket.request?.connection.remoteAddress ||
                        'unknown') as string;

                    console.error(`Connection rejected from ${ipAddress}: Missing credentials (machineId: ${machineId})`);
                    socket.emit('machine:error', { error: 'Missing credentials' });
                    return;
                }

                // Extract IP address from socket connection
                const ipAddress = (socket.handshake.address ||
                    socket.conn.remoteAddress ||
                    socket.request?.connection.remoteAddress ||
                    'unknown') as string;

                // Verify API key
                const machine = await prisma.machine.findFirst({
                    where: { id: machineId, apiKey: apiKey }
                });

                if (machine) {
                    socket.machineId = machineId;
                    socket.join(`machine:${machineId}`);

                    // Update last seen AND IP address
                    await prisma.machine.update({
                        where: { id: machineId },
                        data: {
                            lastSeen: new Date(),
                            ipAddress: ipAddress
                        }
                    });

                    // Log connection event
                    await prisma.connectionEvent.create({
                        data: {
                            machineId: machineId,
                            eventType: 'Connected'
                        }
                    });

                    // Check if machine is archived
                    if (machine.status === 'archived') {
                        console.log(`⚠ Archived machine connected: ${machine.displayName || machine.name} (${machineId})`);
                        socket.emit('machine:connected', { success: true });
                        socket.emit('machine:archived', {
                            machineId,
                            timestamp: new Date().toISOString()
                        });
                        return;
                    }

                    // Notify web clients
                    io.emit('machine:online', { machineId, timestamp: new Date().toISOString() });

                    // Broadcast updated machines list
                    await broadcastMachineList(io);

                    socket.emit('machine:connected', { success: true });
                } else {
                    socket.emit('machine:error', { error: 'Invalid credentials' });
                }
            } catch (error) {
                console.error('Connection error:', error);
                socket.emit('machine:error', { error: 'Connection failed' });
            }
        });



        // ... (imports remain)

        // Inside socketHandler
        // Heartbeat
        socket.on('machine:heartbeat', async (data: { machineId: string, state: StatePayload }) => {
            try {
                const { machineId, state } = data;

                if (!machineId) return;

                // Check if machine is archived
                const machine = await prisma.machine.findUnique({
                    where: { id: machineId },
                    select: { status: true }
                });

                if (machine?.status === 'archived') {
                    console.log(`⚠ Heartbeat rejected from archived machine: ${machineId}`);
                    return;
                }

                // Get existing state to preserve settings
                const existingState = await prisma.machineState.findUnique({
                    where: { machineId: machineId },
                    select: { settings: true }
                });

                const existingSettings = existingState?.settings || undefined;

                // Update machine state
                await prisma.machineState.upsert({
                    where: { machineId: machineId },
                    create: {
                        machineId,
                        lastActivityTime: state.lastActivityTime ? new Date(state.lastActivityTime) : new Date(),
                        activeWindow: state.activeWindow,
                        screenshotCount: state.screenshotCount || 0,
                        uploadCount: state.uploadCount || 0,
                        healthStatus: JSON.stringify(state.health),
                        settings: existingSettings,
                        updatedAt: new Date()
                    },
                    update: {
                        lastActivityTime: state.lastActivityTime ? new Date(state.lastActivityTime) : new Date(),
                        activeWindow: state.activeWindow,
                        screenshotCount: state.screenshotCount || 0,
                        uploadCount: state.uploadCount || 0,
                        healthStatus: JSON.stringify(state.health),
                        updatedAt: new Date()
                        // settings: not updated here to preserve it
                    }
                });

                // Update last seen on Machine model too
                await prisma.machine.update({
                    where: { id: machineId },
                    data: { lastSeen: new Date() }
                });

                // Broadcast to web clients
                io.emit('machine:state', {
                    machineId,
                    state: {
                        ...state,
                        version: state.version || null
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        });

        // Activity update
        socket.on('machine:activity', async (data: { machineId: string, activity: ActivityPayload }) => {
            try {
                const { machineId, activity } = data;

                if (!machineId) return;

                const machine = await prisma.machine.findUnique({
                    where: { id: machineId },
                    select: { status: true }
                });

                if (machine?.status === 'archived') {
                    return;
                }

                // Extract fields (Strictly typed now)
                const { timestamp, activeWindow, processName, duration, username } = activity;

                // 1. Store raw heartbeat
                await prisma.activityHistory.create({
                    data: {
                        machineId,
                        timestamp: new Date(timestamp),
                        activeWindow: activeWindow,
                        processName: processName,
                        duration: duration,
                        username: username || null
                    }
                });

                // 2. Aggregate into Sessions
                const pingIntervalSeconds = 30; // Default or fetch from settings if needed

                // Get most recent session for this machine
                const recentSession = await prisma.activitySession.findFirst({
                    where: { machineId: machineId },
                    orderBy: { endTime: 'desc' }
                });

                // Handle timestamp format (C# sends ISO string)
                const activityTime = new Date(timestamp);
                const timeSeconds = Math.floor(activityTime.getTime() / 1000);

                // Determine if we should extend existing session or create new one
                const shouldExtend = recentSession &&
                    recentSession.processName === processName &&
                    recentSession.activeWindow === activeWindow &&
                    (timeSeconds - recentSession.endTime) <= (pingIntervalSeconds * 2);

                if (shouldExtend) {
                    // Extend existing session
                    const newEndTime = timeSeconds;
                    const newDuration = newEndTime - recentSession.startTime;
                    const newHeartbeatCount = recentSession.heartbeatCount + 1;

                    await prisma.activitySession.update({
                        where: { id: recentSession.id },
                        data: {
                            endTime: newEndTime,
                            durationSeconds: newDuration,
                            heartbeatCount: newHeartbeatCount,
                            updatedAt: new Date()
                        }
                    });
                } else {
                    // Create new session
                    await prisma.activitySession.create({
                        data: {
                            machineId: machineId,
                            startTime: timeSeconds,
                            endTime: timeSeconds,
                            durationSeconds: 0,
                            processName: processName,
                            activeWindow: activeWindow,
                            username: username || null,
                            heartbeatCount: 1
                        }
                    });
                }

                // Broadcast to web clients watching this machine
                io.to(`machine:${machineId}`).emit('activity:update', {
                    timestamp,
                    activeWindow,
                    processName,
                    duration,
                    username
                });
            } catch (error) {
                console.error('Activity error:', error);
            }
        });

        // Audit event
        socket.on('machine:audit', async (data: { machineId: string, auditEvent: AuditEventPayload }) => {
            try {
                const { machineId, auditEvent } = data;

                if (!machineId || !auditEvent) return;

                const machine = await prisma.machine.findUnique({ where: { id: machineId } });
                if (machine?.status === 'archived') return;

                const { eventId, eventType, username, timestamp, details, sourceLogName, isFlagged } = auditEvent;

                // Deduplicate based on eventId
                const existingEvent = await prisma.auditEvent.findFirst({
                    where: {
                        machineId,
                        eventId: eventId
                    }
                });

                if (existingEvent) {
                    return;
                }

                await prisma.auditEvent.create({
                    data: {
                        machineId,
                        eventId: eventId,
                        eventType: eventType,
                        username: username,
                        timestamp: new Date(timestamp),
                        details: typeof details === 'string' ? details : JSON.stringify(details),
                        sourceLogName: sourceLogName,
                        isFlagged: !!isFlagged
                    }
                });

                // Normalized event is now the payload itself (plus potentially parsed details if complex)
                io.to(`machine:${machineId}`).emit('audit:alert', auditEvent);
                io.emit('audit:global', { machineId, auditEvent, timestamp: new Date().toISOString() });
            } catch (error) {
                console.error('Audit event processing error:', error);
            }
        });

        // Screenshot notification
        socket.on('machine:screenshot', async (data: { machineId: string, screenshot: ScreenshotPayload }) => {
            try {
                const { machineId, screenshot } = data;

                if (!machineId) return;

                const machine = await prisma.machine.findUnique({ where: { id: machineId } });
                if (machine?.status === 'archived') return;

                const { id, captureTime, triggerType, googleDriveFileId, isUploaded } = screenshot;

                await prisma.screenshot.create({
                    data: {
                        id: id,
                        machineId,
                        captureTime: new Date(captureTime),
                        triggerType: triggerType,
                        googleDriveFileId: googleDriveFileId,
                        isUploaded: !!isUploaded
                    }
                });

                io.to(`machine:${machineId}`).emit('screenshot:new', screenshot);
            } catch (error) {
                console.error('Screenshot error:', error);
            }
        });

        // Disconnect
        socket.on('disconnect', async () => {
            if (socket.machineId) {
                try {
                    await prisma.connectionEvent.create({
                        data: {
                            machineId: socket.machineId,
                            eventType: 'Disconnected'
                        }
                    });

                    io.emit('machine:offline', { machineId: socket.machineId, timestamp: new Date().toISOString() });

                    await broadcastMachineList(io);
                } catch (error) {
                    console.error('Disconnect error:', error);
                }
            }
        });
    });
};
