import express, { Request, Response } from 'express';
import { authenticateMachine } from '../../middleware/auth';

const router = express.Router();

// POST /api/agent/v1/media/upload
router.post('/upload', authenticateMachine, async (_req: Request, res: Response) => {
    // Basic stub - just return success for now
    // If the C# agent is uploading files, we'd need multer or similar here to handle it.
    // Given the Google Drive direct upload logic seen in logs, this might be legacy.
    // If needed, we can implement file storage later.
    return res.json({ success: true, message: 'Upload stub' });
});

export default router;
