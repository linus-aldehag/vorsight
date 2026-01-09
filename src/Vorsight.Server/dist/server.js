"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./db/database");
// Import authentication middleware
const auth_1 = require("./middleware/auth");
// Import routers
const machines_1 = __importDefault(require("./routes/machines"));
const activity_1 = __importDefault(require("./routes/activity"));
const screenshots_1 = __importDefault(require("./routes/screenshots"));
const status_1 = __importDefault(require("./routes/status"));
const system_1 = __importDefault(require("./routes/system"));
const schedule_1 = __importDefault(require("./routes/schedule"));
const settings_1 = __importDefault(require("./routes/settings"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const audit_1 = __importDefault(require("./routes/audit"));
const cleanup_1 = __importDefault(require("./routes/cleanup"));
const ping_1 = __importDefault(require("./routes/ping"));
const oauth_1 = __importDefault(require("./routes/oauth"));
const auth_2 = __importDefault(require("./routes/auth"));
const media_1 = __importDefault(require("./routes/media"));
// Import jobs
const cleanup_2 = require("./jobs/cleanup");
const pingMonitor_1 = require("./jobs/pingMonitor");
const heartbeatCleanup_1 = require("./jobs/heartbeatCleanup");
// Import Socket Handler
const socketHandler_1 = __importDefault(require("./websocket/socketHandler"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});
// Make io available in routes
app.set('io', io);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Public routes (no authentication required)
app.use('/api/auth', auth_2.default);
app.use('/api/media', media_1.default);
// Protected routes
// Note: machinesRouter handles its own auth internally to allow public /register
app.use('/api/machines', machines_1.default);
// Protected routes (require browser authentication)
app.use('/api/activity', auth_1.authenticateBrowser, activity_1.default);
app.use('/api/screenshots', auth_1.authenticateBrowser, screenshots_1.default);
app.use('/api/status', auth_1.authenticateBrowser, status_1.default);
app.use('/api/system', auth_1.authenticateBrowser, system_1.default);
app.use('/api/schedule', auth_1.authenticateBrowser, schedule_1.default);
app.use('/api/settings', auth_1.authenticateBrowser, settings_1.default);
app.use('/api/analytics', auth_1.authenticateBrowser, analytics_1.default);
app.use('/api/audit', auth_1.authenticateBrowser, audit_1.default);
app.use('/api/cleanup', auth_1.authenticateBrowser, cleanup_1.default);
app.use('/api/ping', auth_1.authenticateBrowser, ping_1.default);
// OAuth has its own auth flow
app.use('/api/oauth', oauth_1.default);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Version endpoint
const packageJsonPath = path_1.default.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf8'));
app.get('/api/version', (_req, res) => {
    res.json({
        server: packageJson.version,
        node: process.version
    });
});
// WebSocket
(0, socketHandler_1.default)(io);
// Start scheduled jobs
(0, cleanup_2.scheduleCleanup)();
(0, pingMonitor_1.schedulePingMonitor)();
(0, heartbeatCleanup_1.scheduleHeartbeatCleanup)();
// Serve React app for all other routes (must be last)
app.use((_req, res) => {
    const indexPath = path_1.default.join(__dirname, '../public/index.html');
    if (fs_1.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
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
            await database_1.prisma.$disconnect();
            clearTimeout(forceExitTimeout);
            console.log('Server closed gracefully');
            process.exit(0);
        }
        catch (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
    });
});
//# sourceMappingURL=server.js.map