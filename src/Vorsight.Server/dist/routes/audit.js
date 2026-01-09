"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const router = express_1.default.Router();
// Get recent audit events (with optional filtering)
router.get('/', async (req, res) => {
    try {
        const { machineId, limit = '50', offset = '0', flaggedOnly } = req.query;
        const where = {};
        if (machineId)
            where.machineId = machineId;
        if (flaggedOnly === 'true')
            where.isFlagged = true;
        const events = await database_1.prisma.auditEvent.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        // Parse details if JSON string
        const formatted = events.map(e => ({
            ...e,
            details: typeof e.details === 'string' ? JSON.parse(e.details) : e.details
        }));
        return res.json(formatted);
    }
    catch (error) {
        console.error('Get audit events error:', error);
        return res.status(500).json({ error: 'Failed to fetch audit events' });
    }
});
// Acknowledge/Dismiss an event (e.g. unflag it)
router.patch('/:id/acknowledge', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.prisma.auditEvent.update({
            where: { id: parseInt(id) },
            data: { isFlagged: false }
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Acknowledge audit event error:', error);
        return res.status(500).json({ error: 'Failed to acknowledge event' });
    }
});
// Add manual audit event (system generated)
router.post('/', async (req, res) => {
    try {
        const { machineId, eventType, details, isFlagged } = req.body;
        const event = await database_1.prisma.auditEvent.create({
            data: {
                machineId,
                eventId: crypto.randomUUID(), // System generated ID
                eventType,
                timestamp: new Date(),
                details: JSON.stringify(details || {}),
                isFlagged: !!isFlagged,
                username: 'SYSTEM',
                sourceLogName: 'Manual'
            }
        });
        return res.json(event);
    }
    catch (error) {
        console.error('Add audit event error:', error);
        return res.status(500).json({ error: 'Failed to add audit event' });
    }
});
exports.default = router;
//# sourceMappingURL=audit.js.map