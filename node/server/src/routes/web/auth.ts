import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Login route for browser client
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { passphrase } = req.body;

        // Default password is 'admin' if not set in env
        const validPassword = process.env.WEB_PASSPHRASE || 'admin';

        // Use trim() to handle potential whitespace issues from env or input
        if (passphrase && validPassword && passphrase.trim() === validPassword.trim()) {
            // Get secret dynamically to ensure dotenv is loaded
            const secret = (process.env.JWT_SECRET || 'vorsight-secret-key-change-me').trim();

            // Generate JWT
            const token = jwt.sign(
                { role: 'admin' },
                secret,
                { expiresIn: (process.env.JWT_EXPIRATION || '30d') as any }
            );

            return res.json({
                success: true,
                token
            });
        } else {
            return res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
});

// Verify token (Frontend calls /status)
router.get('/status', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ authenticated: false });
        }

        try {
            const secret = process.env.JWT_SECRET || 'vorsight-secret-key-change-me';
            jwt.verify(token, secret);
            return res.json({ authenticated: true });
        } catch (err) {
            return res.status(403).json({ authenticated: false });
        }
    } else {
        return res.status(401).json({ authenticated: false });
    }
});

export default router;
