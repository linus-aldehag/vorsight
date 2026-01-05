const db = require('../db/database');

/**
 * Cleanup old heartbeat snapshots based on configured retention period
 */
function cleanupHeartbeats() {
    try {
        // Get retention setting (default to 48 hours if not configured)
        const settings = db.prepare('SELECT heartbeat_retention_hours FROM cleanup_settings WHERE id = 1').get();
        const retentionHours = settings?.heartbeat_retention_hours || 48;

        const cutoffTime = Math.floor(Date.now() / 1000) - (retentionHours * 60 * 60);

        const result = db.prepare(`
            DELETE FROM activity_history 
            WHERE timestamp < ?
        `).run(cutoffTime);

        if (result.changes > 0) {
            console.log(`🧹 Cleaned up ${result.changes} activity heartbeats older than ${retentionHours}h`);
        }
    } catch (error) {
        console.error('Failed to cleanup heartbeats:', error);
    }
}

/**
 * Schedule heartbeat cleanup to run every 6 hours
 */
function scheduleHeartbeatCleanup() {
    // Run immediately on startup
    cleanupHeartbeats();

    // Then run every 6 hours
    setInterval(cleanupHeartbeats, 6 * 60 * 60 * 1000);

    console.log('📅 Scheduled heartbeat cleanup (every 6 hours)');
}

module.exports = { cleanupHeartbeats, scheduleHeartbeatCleanup };
