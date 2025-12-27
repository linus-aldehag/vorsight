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

//Import routers
const machinesRouter = require('./routes/machines');

// Public routes (no authentication required)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/media', require('./routes/media')); // Public for img tag loading

// Machine registration (no auth - service needs to register first)
app.post('/api/machines/register', machinesRouter.stack.find(layer =>
    layer.route?.path === '/register'
)?.route?.stack[0]?.handle || ((req, res) => {
    const express = require('express');
    const router = express.Router();
    const crypto = require('crypto');
    const db = require('./db/database');

    try {
        const { machineId, name, hostname, metadata } = req.body;

        if (!machineId || !name) {
            return res.status(400).json({ error: 'machineId and name are required' });
        }

        // Check if machine already exists
        const existing = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
        if (existing) {
            return res.json({
                success: true,
                apiKey: existing.api_key,
                machineId: existing.id,
                message: 'Machine already registered'
            });
        }

        // Generate API key
        const apiKey = crypto.randomBytes(32).toString('hex');

        // Insert machine
        db.prepare(`
            INSERT INTO machines (id, name, hostname, api_key, registration_date, metadata)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `).run(machineId, name, hostname, apiKey, JSON.stringify(metadata || {}));

        res.json({
            success: true,
            apiKey,
            machineId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
}));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes (require browser authentication - tokens signed with service key)
app.use('/api/machines', authenticateBrowser, machinesRouter);
app.use('/api/activity', authenticateBrowser, require('./routes/activity'));
app.use('/api/screenshots', authenticateBrowser, require('./routes/screenshots'));
app.use('/api/status', authenticateBrowser, require('./routes/status'));
app.use('/api/system', authenticateBrowser, require('./routes/system'));
app.use('/api/schedule', authenticateBrowser, require('./routes/schedule'));
app.use('/api/settings', authenticateBrowser, require('./routes/settings'));
app.use('/api/analytics', authenticateBrowser, require('./routes/analytics'));
app.use('/api/audit', authenticateBrowser, require('./routes/audit'));
app.use('/api/cleanup', authenticateBrowser, require('./routes/cleanup'));
app.use('/api/ping', authenticateBrowser, require('./routes/ping'));
app.use('/api/oauth', require('./routes/oauth')); // OAuth has its own auth flow


// WebSocket
require('./websocket/socketHandler')(io);

// Start cleanup scheduler
const { scheduleCleanup } = require('./jobs/cleanup');
scheduleCleanup();

// Start ping monitor for offline machines
const { schedulePingMonitor } = require('./jobs/pingMonitor');
schedulePingMonitor();

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

    // Force exit after 5 seconds if graceful shutdown hangs
    const forceExitTimeout = setTimeout(() => {
        console.log('Shutdown timeout (5s), forcing exit');
        process.exit(1);
    }, 5000);

    server.close(() => {
        try {
            db.close();
            clearTimeout(forceExitTimeout);
            console.log('Server closed gracefully');
            process.exit(0);
        } catch (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
    });
});
