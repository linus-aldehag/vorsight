"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateBrowser = exports.authenticateMachine = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../db/database");
const authenticateMachine = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    try {
        const machine = await database_1.prisma.machine.findUnique({
            where: { apiKey: apiKey }
        });
        if (!machine) {
            return res.status(403).json({ error: 'Invalid API key' });
        }
        req.machine = machine;
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};
exports.authenticateMachine = authenticateMachine;
const authenticateBrowser = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        if (!process.env.SERVICE_KEY) {
            throw new Error('SERVICE_KEY not configured');
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.SERVICE_KEY);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateBrowser = authenticateBrowser;
//# sourceMappingURL=auth.js.map