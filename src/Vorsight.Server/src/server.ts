import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db/database';

// Import authentication middleware
import { authenticateBrowser } from './middleware/auth';

// Import routers
import machinesRouter from './routes/machines';
import activityRouter from './routes/activity';
import screenshotsRouter from './routes/screenshots';
import statusRouter from './routes/status';
import systemRouter from './routes/system';
import scheduleRouter from './routes/schedule';
import settingsRouter from './routes/settings';
import analyticsRouter from './routes/analytics';
import auditRouter from './routes/audit';
import cleanupRouter from './routes/cleanup';
import pingRouter from './routes/ping';
import oauthRouter from './routes/oauth';
import authRouter from './routes/auth';
import mediaRouter from './routes/media';

// Import jobs
import { scheduleCleanup } from './jobs/cleanup';
import { schedulePingMonitor } from './jobs/pingMonitor';
import { scheduleHeartbeatCleanup } from './jobs/heartbeatCleanup';

// Import Socket Handler
import socketHandler from './websocket/socketHandler';

dotenv.config();

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

// Public routes (no authentication required)
app.use('/api/auth', authRouter);
app.use('/api/media', mediaRouter);

// Protected routes
// Note: machinesRouter handles its own auth internally to allow public /register
app.use('/api/machines', machinesRouter);

// Protected routes (require browser authentication)
app.use('/api/activity', authenticateBrowser, activityRouter);
app.use('/api/screenshots', authenticateBrowser, screenshotsRouter);
app.use('/api/status', authenticateBrowser, statusRouter);
app.use('/api/system', authenticateBrowser, systemRouter);
app.use('/api/schedule', authenticateBrowser, scheduleRouter);
app.use('/api/settings', authenticateBrowser, settingsRouter);
app.use('/api/analytics', authenticateBrowser, analyticsRouter);
app.use('/api/audit', authenticateBrowser, auditRouter);
app.use('/api/cleanup', authenticateBrowser, cleanupRouter);
app.use('/api/ping', authenticateBrowser, pingRouter);

// OAuth has its own auth flow
app.use('/api/oauth', oauthRouter);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Version endpoint
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

app.get('/api/version', (_req, res) => {
    res.json({
        server: packageJson.version,
        node: process.version
    });
});

// WebSocket
socketHandler(io);

// Start scheduled jobs
scheduleCleanup();
schedulePingMonitor();
scheduleHeartbeatCleanup();

// Serve React app for all other routes (must be last)
app.use((_req, res) => {
    const indexPath = path.join(__dirname, '../public/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend not built');
    }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(Number(PORT), HOST, () => {
    console.log(`🚀 Vörsight Server v${packageJson.version} running on http://${HOST}:${PORT}`);
    console.log(`📊 Database: Connected via Prisma`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');

    const forceExitTimeout = setTimeout(() => {
        console.log('Shutdown timeout (5s), forcing exit');
        process.exit(1);
    }, 5000);

    server.close(async () => {
        try {
            await prisma.$disconnect();
            clearTimeout(forceExitTimeout);
            console.log('Server closed gracefully');
            process.exit(0);
        } catch (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
    });
});
