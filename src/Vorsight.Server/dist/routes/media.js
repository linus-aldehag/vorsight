"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const router = express_1.default.Router();
// Redirect to Google Drive thumbnail
router.get('/thumbnail/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const screenshot = await database_1.prisma.screenshot.findUnique({
            where: { id: id },
            select: { googleDriveFileId: true }
        });
        if (!screenshot || !screenshot.googleDriveFileId) {
            // Return placeholder or 404
            return res.status(404).send('Not found');
        }
        // Redirect to Google Drive thumbnail (using a small trick with the ID)
        // Usually: https://drive.google.com/thumbnail?id=XXX
        return res.redirect(`https://drive.google.com/thumbnail?id=${screenshot.googleDriveFileId}`);
    }
    catch (error) {
        console.error('Thumbnail error:', error);
        return res.status(500).send('Error');
    }
});
// View full image (Redirect to Google Drive webContentLink or webViewLink)
router.get('/view/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const screenshot = await database_1.prisma.screenshot.findUnique({
            where: { id: id },
            select: { googleDriveFileId: true }
        });
        if (!screenshot || !screenshot.googleDriveFileId) {
            return res.status(404).send('Not found');
        }
        // Using direct link format
        // https://drive.google.com/uc?id=FILE_ID
        return res.redirect(`https://drive.google.com/uc?id=${screenshot.googleDriveFileId}`);
    }
    catch (error) {
        console.error('View error:', error);
        return res.status(500).send('Error');
    }
});
exports.default = router;
//# sourceMappingURL=media.js.map