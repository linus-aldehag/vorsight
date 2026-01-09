"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get activity summary (legacy endpoint - returns empty for now)
router.get('/summary', (_req, res) => {
    return res.json([]);
});
// Get activity sessions for a machine
router.get('/:machineId', async (req, res) => {
    try {
        const { limit = '100', offset = '0' } = req.query;
        const machineId = req.params.machineId;
        const sessions = await database_1.prisma.activitySession.findMany({
            where: { machineId: machineId },
            orderBy: { startTime: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        // Convert to frontend format (timestamp = start_time for compatibility)
        const formatted = sessions.map(s => ({
            id: s.id,
            machine_id: s.machineId,
            timestamp: s.startTime,
            active_window: s.activeWindow,
            process_name: s.processName,
            duration: s.durationSeconds,
            username: s.username
        }));
        return res.json(formatted);
    }
    catch (error) {
        console.error('Get activity error:', error);
        return res.status(500).json({ error: 'Failed to fetch activity' });
    }
});
// Add activity heartbeat (authenticated) - processes into sessions
router.post('/', auth_1.authenticateMachine, async (req, res) => {
    try {
        const { timestamp, activeWindow, processName, username, pingIntervalSeconds = 30 } = req.body;
        if (!req.machine) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const machineId = req.machine.id;
        const currentTime = Math.floor(Date.now() / 1000);
        const heartbeatTime = new Date((timestamp || currentTime) * 1000);
        // Store raw heartbeat for debugging (optional, short retention via jobs/heartbeatCleanup)
        await database_1.prisma.activityHistory.create({
            data: {
                machineId: machineId,
                timestamp: heartbeatTime,
                activeWindow: activeWindow,
                processName: processName,
                username: username
            }
        });
        // Get most recent session for this machine
        const recentSession = await database_1.prisma.activitySession.findFirst({
            where: { machineId: machineId },
            orderBy: { endTime: 'desc' }
        });
        const timeSeconds = timestamp || currentTime;
        // Determine if we should extend existing session or create new one
        const shouldExtend = recentSession &&
            recentSession.processName === processName &&
            recentSession.activeWindow === activeWindow &&
            (timeSeconds - recentSession.endTime) <= (pingIntervalSeconds * 2); // Allow 2x ping interval grace
        // Update sessions (aggregation)
        if (shouldExtend) {
            // Extend existing session
            const newEndTime = timeSeconds;
            const newDuration = newEndTime - recentSession.startTime;
            const newHeartbeatCount = recentSession.heartbeatCount + 1;
            await database_1.prisma.activitySession.update({
                where: { id: recentSession.id },
                data: {
                    endTime: newEndTime,
                    durationSeconds: newDuration,
                    heartbeatCount: newHeartbeatCount,
                    updatedAt: new Date()
                }
            });
            console.log(`Extended session ${recentSession.id} to ${newDuration}s (${newHeartbeatCount} heartbeats)`);
        }
        else {
            // Create new session
            const newSession = await database_1.prisma.activitySession.create({
                data: {
                    machineId: machineId,
                    startTime: timeSeconds,
                    endTime: timeSeconds,
                    durationSeconds: 0,
                    processName: processName,
                    activeWindow: activeWindow,
                    username: username,
                    heartbeatCount: 1
                }
            });
            console.log(`Created new session ${newSession.id} for ${processName}`);
        }
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Add activity error:', error);
        return res.status(500).json({ error: 'Failed to add activity' });
    }
});
exports.default = router;
//# sourceMappingURL=activity.js.map