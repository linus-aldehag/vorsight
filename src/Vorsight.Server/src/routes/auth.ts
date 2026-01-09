import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Secret (should be in env vars in production)
const JWT_SECRET = process.env.JWT_SECRET || 'vorsight-secret-key-change-me';

// Login route for browser client
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { passphrase } = req.body;

        // Default password is 'admin' if not set in env
        const validPassword = process.env.WEB_PASSPHRASE || 'admin';

        if (passphrase === validPassword) {
            // Generate JWT
            const token = jwt.sign(
                { role: 'admin' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                success: true,
                token
            });
        } else {
            return res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Login failed' });
    }
});

// Verify token
router.get('/verify', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ valid: false });
        }

        try {
            jwt.verify(token, JWT_SECRET);
            return res.json({ valid: true });
        } catch (err) {
            return res.status(403).json({ valid: false });
        }
    } else {
        return res.status(401).json({ valid: false });
    }
});

export default router;
