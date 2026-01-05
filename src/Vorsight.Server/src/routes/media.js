const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db/database');

// Configure storage
const uploadDir = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use the ID provided in body or generate one
        const fileId = req.body.id || Date.now().toString();
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `${fileId}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/media/:id - Redirect to Google Drive thumbnail URL
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Look up screenshot in database to get Google Drive file ID
        const screenshot = db.prepare('SELECT google_drive_file_id FROM screenshots WHERE id = ?').get(id);

        if (!screenshot || !screenshot.google_drive_file_id) {
            return res.status(404).json({ error: 'Screenshot not found or not uploaded to Drive' });
        }

        // Redirect to Google Drive thumbnail with large size to avoid cropping
        const driveFileId = screenshot.google_drive_file_id;
        // Using w4000 gives us high-resolution images without authentication issues
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w4000`;

        res.redirect(thumbnailUrl);
    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ error: 'Failed to retrieve media' });
    }
});

// POST /api/media/upload - Upload file
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileId = req.file.filename.split('.')[0];

        res.json({
            success: true,
            id: fileId,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

module.exports = router;
