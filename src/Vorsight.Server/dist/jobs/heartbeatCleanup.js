"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupHeartbeats = cleanupHeartbeats;
exports.scheduleHeartbeatCleanup = scheduleHeartbeatCleanup;
const database_1 = require("../db/database");
/**
 * Cleanup old heartbeat snapshots based on configured retention period
 */
async function cleanupHeartbeats() {
    try {
        // Get retention setting (default to 48 hours if not configured)
        const settings = await database_1.prisma.cleanupSettings.findUnique({
            where: { id: 1 },
            select: { heartbeatRetentionHours: true }
        });
        const retentionHours = settings?.heartbeatRetentionHours || 48;
        const cutoffDate = new Date(Date.now() - (retentionHours * 60 * 60 * 1000));
        const result = await database_1.prisma.activityHistory.deleteMany({
            where: {
                timestamp: {
                    lt: cutoffDate
                }
            }
        });
        if (result.count > 0) {
            console.log(`🧹 Cleaned up ${result.count} activity heartbeats older than ${retentionHours}h`);
        }
    }
    catch (error) {
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
//# sourceMappingURL=heartbeatCleanup.js.map