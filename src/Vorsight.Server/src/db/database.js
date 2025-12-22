const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/vorsight.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Open database with better-sqlite3 (for backwards compatibility)
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create Prisma adapter for better-sqlite3
const adapter = new PrismaBetterSqlite3(db);

// Initialize Prisma Client with adapter (required for Prisma 7)
const prisma = new PrismaClient({ adapter });

// Note: Schema initialization is now handled by Prisma migrations
// Run 'npx prisma migrate dev' in development or 'npx prisma migrate deploy' in production

// Export both for backwards compatibility
module.exports = db;
module.exports.prisma = prisma;
module.exports.db = db;

