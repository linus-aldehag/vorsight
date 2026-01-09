import { PrismaClient } from '@prisma/client';

// PrismaClient is initialized with the `better-sqlite3` driver under the hood by default for SQLite
// but we use the standard usage here. 

// Create a singleton instance to prevent multiple connections during hot-reloading in dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
