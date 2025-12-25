const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/vorsight.db');

// Ensure DATABASE_URL is set for Prisma (safety fallback)
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = `file:${dbPath}`;
}

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Open database with better-sqlite3
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create Prisma adapter
const adapter = new PrismaBetterSqlite3(db);

// Initialize Prisma Client with adapter
const prisma = new PrismaClient({ adapter });

// Export both for backwards compatibility
module.exports = db;
module.exports.prisma = prisma;
module.exports.db = db;
