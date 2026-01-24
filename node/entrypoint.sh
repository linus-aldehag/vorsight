#!/bin/sh
set -e

# Define persistent config location
# User requested /app/vorsight as volume root
DATA_DIR="/app/vorsight"
PERSISTENT_ENV="$DATA_DIR/.env"
DB_DIR="$DATA_DIR/prisma"

# Ensure data directories exist
mkdir -p "$DB_DIR"

# If persistent .env doesn't exist, create it from template
if [ ! -f "$PERSISTENT_ENV" ]; then
    echo " Creating fresh persistent configuration at $PERSISTENT_ENV..."
    cp .env.template "$PERSISTENT_ENV"
    
    # 1. Handle JWT Secret
    if [ ! -z "$JWT_SECRET" ]; then
        echo "Setting JWT Secret from environment..."
        # If user passed it, burn it into the file
        sed -i "s|JWT_SECRET=CHANGE_ME_OR_LET_INSTALLER_GENERATE|JWT_SECRET=$JWT_SECRET|" "$PERSISTENT_ENV"
    else
        echo "Generating unique JWT secret..."
        # Alpine friendly random generation
        GEN_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
        sed -i "s|JWT_SECRET=CHANGE_ME_OR_LET_INSTALLER_GENERATE|JWT_SECRET=$GEN_SECRET|" "$PERSISTENT_ENV"
    fi
    
    # 2. Set Database URL to use absolute path in the volume
    # Use the prisma subfolder
    sed -i "s|DATABASE_URL=file:./data/vorsight.db|DATABASE_URL=file:$DB_DIR/vorsight.db|" "$PERSISTENT_ENV"
    
    # 3. Handle Web Passphrase if provided
    if [ ! -z "$WEB_PASSPHRASE" ]; then
        echo "Setting Web Passphrase from environment..."
        sed -i "s|WEB_PASSPHRASE=CHANGE_ME_TO_A_SECURE_PASSPHRASE|WEB_PASSPHRASE=$WEB_PASSPHRASE|" "$PERSISTENT_ENV"
    fi

    # 4. Handle Google OAuth if provided
    if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
        sed -i "s|GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com|GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" "$PERSISTENT_ENV"
    fi
     if [ ! -z "$GOOGLE_CLIENT_SECRET" ]; then
        sed -i "s|GOOGLE_CLIENT_SECRET=your-client-secret|GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET|" "$PERSISTENT_ENV"
    fi
else
    echo "Found existing configuration at $PERSISTENT_ENV"
fi

# Link local .env to the persistent one
# The application (and Prisma) expects .env in the current working directory (/app)
if [ -f .env ]; then
    rm .env
fi
ln -s "$PERSISTENT_ENV" .env

# Ensure migrations are applied
echo "Running database migrations..."
npx prisma migrate deploy

# Execute the CMD
exec "$@"
