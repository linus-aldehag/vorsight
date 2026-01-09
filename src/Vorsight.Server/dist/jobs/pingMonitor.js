"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOfflineMachines = checkOfflineMachines;
exports.schedulePingMonitor = schedulePingMonitor;
const database_1 = require("../db/database");
const ping_1 = __importDefault(require("ping"));
const node_schedule_1 = __importDefault(require("node-schedule"));
async function checkOfflineMachines() {
    try {
        // Get machines that haven't connected in the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const offlineMachines = await database_1.prisma.machine.findMany({
            where: {
                OR: [
                    { lastSeen: null },
                    { lastSeen: { lt: twoMinutesAgo } }
                ]
            },
            select: {
                id: true,
                name: true,
                ipAddress: true,
                hostname: true,
                lastSeen: true
            }
        });
        if (offlineMachines.length === 0) {
            return; // Silent when all machines connected
        }
        for (const machine of offlineMachines) {
            const target = machine.ipAddress || machine.hostname;
            if (!target) {
                continue;
            }
            try {
                const result = await ping_1.default.promise.probe(target, {
                    timeout: 3,
                    extra: ['-n', '1']
                });
                // Get previous state to preserve existing settings
                const prevState = await database_1.prisma.machineState.findUnique({
                    where: { machineId: machine.id },
                    select: { healthStatus: true, settings: true }
                });
                // Store ping result in machine_state with timestamp
                const pingStatus = result.alive ? 'reachable' : 'unreachable';
                const pingTime = result.alive ? result.time : null; // ping.promise returns number for time
                const now = new Date().toISOString();
                // Get existing settings and merge with ping data (preserve user settings!)
                const existingSettings = prevState?.settings
                    ? JSON.parse(prevState.settings)
                    : {};
                const mergedSettings = {
                    ...existingSettings, // Preserve screenshot/activity settings
                    lastPingTime: now,
                    lastPingSuccess: result.alive ? now : existingSettings['lastPingSuccess'], // Access dynamic props
                    pingLatency: pingTime
                };
                // Update or insert machine_state using upsert
                await database_1.prisma.machineState.upsert({
                    where: { machineId: machine.id },
                    create: {
                        machineId: machine.id,
                        healthStatus: pingStatus,
                        settings: JSON.stringify(mergedSettings),
                        updatedAt: new Date()
                    },
                    update: {
                        healthStatus: pingStatus,
                        settings: JSON.stringify(mergedSettings),
                        updatedAt: new Date()
                    }
                });
            }
            catch (error) {
                console.error(`[Ping Monitor] Error checking ${machine.name}:`, error.message);
            }
        }
    }
    catch (error) {
        console.error('[Ping Monitor] Error:', error);
    }
}
// Schedule ping checks every 5 minutes
function schedulePingMonitor() {
    // Run every 5 minutes
    node_schedule_1.default.scheduleJob('*/5 * * * *', async () => {
        try {
            await checkOfflineMachines();
        }
        catch (error) {
            console.error('[Ping Monitor] Scheduled check error:', error);
        }
    });
    console.log('[Ping Monitor] Scheduled to run every 5 minutes');
    // Run immediately on startup
    setTimeout(() => checkOfflineMachines(), 10000); // Wait 10s after startup
}
//# sourceMappingURL=pingMonitor.js.map