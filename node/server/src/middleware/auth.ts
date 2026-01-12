import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/database';



// Middleware to authenticate machines via API Key
export const authenticateMachine = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
        res.status(401).json({ error: 'Access denied. No API key provided.' });
        return;
    }

    try {
        const machine = await prisma.machine.findFirst({
            where: { apiKey: apiKey }
        });

        if (!machine) {
            res.status(401).json({ error: 'Invalid API Key.' });
            return;
        }

        req.machine = machine;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(400).json({ error: 'Invalid Request.' });
        return;
    }
};

// Middleware to authenticate browser client via JWT
export const authenticateBrowser = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }

    try {
        // Get secret dynamically to ensure dotenv is loaded
        const secret = (process.env.SERVICE_KEY || 'vorsight-secret-key-change-me').trim();

        const decoded = jwt.verify(token, secret);
        req.user = decoded as any;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
        return;
    }
};

// Middleware that accepts EITHER a valid Browser JWT OR a valid Machine API Key
export const authenticateAny = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Try API Key (Machine)
    const apiKey = req.header('X-API-Key');
    if (apiKey) {
        try {
            const machine = await prisma.machine.findFirst({
                where: { apiKey: apiKey }
            });
            if (machine) {
                req.machine = machine;
                return next();
            }
        } catch (e) {
            // Ignore error, try next method
        }
    }

    // 2. Try JWT (Browser)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
        try {
            const secret = (process.env.SERVICE_KEY || 'vorsight-secret-key-change-me').trim();
            const decoded = jwt.verify(token, secret);
            req.user = decoded as any;
            return next();
        } catch (e) {
            // Token invalid
        }
    }

    // 3. Failed both
    res.status(401).json({ error: 'Unauthorized. Valid API Key or JWT Token required.' });
};
