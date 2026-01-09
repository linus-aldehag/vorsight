"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const os_1 = __importDefault(require("os"));
const router = express_1.default.Router();
router.get('/info', (_req, res) => {
    try {
        const info = {
            platform: os_1.default.platform(),
            release: os_1.default.release(),
            type: os_1.default.type(),
            cpus: os_1.default.cpus().length,
            totalMemory: os_1.default.totalmem(),
            freeMemory: os_1.default.freemem(),
            uptime: os_1.default.uptime(),
            hostname: os_1.default.hostname()
        };
        return res.json(info);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to get system info' });
    }
});
exports.default = router;
//# sourceMappingURL=system.js.map