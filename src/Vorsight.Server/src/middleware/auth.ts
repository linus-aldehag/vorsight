import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'vorsight-secret-key-change-me';

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
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
        return;
    }
};
