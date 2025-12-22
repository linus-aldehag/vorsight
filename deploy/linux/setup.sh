#!/bin/bash
# Vorsight Server Setup Script for Linux
# Handles both fresh installations and upgrades

set -e  # Exit on error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Vorsight Server Setup${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Configuration
INSTALL_DIR="/opt/vorsight"
SERVICE_USER="vorsight"
SERVICE_NAME="vorsight"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect if this is an upgrade or fresh install
INSTALL_MODE="fresh"
if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/data/vorsight.db" ]; then
    INSTALL_MODE="upgrade"
fi

echo -e "${CYAN}📂 Mode: ${INSTALL_MODE}${NC}"
echo -e "${CYAN}📂 Installation directory: ${INSTALL_DIR}${NC}"
echo ""

# UPGRADE MODE
if [ "$INSTALL_MODE" = "upgrade" ]; then
    echo -e "${YELLOW}🔄 Existing installation detected - performing upgrade${NC}"
    
    # Step 1: Stop service
    echo -e "${CYAN}⏸️  Stopping service...${NC}"
    systemctl stop $SERVICE_NAME || true
    echo -e "${GREEN}   ✓ Service stopped${NC}"
    
    # Step 2: Backup database
    echo -e "${CYAN}💾 Backing up database...${NC}"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    DB_BACKUP="$INSTALL_DIR/data/vorsight.db.backup.$TIMESTAMP"
    cp "$INSTALL_DIR/data/vorsight.db" "$DB_BACKUP"
    echo -e "${GREEN}   ✓ Database backed up to: $DB_BACKUP${NC}"
    
    # Step 3: Update files (preserve data directory)
    echo -e "${CYAN}📋 Updating files...${NC}"
    rsync -av --exclude='data' --exclude='node_modules' "$SCRIPT_DIR/" "$INSTALL_DIR/"
    echo -e "${GREEN}   ✓ Files updated${NC}"
    
    # Step 4: Install/update dependencies
    echo -e "${CYAN}📦 Updating dependencies...${NC}"
    cd $INSTALL_DIR
    npm install --production --quiet
    echo -e "${GREEN}   ✓ Dependencies updated${NC}"
    
    # Step 5: Run Prisma migrations
    echo -e "${CYAN}🔄 Applying database migrations...${NC}"
    npx prisma migrate deploy
    echo -e "${GREEN}   ✓ Migrations applied${NC}"
    
    # Step 6: Restart service
    echo -e "${CYAN}▶️  Restarting service...${NC}"
    systemctl start $SERVICE_NAME
    sleep 2
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo -e "${GREEN}   ✓ Service restarted successfully!${NC}"
    else
        echo -e "${RED}   ❌ Service failed to start${NC}"
        echo -e "${YELLOW}   Check logs with: journalctl -u $SERVICE_NAME -n 50${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ Upgrade complete!${NC}"
    echo -e "${CYAN}   Database backup: ${YELLOW}$DB_BACKUP${NC}"
    
