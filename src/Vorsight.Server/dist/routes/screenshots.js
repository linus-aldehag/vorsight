"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get screenshots with pagination and filtering
router.get('/', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const { machineId, limit = '20', cursor } = req.query;
        const where = {};
        if (machineId)
            where.machineId = machineId;
        const take = parseInt(limit);
        const queryOptions = {
            where,
            orderBy: [
                { captureTime: 'desc' },
                { id: 'asc' } // Secondary sort for stable cursor pagination
            ],
            take: take + 1 // Take one extra to determine next cursor
        };
        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1; // Skip the cursor itself
        }
        const screenshots = await database_1.prisma.screenshot.findMany(queryOptions);
        let nextCursor = undefined;
        if (screenshots.length > take) {
            const nextItem = screenshots.pop(); // Remove the extra item
            nextCursor = nextItem?.id;
        }
        return res.json({
            items: screenshots,
            nextCursor
        });
    }
    catch (error) {
        console.error('Get screenshots error:', error);
        return res.status(500).json({ error: 'Failed to fetch screenshots' });
    }
});
// Get single screenshot details
// Note: Actual image is served via /api/media/view/:id which redirects to Drive
router.get('/:id', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const { id } = req.params;
        const screenshot = await database_1.prisma.screenshot.findUnique({
            where: { id: id }
        });
        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }
        return res.json(screenshot);
    }
    catch (error) {
        console.error('Get screenshot error:', error);
        return res.status(500).json({ error: 'Failed to fetch screenshot' });
    }
});
exports.default = router;
//# sourceMappingURL=screenshots.js.map