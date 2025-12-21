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

// GET /api/media/:id - Stream image file
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Find file (try common extensions)
        const extensions = ['.png', '.jpg', '.jpeg'];
        let filePath = null;

        for (const ext of extensions) {
            const p = path.join(uploadDir, `${id}${ext}`);
            if (fs.existsSync(p)) {
                filePath = p;
                break;
            }
        }

        if (filePath) {
            res.sendFile(filePath);
        } else {
            // Check if it's a legacy ID or mock
            res.status(404).json({ error: 'File not found' });
        }
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
