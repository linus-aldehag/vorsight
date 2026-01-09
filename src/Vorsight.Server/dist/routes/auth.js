"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
// JWT Secret (should be in env vars in production)
const JWT_SECRET = process.env.JWT_SECRET || 'vorsight-secret-key-change-me';
// Login route for browser client
router.post('/login', async (req, res) => {
    // In a real app, you'd validate against a user table.
    // Here we just use a simple password check for the single-user deployment
    const { password } = req.body;
    // Default password is 'admin' if not set in env
    const validPassword = process.env.ADMIN_PASSWORD || 'admin';
    if (password === validPassword) {
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            success: true,
            token
        });
    }
    else {
        return res.status(401).json({ error: 'Invalid password' });
    }
});
// Verify token
router.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jsonwebtoken_1.default.verify(token, JWT_SECRET, (err) => {
            if (err) {
                return res.status(403).json({ valid: false });
            }
            return res.json({ valid: true });
        });
    }
    else {
        return res.status(401).json({ valid: false });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map