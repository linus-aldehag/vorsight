# Resulting image: node:22-alpine

# ==========================================
# STAGE 1: Build Client (Web App)
# ==========================================
FROM node:22-alpine AS client-builder
WORKDIR /app/client

# Copy client package files
# Context is assumed to be REPO ROOT
COPY node/client/package*.json ./

# Install dependencies
RUN npm ci

# Copy client source code
COPY node/client/ .

# Build the client (Vite)
# Output should be in /app/client/dist
RUN npm run build


# ==========================================
# STAGE 2: Build Server (TypeScript)
# ==========================================
FROM node:22-alpine AS server-builder

# Setup shared schemas at /shared because package.json script expects ../../shared
WORKDIR /shared
COPY shared/ .

WORKDIR /app/server

# Copy server package files
COPY node/server/package*.json ./

# Install dependencies (including devDeps for tsc)
RUN npm ci

# Copy server source code
COPY node/server/ .

# Build (runs generate-types which expects ../../shared -> /shared)
RUN npm run build


# ==========================================
# STAGE 3: Production Runtime
# ==========================================
FROM node:22-alpine

WORKDIR /app

# Install production dependencies only
COPY node/server/package*.json ./
RUN npm ci --omit=dev

# Copy built server from builder
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules/.prisma ./node_modules/.prisma

# Ensure Prisma Client is generated for the runtime architecture
COPY node/server/prisma ./prisma
RUN npx prisma generate

# Copy built webapp from client-builder to public/
# The server serves from `../public` relative to `dist/server.js`
COPY --from=client-builder /app/client/dist ./public

# Configuration
ENV PORT=3000
ENV HOST=0.0.0.0

# Define volume for SQLite logic
# (Note: SQLite file usually sits in prisma folder or specified path)
VOLUME ["/app/prisma"]

EXPOSE 3000

# Start command
CMD ["node", "dist/server.js"]
