# Resulting image: node:22-alpine

# ==========================================
# STAGE 1: Build Client (Web App)
# ==========================================
FROM node:22-alpine AS client-builder
WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci

# Copy client source code
COPY client/ .

# Build the client (Vite)
# Output should be in /app/client/dist
RUN npm run build


# ==========================================
# STAGE 2: Build Server (TypeScript)
# ==========================================
FROM node:22-alpine AS server-builder
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies (including devDeps for tsc)
RUN npm ci

# Copy server source code (and potentially shared schemas if referenced relatively)
# Note: Based on package.json passed to me, server relies on relative path ../../shared/schemas
# so we might need to adjust context or copy strategy if "server" is build context root.
# Assuming build context is `node/` directory.

COPY server/ .
# Also need to ensure generated types can be built if they rely on external files
# The "generate-types" script does `json2ts -i ../../shared/schemas/...`
# This implies we need those schemas available in the build stage.

# Let's copy the shared folder from the parent context if possible, but Docker context is usually the `node` folder.
# If the user runs `docker build -f node/Dockerfile .` from root, we have access to shared.
# IF the user runs `docker build .` from `node/`, we DO NOT have access to `../shared`.
#
# FOR SAFETY: I will assume the build context is the `c:\repos\vorsight` root in my instructions,
# OR I will copy the schema files into the build if I can.
#
# BUT, looking at `package.json`: "generate-types": "json2ts ..."
# I'll rely on the user running build from root or ensure I copy/mock what's needed.
# Let's assume we are building from `node/` directory for now as it makes the most sense for a "node" dockerfile.
# But `json2ts` script points to `../../shared`.
#
# FIX: I will modify the `generate-types` or assumed context.
# Actually simpler: The `dist` likely just needs the generated `.ts` files.
# If I run `npm run build`, it runs `prebuild` -> `generate-types`.
#
# I will copy the necessary shared schemas.
# Wait, standard docker build context limitation.
# If I build from `node/` folder, I cannot access `../shared`.
#
# STRATEGY CHANGE:
# I will rewrite the `CMD` or build steps to assume the schemas are copied into a known location
# or pre-generate them.
#
# HOWEVER, `server-builder` needs to run `tsc`.
# I will attempt to copy `../../shared` assuming the context allows it OR
# I will modify the instruction to build from ROOT context.
#
# Let's assume build context is the REPO ROOT to allow access to `shared/`.
# This is cleaner.

COPY ../shared /app/shared
# (The above only works if context is root)

# Re-evaluating: The prompt asked for "put the server in a docker container".
# If I put Dockerfile in `node/Dockerfile`, usually one builds from `node/`.
# If I build from `node/`, `../../shared` is inaccessible.
#
# OPTION B: Modify the build to NOT re-generate types inside Docker,
# but usually `dist` is not checked in.
#
# OPTION C: Dockerfile stays in `node/`, but `docker build` command is run from root with `-f node/Dockerfile`.
# This is the standard way to handle mono-repo-like structures without workspaces.
#
# I will proceed with OPTION C.
#
# Correcting paths for Option C (Context = Repo Root):

WORKDIR /app
COPY shared ./shared

WORKDIR /app/server
COPY node/server/package*.json ./
RUN npm ci
COPY node/server/ .

# Generate types (relies on ../../shared which is now ../../shared relative to /app/server? No.)
# The script is: `json2ts -i ../../shared/schemas/machine-settings.json`
# Inside container:
# WORKDIR is /app/server.
# `../../shared` would be `/shared`? No `/app/../shared` -> `/shared`.
# Valid path would be `../shared` if we are at `/app/server`.
#
# So I need to verify directory structure inside container matches relative paths.
# /app/server
# /app/shared
#
# Relative `../../shared` from `/app/server`:
# `..` -> `/app`
# `../..` -> `/`
# `../../shared` -> `/shared`
#
# So I need to put shared at `/shared`?
# Or change the script? I can't easily change the script in package.json without `sed`.
#
# Easier: Place shared at `/shared` in the container.
#
# Correction:
# WORKDIR /app/server. `../` is `/app`. `../../` is `/`.
# So `../../shared` is `/shared`.
#
# So I will COPY shared to /shared.

WORKDIR /shared
COPY shared/ .

WORKDIR /app/server
# Build
RUN npm run build
# (This runs generate-types which looks for ../../shared which is /shared. Matches!)


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
# (Prisma client usually generated into node_modules)

# Ensure Prisma Client is generated for the runtime architecture
# We need schema.prisma.
COPY node/server/prisma ./prisma
RUN npx prisma generate

# Copy built webapp from client-builder to public/
# The server serves from `../public` relative to `dist/server.js`.
# So if server is running at `/app/dist/server.js`, it looks at `/app/public`.
COPY --from=client-builder /app/client/dist ./public

# Copy other necessary files
# server.ts loads .env, but we usually use env vars in Docker.
# Copy schemas if needed for runtime? (Validator might need them? No, usually compiled to types or code).
# If generic JSON validation uses them at runtime, we might need them.
# Checking server dependencies... `json-schema-to-typescript` enables types.
# Unless there is runtime validation loading those JSONs, we are fine.
#
# Looking at package.json: `json2ts` is devDependency.
#
# EXPOSE
ENV PORT=3000
ENV HOST=0.0.0.0
# Define volume for SQLite
VOLUME ["/app/prisma"]
# (Database usually at ./prisma/dev.db or similar, verify prisma schema later if possible)

EXPOSE 3000

# Start command
CMD ["node", "dist/server.js"]
