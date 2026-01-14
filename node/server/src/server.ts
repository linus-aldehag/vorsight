import dotenv from 'dotenv';
dotenv.config(); // Load env vars before imports

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { prisma } from './db/database';

// Import authentication middleware
import { authenticateBrowser } from './middleware/auth';

// Import Machine Routes (formerly Agent)
import machineMachinesRouter from './routes/machine/machines';
import machineConfigurationRouter from './routes/machine/configuration';
import machineScheduleRouter from './routes/machine/schedule';
import machineLogsRouter from './routes/machine/logs';
import machineActivityRouter from './routes/machine/activity';
import machineMediaRouter from './routes/machine/media';
import machineOAuthRouter from './routes/machine/oauth';

// Import Web Routes
import webMachinesRouter from './routes/web/machines';
import webSettingsRouter from './routes/web/settings';

import webActivityRouter from './routes/web/activity';
import webLogsRouter from './routes/web/logs';
import webScreenshotsRouter from './routes/web/screenshots';
import webAuditRouter from './routes/web/audit';
import webAnalyticsRouter from './routes/web/analytics';
import webCleanupRouter from './routes/web/cleanup';
import webStatusRouter from './routes/web/status';
import webPingRouter from './routes/web/ping';
import webSystemRouter from './routes/web/system';
import webAuthRouter from './routes/web/auth';
import webOAuthRouter from './routes/web/oauth';
import webMediaRouter from './routes/web/media';
import webActionsRouter from './routes/web/actions';

// Import jobs
import { scheduleCleanup } from './jobs/cleanup';
import { schedulePingMonitor } from './jobs/pingMonitor';
import { scheduleHeartbeatCleanup } from './jobs/heartbeatCleanup';

// Import Socket Handler
import socketHandler from './websocket/socketHandler';

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
app.use(express.json()); // Increase limit if needed

app.use(express.static(path.join(__dirname, '../public')));

// ==========================================
// MACHINE API (Machine Service Authentication)
// Base Path: /api/machine/v1
// ==========================================
app.use('/api/machine/v1/machines', machineMachinesRouter); // Register (Public), Update (Auth)
app.use('/api/machine/v1/configuration', machineConfigurationRouter);
app.use('/api/machine/v1/schedule', machineScheduleRouter);
app.use('/api/machine/v1/logs', machineLogsRouter);
app.use('/api/machine/v1/activity', machineActivityRouter);
app.use('/api/machine/v1/media', machineMediaRouter);
app.use('/api/machine/v1/oauth', machineOAuthRouter);

// ==========================================
// WEB API (Browser Authentication)
// Base Path: /api/web/v1
// ==========================================

// Public Web Routes
app.use('/api/web/v1/auth', webAuthRouter);
app.use('/api/web/v1/oauth', webOAuthRouter);
app.use('/api/web/v1/media', webMediaRouter); // Public for img tags

// Protected Web Routes (Require JWT)
app.use('/api/web/v1/machines', authenticateBrowser, webMachinesRouter);
app.use('/api/web/v1/settings', authenticateBrowser, webSettingsRouter);

app.use('/api/web/v1/activity', authenticateBrowser, webActivityRouter);
app.use('/api/web/v1/logs', authenticateBrowser, webLogsRouter);
app.use('/api/web/v1/screenshots', authenticateBrowser, webScreenshotsRouter);
app.use('/api/web/v1/audit', authenticateBrowser, webAuditRouter);
app.use('/api/web/v1/analytics', authenticateBrowser, webAnalyticsRouter);
app.use('/api/web/v1/cleanup', authenticateBrowser, webCleanupRouter);
app.use('/api/web/v1/status', authenticateBrowser, webStatusRouter);
app.use('/api/web/v1/ping', authenticateBrowser, webPingRouter);
app.use('/api/web/v1/system', authenticateBrowser, webSystemRouter);
app.use('/api/web/v1/actions', authenticateBrowser, webActionsRouter);

// ==========================================
// OTHER
// ==========================================

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
