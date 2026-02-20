import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
import { Prisma } from '@prisma/client';
import { IdParams, IdRequest, MachineParams, PaginationQuery, QueryRequest } from '../../types/routes';

const router = express.Router();

// Get screenshots with pagination and filtering
router.get('/', async (req: QueryRequest<PaginationQuery>, res: Response) => {
    try {
        const { machineId, limit = '20', cursor } = req.query;

        const where: Prisma.ScreenshotWhereInput = {};
        if (machineId) where.machineId = machineId;

        const take = parseInt(limit as string);

        const queryOptions: Prisma.ScreenshotFindManyArgs = {
            where,
            orderBy: [
                { captureTime: 'desc' },
                { id: 'asc' } // Secondary sort for stable cursor pagination
            ],
            take: take + 1 // Take one extra to determine next cursor
        };

        if (cursor && typeof cursor === 'string' && cursor.length > 0) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1; // Skip the cursor itself
        }

        console.log(`[Screenshots API] Machine: ${machineId}, Limit: ${limit}, Cursor: ${cursor}, Take: ${take + 1}`);

        const screenshots = await prisma.screenshot.findMany(queryOptions);

        console.log(`[Screenshots API] Found: ${screenshots.length} items`);

        const validScreenshots = screenshots.map(s => ({
            ...s,
            name: `Screenshot ${s.captureTime.toISOString().split('T')[0]}`,
            createdTime: s.captureTime.toISOString(),
            webViewLink: `/api/web/v1/media/view/${s.id}`,
            thumbnailLink: `/api/web/v1/media/thumbnail/${s.id}`
        }));

        let nextCursor: string | undefined = undefined;
        if (validScreenshots.length > take) {
            const nextItem = validScreenshots.pop(); // Remove the extra item
            nextCursor = nextItem?.id;
        }

        return res.json({
            screenshots: validScreenshots,
            cursor: nextCursor,
            hasMore: !!nextCursor
        });
    } catch (error) {
        console.error('Get screenshots error:', error);
        return res.status(500).json({ error: 'Failed to fetch screenshots' });
    }
});

// Get single screenshot details
// Note: Actual image is served via /api/web/v1/media/view/:id
router.get('/:id', async (req: IdRequest, res: Response) => {
    try {
        const { id } = req.params;
        const screenshot = await prisma.screenshot.findUnique({
            where: { id: id }
        });

        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        return res.json(screenshot);
    } catch (error) {
        console.error('Get screenshot error:', error);
        return res.status(500).json({ error: 'Failed to fetch screenshot' });
    }
});

// Request a new screenshot (TRIGGER)
router.post('/request', async (req: QueryRequest<MachineParams>, res: Response) => {
    try {
        const { machineId } = req.query;
        if (!machineId) {
            return res.status(400).json({ error: 'machineId is required' });
        }

        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('server:command', {
                type: 'screenshot',
                timestamp: new Date().toISOString()
            });
            return res.json({ success: true, message: 'Screenshot requested' });
        } else {
            return res.status(500).json({ error: 'Socket service unavailable' });
        }
    } catch (error) {
        console.error('Request screenshot error:', error);
        return res.status(500).json({ error: 'Failed to request screenshot' });
    }
});

export default router;
