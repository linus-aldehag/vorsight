const db = require('../db/database');
const ping = require('ping');

async function checkOfflineMachines() {
    console.log('[Ping Monitor] Checking offline machines...');

    try {
        // Get machines that haven't connected in the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const offlineMachines = db.prepare(`
            SELECT id, name, ip_address, hostname, last_seen
            FROM machines
            WHERE last_seen IS NULL OR last_seen < ?
        `).all(twoMinutesAgo);

        if (offlineMachines.length === 0) {
            console.log('[Ping Monitor] All machines connected');
            return;
        }

        console.log(`[Ping Monitor] Checking ${offlineMachines.length} offline machines`);

        for (const machine of offlineMachines) {
            const target = machine.ip_address || machine.hostname;

            if (!target) {
                continue;
            }

            try {
                const result = await ping.promise.probe(target, {
                    timeout: 3,
                    extra: ['-n', '1']
                });

                // Store ping result in machine_state with timestamp
                const pingStatus = result.alive ? 'reachable' : 'unreachable';
                const pingTime = result.alive ? result.time : null;
                const now = new Date().toISOString();

                // Calculate settings JSON
                const settings = {
                    lastPingTime: now,
                    lastPingSuccess: result.alive ? now : null,
                    pingLatency: pingTime
                };

                // Update or insert machine_state
                db.prepare(`
                    INSERT INTO machine_state (machine_id, health_status, settings, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(machine_id) DO UPDATE SET 
                        health_status = ?,
                        settings = ?,
                        updated_at = CURRENT_TIMESTAMP
                `).run(machine.id, pingStatus, JSON.stringify(settings), pingStatus, JSON.stringify(settings));

                if (result.alive) {
                    console.log(`[Ping Monitor] ${machine.name}: Reachable (${pingTime}ms) but service offline`);
                } else {
                    console.log(`[Ping Monitor] ${machine.name}: Unreachable`);
                }

            } catch (error) {
                console.error(`[Ping Monitor] Error checking ${machine.name}:`, error.message);
            }
        }

    } catch (error) {
        console.error('[Ping Monitor] Error:', error);
    }
}

// Schedule ping checks every 5 minutes
function schedulePingMonitor() {
    const schedule = require('node-schedule');

    // Run every 5 minutes
    schedule.scheduleJob('*/5 * * * *', async () => {
        try {
            await checkOfflineMachines();
        } catch (error) {
            console.error('[Ping Monitor] Scheduled check error:', error);
        }
    });

    console.log('[Ping Monitor] Scheduled to run every 5 minutes');

    // Run immediately on startup
    setTimeout(() => checkOfflineMachines(), 10000); // Wait 10s after startup
}

module.exports = { checkOfflineMachines, schedulePingMonitor };
