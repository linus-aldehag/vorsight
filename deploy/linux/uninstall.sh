#!/bin/bash
# Vörsight Server Uninstallation Script

set -e

echo "🗑️  Vörsight Server Uninstallation"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

SERVICE_NAME="vorsight"
INSTALL_DIR="/opt/vorsight"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SERVICE_USER="vorsight"

# Confirm uninstallation
echo "⚠️  This will completely remove Vörsight Server from your system."
echo "   Installation directory: $INSTALL_DIR"
echo "   Service: $SERVICE_NAME"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Uninstallation cancelled"
    exit 0
fi

echo ""
echo "🛑 Stopping and disabling service..."
if systemctl is-active --quiet $SERVICE_NAME; then
    systemctl stop $SERVICE_NAME
    echo "   ✓ Service stopped"
fi

if systemctl is-enabled --quiet $SERVICE_NAME; then
    systemctl disable $SERVICE_NAME
    echo "   ✓ Service disabled"
fi

echo "🗑️  Removing service file..."
if [ -f "$SERVICE_FILE" ]; then
    rm "$SERVICE_FILE"
    systemctl daemon-reload
    echo "   ✓ Service file removed"
fi

echo "📁 Removing installation directory..."
if [ -d "$INSTALL_DIR" ]; then
    # Optional: backup database before removal
    if [ -f "$INSTALL_DIR/data/vorsight.db" ]; then
        BACKUP_DIR="/tmp/vorsight_backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp "$INSTALL_DIR/data/vorsight.db" "$BACKUP_DIR/"
        echo "   ℹ️  Database backed up to: $BACKUP_DIR"
    fi
    
    rm -rf "$INSTALL_DIR"
    echo "   ✓ Installation directory removed"
fi

echo "👤 Removing service user..."
if id "$SERVICE_USER" &>/dev/null; then
    userdel "$SERVICE_USER"
    echo "   ✓ User '$SERVICE_USER' removed"
fi

echo ""
echo "✅ Vörsight Server has been completely uninstalled"
echo ""
