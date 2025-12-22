const db = require('../db/database');

// Helper to calculate connection status
function getConnectionStatus(lastSeen) {
    if (!lastSeen) return { isOnline: false, connectionStatus: 'offline' };

    const timeSinceLastSeen = Date.now() - new Date(lastSeen + 'Z').getTime();

    if (timeSinceLastSeen < 30000) {
        // Within 1 ping interval - fully online
        return { isOnline: true, connectionStatus: 'online' };
    } else if (timeSinceLastSeen < 90000) {
        // Missed 1-2 pings - unstable
        return { isOnline: true, connectionStatus: 'unstable' };
    } else {
        // Missed 3+ pings - offline
        return { isOnline: false, connectionStatus: 'offline' };
    }
}

module.exports = (io) => {
    io.on('connection', (socket) => {

        // Web client connects - send current machines list
        socket.on('web:subscribe', () => {
            try {
                const machines = db.prepare(`
                    SELECT id, name, hostname, last_seen
                    FROM machines
                    ORDER BY name ASC
                `).all().map(m => {
                    const status = getConnectionStatus(m.last_seen);
                    return {
                        id: m.id,
                        name: m.name,
                        hostname: m.hostname,
                        ...status,
                        lastSeen: m.last_seen
                    };
                });

                socket.emit('machines:list', machines);
            } catch (error) {
                console.error('Error sending machines list:', error);
            }
        });

        // Machine connects
        socket.on('machine:connect', (data) => {
            try {
                const { machineId, apiKey } = data;

                // Verify API key
                const machine = db.prepare('SELECT * FROM machines WHERE id = ? AND api_key = ?')
                    .get(machineId, apiKey);

                if (machine) {
                    socket.machineId = machineId;
                    socket.join(`machine:${machineId}`);

                    // Update last seen (is_online calculated from this)
                    db.prepare('UPDATE machines SET last_seen = CURRENT_TIMESTAMP WHERE id = ?')
                        .run(machineId);

                    // Log connection event
                    db.prepare('INSERT INTO connection_events (machine_id, event_type) VALUES (?, ?)')
                        .run(machineId, 'Connected');

                    // Notify web clients
                    io.emit('machine:online', { machineId, timestamp: new Date().toISOString() });

                    // Broadcast updated machines list to all web clients
                    const machines = db.prepare(`
                        SELECT id, name, hostname, last_seen
                        FROM machines
                        ORDER BY name ASC
                    `).all().map(m => {
                        const status = getConnectionStatus(m.last_seen);
                        return {
                            id: m.id,
                            name: m.name,
                            hostname: m.hostname,
                            ...status,
                            lastSeen: m.last_seen
                        };
                    });
                    io.emit('machines:list', machines);

                    socket.emit('machine:connected', { success: true });
                } else {
                    socket.emit('machine:error', { error: 'Invalid credentials' });
                }
            } catch (error) {
                console.error('Connection error:', error);
                socket.emit('machine:error', { error: 'Connection failed' });
            }
        });

        // Heartbeat
        socket.on('machine:heartbeat', (data) => {
            try {
                const { machineId, state } = data;

                // Update machine state
                db.prepare(`
          INSERT OR REPLACE INTO machine_state 
          (machine_id, last_activity_time, active_window, screenshot_count, upload_count, health_status, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
                    machineId,
                    state.lastActivityTime,
                    state.activeWindow,
                    state.screenshotCount,
                    state.uploadCount,
                    JSON.stringify(state.health)
                );

                // Update last seen
                db.prepare('UPDATE machines SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(machineId);

                // Broadcast to web clients
                io.emit('machine:state', { machineId, state, timestamp: new Date().toISOString() });
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        });

        // Activity update
        socket.on('machine:activity', (data) => {
            try {
                const { machineId, activity } = data;

                // Store activity
                db.prepare(`
          INSERT INTO activity_history (machine_id, timestamp, active_window, process_name, duration, username)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
                    machineId,
                    activity.timestamp,
                    activity.activeWindow,
                    activity.processName,
                    activity.duration,
                    activity.username || null
                );

                // Broadcast to web clients watching this machine
                io.to(`machine:${machineId}`).emit('activity:update', activity);
            } catch (error) {
                console.error('Activity error:', error);
            }
        });

        // Audit event
        socket.on('machine:audit', (data) => {
            try {
                const { machineId, auditEvent } = data;

                if (!machineId || !auditEvent) {
                    console.error('Audit event missing machineId or auditEvent');
                    return;
                }

                // Store audit event
                db.prepare(`
          INSERT INTO audit_events (machine_id, event_id, event_type, username, timestamp, details, source_log_name, is_flagged)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
                    machineId,
                    auditEvent.eventId,
                    auditEvent.eventType,
                    auditEvent.username,
                    auditEvent.timestamp,
                    auditEvent.details,
                    auditEvent.sourceLogName,
                    auditEvent.isFlagged ? 1 : 0
                );

                // Broadcast to web clients
                io.to(`machine:${machineId}`).emit('audit:alert', auditEvent);
                io.emit('audit:global', { machineId, auditEvent, timestamp: new Date().toISOString() });
            } catch (error) {
                console.error('Audit event processing error:', error);
            }
        });

        // Screenshot notification
        socket.on('machine:screenshot', (data) => {
            try {
                const { machineId, screenshot } = data;

                // Store screenshot metadata
                db.prepare(`
          INSERT INTO screenshots (id, machine_id, capture_time, trigger_type, google_drive_file_id, is_uploaded)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
                    screenshot.id,
                    machineId,
                    screenshot.captureTime,
                    screenshot.triggerType,
                    screenshot.googleDriveFileId,
                    screenshot.isUploaded ? 1 : 0
                );

                // Broadcast to web clients
                io.to(`machine:${machineId}`).emit('screenshot:new', screenshot);
            } catch (error) {
                console.error('Screenshot error:', error);
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (socket.machineId) {
                try {
                    db.prepare('INSERT INTO connection_events (machine_id, event_type) VALUES (?, ?)')
                        .run(socket.machineId, 'Disconnected');

                    io.emit('machine:offline', { machineId: socket.machineId, timestamp: new Date().toISOString() });

                    // Broadcast updated machines list to all web clients
                    const machines = db.prepare(`
                        SELECT id, name, hostname, last_seen
                        FROM machines
                        ORDER BY name ASC
                    `).all().map(m => {
                        const status = getConnectionStatus(m.last_seen);
                        return {
                            id: m.id,
                            name: m.name,
                            hostname: m.hostname,
                            ...status,
                            lastSeen: m.last_seen
                        };
                    });
                    io.emit('machines:list', machines);
                } catch (error) {
                    console.error('Disconnect error:', error);
                }
            }
        });
    });
};
