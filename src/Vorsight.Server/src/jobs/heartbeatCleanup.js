const db = require('../db/database');

/**
 * Cleanup old heartbeat snapshots (keep only last 48 hours)
 */
function cleanupHeartbeats() {
    try {
        const twoDaysAgo = Math.floor(Date.now() / 1000) - (48 * 60 * 60);

        const result = db.prepare(`
            DELETE FROM activity_history 
            WHERE timestamp < ?
        `).run(twoDaysAgo);

        if (result.changes > 0) {
            console.log(`🧹 Cleaned up ${result.changes} old activity heartbeats`);
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
