const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Make io available in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database
const db = require('./db/database');

// Import authentication middleware
const { authenticateBrowser } = require('./middleware/auth');

// Public routes (no authentication required)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/media', require('./routes/media')); // Public for img tag loading
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes (require JWT authentication)
app.use('/api/machines', authenticateBrowser, require('./routes/machines'));
app.use('/api/activity', authenticateBrowser, require('./routes/activity'));
app.use('/api/screenshots', authenticateBrowser, require('./routes/screenshots'));
app.use('/api/status', authenticateBrowser, require('./routes/status'));
app.use('/api/system', authenticateBrowser, require('./routes/system'));
app.use('/api/schedule', authenticateBrowser, require('./routes/schedule'));
app.use('/api/settings', authenticateBrowser, require('./routes/settings'));
app.use('/api/analytics', authenticateBrowser, require('./routes/analytics'));
app.use('/api/audit', authenticateBrowser, require('./routes/audit'));


// WebSocket
require('./websocket/socketHandler')(io);

// Serve React app for all other routes (must be last)
app.use((req, res) => {
    const indexPath = path.join(__dirname, '../public/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend not built');
    }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Vorsight server running on http://${HOST}:${PORT}`);
    console.log(`📊 Database: ${path.join(__dirname, '../data/vorsight.db')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        db.close();
        process.exit(0);
    });
});
