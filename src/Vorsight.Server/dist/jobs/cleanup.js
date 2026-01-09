"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performCleanup = performCleanup;
exports.scheduleCleanup = scheduleCleanup;
const database_1 = require("../db/database");
const node_schedule_1 = __importDefault(require("node-schedule"));
async function performCleanup() {
    console.log('[Cleanup] Starting automatic data cleanup...');
    const settings = await database_1.prisma.cleanupSettings.findUnique({
        where: { id: 1 }
    });
    if (!settings) {
        console.log('[Cleanup] No settings found, skipping');
        return { activityDeleted: 0, screenshotsDeleted: 0, auditsDeleted: 0 };
    }
    const stats = {
        activityDeleted: 0,
        screenshotsDeleted: 0,
        auditsDeleted: 0
    };
    const now = new Date();
    // Clean up activity history
    if (settings.activityRetentionDays > 0) {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - settings.activityRetentionDays);
        const result = await database_1.prisma.activityHistory.deleteMany({
            where: {
                timestamp: {
                    lt: cutoffDate
                }
            }
        });
        stats.activityDeleted = result.count;
        console.log(`[Cleanup] Deleted ${result.count} activity records (older than ${settings.activityRetentionDays} days)`);
    }
    // Clean up screenshots
    if (settings.screenshotRetentionDays > 0) {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - settings.screenshotRetentionDays);
        // Get screenshots to delete first (for potential Drive deletion)
        const screenshots = await database_1.prisma.screenshot.findMany({
            where: {
                captureTime: {
                    lt: cutoffDate
                }
            },
            select: {
                id: true,
                googleDriveFileId: true
            }
        });
        // Optionally delete from Google Drive
        if (settings.deleteDriveFiles && screenshots.length > 0) {
            console.log(`[Cleanup] Deleting ${screenshots.length} files from Google Drive...`);
            // TODO: Implement Google Drive deletion when Drive service is available
            /*
            import googleDriveService from '../services/googleDriveService';
            for (const screenshot of screenshots) {
                if (screenshot.googleDriveFileId) {
                    try {
                        await googleDriveService.deleteFile(screenshot.googleDriveFileId);
                    } catch (error) {
                        console.error(`Failed to delete Drive file ${screenshot.googleDriveFileId}:`, error);
                    }
                }
            }
            */
        }
        // Delete screenshot metadata
        const result = await database_1.prisma.screenshot.deleteMany({
            where: {
                captureTime: {
                    lt: cutoffDate
                }
            }
        });
        stats.screenshotsDeleted = result.count;
        console.log(`[Cleanup] Deleted ${result.count} screenshot records (older than ${settings.screenshotRetentionDays} days)`);
    }
    // Clean up acknowledged audit events only
    if (settings.auditRetentionDays > 0) {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - settings.auditRetentionDays);
        const result = await database_1.prisma.auditEvent.deleteMany({
            where: {
                acknowledged: true,
                timestamp: {
                    lt: cutoffDate
                }
            }
        });
        stats.auditsDeleted = result.count;
        console.log(`[Cleanup] Deleted ${result.count} acknowledged audit events (older than ${settings.auditRetentionDays} days)`);
    }
    // Update last cleanup run
    await database_1.prisma.cleanupSettings.update({
        where: { id: 1 },
        data: {
            lastCleanupRun: new Date()
        }
    });
    console.log('[Cleanup] Completed successfully', stats);
    return stats;
}
// Schedule cleanup to run daily at 2 AM
function scheduleCleanup() {
    // Run at 2:00 AM every day
    node_schedule_1.default.scheduleJob('0 2 * * *', async () => {
        try {
            await performCleanup();
        }
        catch (error) {
            console.error('[Cleanup] Scheduled cleanup error:', error);
        }
    });
    console.log('[Cleanup] Job scheduled for 2:00 AM daily');
}
//# sourceMappingURL=cleanup.js.map