# Runtime only image
# Context: The extracted contents of the deployment tarball
FROM node:22-alpine

WORKDIR /app

# Copy all files from context
COPY . .

# Install OpenSSL (Required for Prisma on Alpine)
RUN apk add --no-cache openssl

# Install production dependencies
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Configuration
ENV PORT=3000
ENV HOST=0.0.0.0
VOLUME ["/app/vorsight"]
EXPOSE 3000

# Entrypoint setup
RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]

# Start command
CMD ["node", "dist/server.js"]
