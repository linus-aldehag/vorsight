import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
import googleDriveService from '../../services/googleDriveService';

const router = express.Router();

// Redirect to Google Drive thumbnail
router.get('/thumbnail/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const screenshot = await prisma.screenshot.findUnique({
            where: { id: id },
            select: { googleDriveFileId: true }
        });

        if (!screenshot || !screenshot.googleDriveFileId) {
            // Return placeholder or 404
            return res.status(404).send('Not found');
        }

        // Redirect to Google Drive thumbnail
        return res.redirect(`https://drive.google.com/thumbnail?id=${screenshot.googleDriveFileId}`);
    } catch (error) {
        console.error('Thumbnail error:', error);
        return res.status(500).send('Error');
    }
});

// View full image (Redirect to Google Drive)
router.get('/view/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const screenshot = await prisma.screenshot.findUnique({
            where: { id: id },
            select: { googleDriveFileId: true }
        });

        if (!screenshot || !screenshot.googleDriveFileId) {
            return res.status(404).send('Not found');
        }

        // Proxy file content using server credentials
        const response = await googleDriveService.getFileStream(screenshot.googleDriveFileId);

        res.setHeader('Content-Type', 'image/jpeg');
        // @ts-ignore - Gaxios stream types are compatible with pipe
        response.data.pipe(res);
        return; // Ensure void return
    } catch (error) {
        console.error('View error:', error);
        return res.status(500).send('Error');
    }
});

export default router;
