"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../db/database");
const statusHelper_1 = require("../utils/statusHelper");
// Helper: Broadcast updated machine list to all web clients
async function broadcastMachineList(io) {
    try {
        const machines = await database_1.prisma.machine.findMany({
            include: { state: true },
            orderBy: { name: 'asc' }
        });
        const machinesList = machines.map(m => {
            // Parse settings to get pingIntervalSeconds
            let pingIntervalSeconds = 30; // default
            try {
                if (m.state?.settings) {
                    const settings = JSON.parse(m.state.settings);
                    pingIntervalSeconds = settings.pingIntervalSeconds || 30;
                }
            }
            catch (e) {
                // Use default
            }
            const status = (0, statusHelper_1.getConnectionStatus)(m.lastSeen, pingIntervalSeconds);
            let pingReachable = false;
            if (m.state?.healthStatus) {
                try {
                    const health = JSON.parse(m.state.healthStatus);
                    if (health.status === 'reachable' || health === 'reachable')
                        pingReachable = true;
                }
                catch (e) {
                    if (m.state.healthStatus === 'reachable')
                        pingReachable = true;
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
            machineObj.statusText = (0, statusHelper_1.getStatusText)(machineObj);
            return machineObj;
        });
        io.emit('machines:list', machinesList);
    }
    catch (error) {
        console.error('Error broadcasting machines list:', error);
    }
}
// Internal helper reused for single socket
async function broadcastToSocket(socket) {
    try {
        const machines = await database_1.prisma.machine.findMany({
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
            }
            catch (e) { }
            const status = (0, statusHelper_1.getConnectionStatus)(m.lastSeen, pingIntervalSeconds);
            let pingReachable = false;
            if (m.state?.healthStatus) {
                try {
                    const health = JSON.parse(m.state.healthStatus);
                    if (health.status === 'reachable' || health === 'reachable')
                        pingReachable = true;
                }
                catch (e) {
                    if (m.state.healthStatus === 'reachable')
                        pingReachable = true;
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
            machineObj.statusText = (0, statusHelper_1.getStatusText)(machineObj);
            return machineObj;
        });
        socket.emit('machines:list', machinesList);
    }
    catch (error) {
        console.error('Error sending machines list:', error);
    }
}
exports.default = (io) => {
    io.on('connection', (socket) => {
        // Web client connects - send current machines list
        socket.on('web:subscribe', async () => {
            // Removed unused 'ip' variable
            try {
                await broadcastToSocket(socket);
            }
            catch (error) {
                console.error('Error sending machines list:', error);
            }
        });
        // Machine connects
        socket.on('machine:connect', async (data) => {
            try {
                const { machineId, apiKey } = data;
                // Extract IP address from socket connection
                const ipAddress = (socket.handshake.address ||
                    socket.conn.remoteAddress ||
                    socket.request?.connection.remoteAddress ||
                    'unknown');
                // Verify API key
                const machine = await database_1.prisma.machine.findFirst({
                    where: { id: machineId, apiKey: apiKey }
                });
                if (machine) {
                    socket.machineId = machineId;
                    socket.join(`machine:${machineId}`);
                    // Update last seen AND IP address
                    await database_1.prisma.machine.update({
                        where: { id: machineId },
                        data: {
                            lastSeen: new Date(),
                            ipAddress: ipAddress
                        }
                    });
                    // Log connection event
                    await database_1.prisma.connectionEvent.create({
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
                }
                else {
                    socket.emit('machine:error', { error: 'Invalid credentials' });
                }
            }
            catch (error) {
                console.error('Connection error:', error);
                socket.emit('machine:error', { error: 'Connection failed' });
            }
        });
        // Heartbeat
        socket.on('machine:heartbeat', async (data) => {
            try {
                const { machineId, state } = data;
                if (!machineId)
                    return;
                // Check if machine is archived
                const machine = await database_1.prisma.machine.findUnique({
                    where: { id: machineId },
                    select: { status: true }
                });
                if (machine?.status === 'archived') {
                    console.log(`⚠ Heartbeat rejected from archived machine: ${machineId}`);
                    return;
                }
                // Get existing state to preserve settings
                const existingState = await database_1.prisma.machineState.findUnique({
                    where: { machineId: machineId },
                    select: { settings: true }
                });
                const existingSettings = existingState?.settings || undefined;
                // Update machine state
                await database_1.prisma.machineState.upsert({
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
                await database_1.prisma.machine.update({
                    where: { id: machineId },
                    data: { lastSeen: new Date() }
                });
                // Broadcast to web clients
                io.emit('machine:state', {
                    machineId,
                    state: {
                        ...state,
                        version: state.version || data.version || null
                    },
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('Heartbeat error:', error);
            }
        });
        // Activity update
        socket.on('machine:activity', async (data) => {
            try {
                const { machineId, activity } = data;
                if (!machineId)
                    return;
                const machine = await database_1.prisma.machine.findUnique({
                    where: { id: machineId },
                    select: { status: true }
                });
                if (machine?.status === 'archived') {
                    return;
                }
                await database_1.prisma.activityHistory.create({
                    data: {
                        machineId,
                        timestamp: new Date(activity.timestamp),
                        activeWindow: activity.activeWindow,
                        processName: activity.processName,
                        duration: activity.duration, // Optional in schema? Schema says Int?
                        // Prisma schema: duration Int?
                        username: activity.username || null
                    }
                });
                // Broadcast to web clients watching this machine
                io.to(`machine:${machineId}`).emit('activity:update', activity);
            }
            catch (error) {
                console.error('Activity error:', error);
            }
        });
        // Audit event
        socket.on('machine:audit', async (data) => {
            try {
                const { machineId, auditEvent } = data;
                if (!machineId || !auditEvent)
                    return;
                const machine = await database_1.prisma.machine.findUnique({ where: { id: machineId } });
                if (machine?.status === 'archived')
                    return;
                await database_1.prisma.auditEvent.create({
                    data: {
                        machineId,
                        eventId: auditEvent.eventId,
                        eventType: auditEvent.eventType,
                        username: auditEvent.username,
                        timestamp: new Date(auditEvent.timestamp),
                        details: typeof auditEvent.details === 'string' ? auditEvent.details : JSON.stringify(auditEvent.details),
                        sourceLogName: auditEvent.sourceLogName,
                        isFlagged: !!auditEvent.isFlagged
                    }
                });
                io.to(`machine:${machineId}`).emit('audit:alert', auditEvent);
                io.emit('audit:global', { machineId, auditEvent, timestamp: new Date().toISOString() });
            }
            catch (error) {
                console.error('Audit event processing error:', error);
            }
        });
        // Screenshot notification
        socket.on('machine:screenshot', async (data) => {
            try {
                const { machineId, screenshot } = data;
                if (!machineId)
                    return;
                const machine = await database_1.prisma.machine.findUnique({ where: { id: machineId } });
                if (machine?.status === 'archived')
                    return;
                await database_1.prisma.screenshot.create({
                    data: {
                        id: screenshot.id,
                        machineId,
                        captureTime: new Date(screenshot.captureTime),
                        triggerType: screenshot.triggerType,
                        googleDriveFileId: screenshot.googleDriveFileId,
                        isUploaded: !!screenshot.isUploaded
                    }
                });
                io.to(`machine:${machineId}`).emit('screenshot:new', screenshot);
            }
            catch (error) {
                console.error('Screenshot error:', error);
            }
        });
        // Disconnect
        socket.on('disconnect', async () => {
            if (socket.machineId) {
                try {
                    await database_1.prisma.connectionEvent.create({
                        data: {
                            machineId: socket.machineId,
                            eventType: 'Disconnected'
                        }
                    });
                    io.emit('machine:offline', { machineId: socket.machineId, timestamp: new Date().toISOString() });
                    await broadcastMachineList(io);
                }
                catch (error) {
                    console.error('Disconnect error:', error);
                }
            }
        });
    });
};
//# sourceMappingURL=socketHandler.js.map