# FRESH INSTALL MODE
else
    # Step 1: Create service user
    echo -e "${CYAN}👤 Creating service user...${NC}"
    if id "$SERVICE_USER" &>/dev/null; then
        echo -e "${YELLOW}   User '$SERVICE_USER' already exists${NC}"
    else
        useradd -r -s /bin/false -d $INSTALL_DIR $SERVICE_USER
        echo -e "${GREEN}   ✓ Created user '$SERVICE_USER'${NC}"
    fi

    # Step 2: Create installation directory
    echo -e "${CYAN}📁 Creating installation directory...${NC}"
    mkdir -p $INSTALL_DIR
    echo -e "${GREEN}   ✓ Directory created${NC}"

    # Step 3: Copy files
    echo -e "${CYAN}📋 Copying files...${NC}"
    cp -r "$SCRIPT_DIR"/* $INSTALL_DIR/
    echo -e "${GREEN}   ✓ Files copied${NC}"

    # Step 4: Install Node.js dependencies
    echo -e "${CYAN}📦 Installing Node.js dependencies...${NC}"
    cd $INSTALL_DIR
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found. Please install Node.js first.${NC}"
        echo -e "${YELLOW}   Debian/Ubuntu: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs${NC}"
        exit 1
    fi

    npm install --production --quiet
    echo -e "${GREEN}   ✓ Dependencies installed${NC}"

    # Step 5: Configure environment
    echo -e "${CYAN}⚙️  Configuring environment...${NC}"
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        if [ -f "$INSTALL_DIR/.env.example" ]; then
            cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
            echo -e "${GREEN}   ✓ Created .env from template${NC}"
            echo ""
            echo -e "${YELLOW}⚠️  IMPORTANT: Edit $INSTALL_DIR/.env with your configuration${NC}"
            echo -e "${YELLOW}   Especially set:${NC}"
            echo -e "${YELLOW}     - JWT_SECRET (use a secure random string)${NC}"
            echo -e "${YELLOW}     - CLIENT_ORIGIN (if different from localhost)${NC}"
            echo ""
            read -p "Press Enter to edit .env now, or Ctrl+C to exit and configure later..."
            nano "$INSTALL_DIR/.env" || vi "$INSTALL_DIR/.env" || echo -e "${YELLOW}   No editor available, please edit manually${NC}"
        fi
    else
        echo -e "${YELLOW}   .env already exists, keeping existing configuration${NC}"
    fi

    # Step 6: Create data directory and run Prisma migrations
    echo -e "${CYAN}📊 Setting up database...${NC}"
    mkdir -p "$INSTALL_DIR/data"
    
    echo -e "${CYAN}🔄 Running database migrations...${NC}"
    npx prisma migrate deploy
    echo -e "${GREEN}   ✓ Database initialized${NC}"

    # Step 7: Set ownership
    echo -e "${CYAN}🔐 Setting file permissions...${NC}"
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    chmod 755 $INSTALL_DIR
    if [ -f "$INSTALL_DIR/.env" ]; then
        chmod 644 $INSTALL_DIR/.env
    fi
    echo -e "${GREEN}   ✓ Permissions set${NC}"

    # Step 8: Create systemd service
    echo -e "${CYAN}🔧 Creating systemd service...${NC}"
    cat > /etc/systemd/system/$SERVICE_NAME.service <<EOF
[Unit]
Description=Vorsight Monitoring Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vorsight

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR/data

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}   ✓ Service file created${NC}"

    # Step 9: Reload systemd and enable service
    echo -e "${CYAN}🔄 Enabling service...${NC}"
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    echo -e "${GREEN}   ✓ Service enabled (will start on boot)${NC}"

    # Step 10: Start service
    echo -e "${CYAN}▶️  Starting service...${NC}"
    systemctl start $SERVICE_NAME
    sleep 2

    # Check service status
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo -e "${GREEN}   ✓ Service started successfully!${NC}"
    else
        echo -e "${RED}   ❌ Service failed to start${NC}"
        echo -e "${YELLOW}   Check logs with: journalctl -u $SERVICE_NAME -n 50${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}✅ Installation complete!${NC}"
fi

# Common output for both modes
echo ""
echo -e "${CYAN}📝 Service Management:${NC}"
echo -e "   Status:  ${YELLOW}sudo systemctl status $SERVICE_NAME${NC}"
echo -e "   Start:   ${YELLOW}sudo systemctl start $SERVICE_NAME${NC}"
echo -e "   Stop:    ${YELLOW}sudo systemctl stop $SERVICE_NAME${NC}"
echo -e "   Restart: ${YELLOW}sudo systemctl restart $SERVICE_NAME${NC}"
echo -e "   Logs:    ${YELLOW}journalctl -u $SERVICE_NAME -f${NC}"
echo ""
echo -e "${CYAN}🌐 Access:${NC}"
echo -e "   Web UI: ${YELLOW}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "   Or:     ${YELLOW}http://localhost:3000${NC}"
echo ""
echo -e "${CYAN}📁 Files:${NC}"
echo -e "   Install:  ${YELLOW}$INSTALL_DIR${NC}"
echo -e "   Config:   ${YELLOW}$INSTALL_DIR/.env${NC}"
echo -e "   Database: ${YELLOW}$INSTALL_DIR/data/vorsight.db${NC}"
echo ""
