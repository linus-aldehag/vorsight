"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ping_1 = __importDefault(require("ping"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Ping a specific machine by ID
router.post('/:machineId', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const { machineId } = req.params;
        // Get machine IP address
        const machine = await database_1.prisma.machine.findUnique({
            where: { id: machineId },
            select: { id: true, name: true, ipAddress: true, hostname: true }
        });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        // Try IP first, fallback to hostname
        const target = machine.ipAddress || machine.hostname;
        if (!target) {
            return res.status(400).json({
                error: 'No IP address or hostname available for this machine',
                alive: false
            });
        }
        // Perform ping (timeout: 5 seconds)
        const result = await ping_1.default.promise.probe(target, {
            timeout: 5,
            extra: ['-n', '1'] // Windows: send 1 packet
        });
        return res.json({
            machineId: machine.id,
            machineName: machine.name,
            target,
            alive: result.alive,
            time: result.time,
            numeric_host: result.numeric_host
        });
    }
    catch (error) {
        console.error('Ping error:', error);
        return res.status(500).json({ error: 'Ping failed', alive: false });
    }
});
// Ping all machines
router.post('/', auth_1.authenticateBrowser, async (_req, res) => {
    try {
        const machines = await database_1.prisma.machine.findMany({
            select: { id: true, name: true, ipAddress: true, hostname: true }
        });
        const results = await Promise.all(machines.map(async (machine) => {
            const target = machine.ipAddress || machine.hostname;
            if (!target) {
                return {
                    machineId: machine.id,
                    machineName: machine.name,
                    alive: false,
                    error: 'No target address'
                };
            }
            try {
                const result = await ping_1.default.promise.probe(target, {
                    timeout: 5,
                    extra: ['-n', '1']
                });
                return {
                    machineId: machine.id,
                    machineName: machine.name,
                    target,
                    alive: result.alive,
                    time: result.time
                };
            }
            catch (error) {
                return {
                    machineId: machine.id,
                    machineName: machine.name,
                    target,
                    alive: false,
                    error: error.message
                };
            }
        }));
        return res.json({ results });
    }
    catch (error) {
        console.error('Ping all error:', error);
        return res.status(500).json({ error: 'Ping all failed' });
    }
});
exports.default = router;
//# sourceMappingURL=ping.js.map