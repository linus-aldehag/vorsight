const db = require('../db/database');

async function performCleanup() {
    console.log('[Cleanup] Starting automatic data cleanup...');

    const settings = db.prepare('SELECT * FROM cleanup_settings WHERE id = 1').get();
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
    if (settings.activity_retention_days > 0) {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - settings.activity_retention_days);

        const result = db.prepare(`
            DELETE FROM activity_history 
            WHERE timestamp < ?
        `).run(cutoffDate.toISOString());

        stats.activityDeleted = result.changes;
        console.log(`[Cleanup] Deleted ${result.changes} activity records (older than ${settings.activity_retention_days} days)`);
    }

    // Clean up screenshots
    if (settings.screenshot_retention_days > 0) {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - settings.screenshot_retention_days);

        // Get screenshots to delete
        const screenshots = db.prepare(`
            SELECT id, google_drive_file_id 
            FROM screenshots 
            WHERE capture_time < ?
        `).all(cutoffDate.toISOString());

        // Optionally delete from Google Drive
        if (settings.delete_drive_files && screenshots.length > 0) {
            console.log(`[Cleanup] Deleting ${screenshots.length} files from Google Drive...`);
            // TODO: Implement Google Drive deletion when Drive service is available
            // const { deleteFromDrive } = require('../services/drive');
            // for (const screenshot of screenshots) {
            //     if (screenshot.google_drive_file_id) {
            //         try {
            //             await deleteFromDrive(screenshot.google_drive_file_id);
            //         } catch (error) {
            //             console.error(`Failed to delete Drive file ${screenshot.google_drive_file_id}:`, error);
            //         }
            //     }
            // }
        }

        // Delete screenshot metadata
        const result = db.prepare(`
            DELETE FROM screenshots 
            WHERE capture_time < ?
        `).run(cutoffDate.toISOString());

        stats.screenshotsDeleted = result.changes;
        console.log(`[Cleanup] Deleted ${result.changes} screenshot records (older than ${settings.screenshot_retention_days} days)`);
    }

    // Clean up acknowledged audit events only
    if (settings.audit_retention_days > 0) {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - settings.audit_retention_days);

        const result = db.prepare(`
            DELETE FROM audit_events 
            WHERE acknowledged = 1 AND timestamp < ?
        `).run(cutoffDate.toISOString());

        stats.auditsDeleted = result.changes;
        console.log(`[Cleanup] Deleted ${result.changes} acknowledged audit events (older than ${settings.audit_retention_days} days)`);
    }

    // Update last cleanup run
    db.prepare('UPDATE cleanup_settings SET last_cleanup_run = CURRENT_TIMESTAMP WHERE id = 1').run();

    console.log('[Cleanup] Completed successfully', stats);
    return stats;
}

// Schedule cleanup to run daily at 2 AM
function scheduleCleanup() {
    const schedule = require('node-schedule');

    // Run at 2:00 AM every day
    schedule.scheduleJob('0 2 * * *', async () => {
        try {
            await performCleanup();
        } catch (error) {
            console.error('[Cleanup] Scheduled cleanup error:', error);
        }
    });

    console.log('[Cleanup] Job scheduled for 2:00 AM daily');
}

module.exports = { performCleanup, scheduleCleanup };
