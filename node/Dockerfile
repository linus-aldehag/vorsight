# Runtime only image
# Context: The extracted contents of the deployment tarball (dist, public, package.json, prisma, etc.)
FROM node:22-alpine

WORKDIR /app

# Copy all files from context (which is the extracted tarball content)
COPY . .

# Install production dependencies
# Note: The tarball includes package.json and package-lock.json
RUN npm ci --omit=dev

# Generate Prisma Client
# The tarball includes the prisma directory
RUN npx prisma generate

# Configuration
ENV PORT=3000
ENV HOST=0.0.0.0
VOLUME ["/app/prisma"]
EXPOSE 3000

# Start command
# The tarball structure puts server.js in dist/server.js
CMD ["node", "dist/server.js"]
