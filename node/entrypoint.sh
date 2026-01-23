#!/bin/sh
set -e

# If .env doesn't exist, create it from template
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.template .env
    
    # Generate unique JWT Secret
    echo "Generating unique JWT secret..."
    # Alpine friendly random generation
    JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    sed -i "s|JWT_SECRET=CHANGE_ME_OR_LET_INSTALLER_GENERATE|JWT_SECRET=$JWT_SECRET|" .env
    
    # Set Database URL to use /app/prisma volume
    # We use /app/prisma/vorsight.db to match the VOLUME directive in Dockerfile
    sed -i "s|DATABASE_URL=file:./data/vorsight.db|DATABASE_URL=file:/app/prisma/vorsight.db|" .env
    
    # Handle Web Passphrase if provided via ENV
    if [ ! -z "$WEB_PASSPHRASE" ]; then
        echo "Setting Web Passphrase from environment..."
        # Escape special chars not strictly handled here, assuming simple passphrase
        sed -i "s|WEB_PASSPHRASE=CHANGE_ME_TO_A_SECURE_PASSPHRASE|WEB_PASSPHRASE=$WEB_PASSPHRASE|" .env
    fi

    # Handle Google OAuth if provided via ENV
    if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
        sed -i "s|GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com|GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" .env
    fi
     if [ ! -z "$GOOGLE_CLIENT_SECRET" ]; then
        sed -i "s|GOOGLE_CLIENT_SECRET=your-client-secret|GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET|" .env
    fi
fi

# Ensure migrations are applied
echo "Running database migrations..."
npx prisma migrate deploy

# Execute the CMD
exec "$@"
