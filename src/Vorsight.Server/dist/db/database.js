"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// PrismaClient is initialized with the `better-sqlite3` driver under the hood by default for SQLite
// but we use the standard usage here. 
// Create a singleton instance to prevent multiple connections during hot-reloading in dev
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma || new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
//# sourceMappingURL=database.js.map