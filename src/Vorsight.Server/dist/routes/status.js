"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const statusHelper_1 = require("../utils/statusHelper");
const router = express_1.default.Router();
// Get simple status text for a machine
router.get('/:machineId', async (req, res) => {
    try {
        const { machineId } = req.params;
        const machine = await database_1.prisma.machine.findUnique({
            where: { id: machineId },
            include: { state: true }
        });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        // Calculate status
        let pingIntervalSeconds = 30;
        try {
            if (machine.state?.settings) {
                const settings = JSON.parse(machine.state.settings);
                pingIntervalSeconds = settings.pingIntervalSeconds || 30;
            }
        }
        catch (e) { }
        const status = (0, statusHelper_1.getConnectionStatus)(machine.lastSeen, pingIntervalSeconds);
        // Prepare object for status text helper
        const machineData = {
            name: machine.name,
            displayName: machine.displayName,
            lastSeen: machine.lastSeen,
            settings: machine.state?.settings // string or object? Helper handles both?
            // Actually statusHelper expects it to be whatever it handles.
            // Let's pass the raw string if that's what we have, or parsed?
            // Checking statusHelper.ts usage in socketHandler: it passed parsed settings OR raw?
            // In socketHandler I passed `settings: m.settings` (string).
            // Let's pass query result.
        };
        // We need to inject connectionStatus into machineData for getStatusText?
        // getStatusText uses `machine.isOnline` and `machine.settings` (for monitoring check).
        const statusText = (0, statusHelper_1.getStatusText)({
            ...machineData,
            isOnline: status.isOnline
        });
        return res.json({
            status: status.connectionStatus,
            text: statusText,
            isOnline: status.isOnline,
            lastSeen: machine.lastSeen
        });
    }
    catch (error) {
        console.error('Status error:', error);
        return res.status(500).json({ error: 'Status check failed' });
    }
});
exports.default = router;
//# sourceMappingURL=status.js.map