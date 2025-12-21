# Vörsight Pi Server Deployment

This directory contains everything needed to deploy the Vörsight server to a Raspberry Pi.

## Prerequisites

- Raspberry Pi (3 or later recommended)
- Raspberry Pi OS (Debian-based)
- Node.js 25+ installed on Pi
- SSH access to Pi
- At least 1GB free space

## Quick Start

### 1. Get Deployment Package

The deployment package is automatically built by GitHub Actions when you push a tag.

**Download from GitHub Releases** (Recommended)
1. Go to the repository's **Releases** page
2. Download the latest `vorsight-server-*.tar.gz` file

**Or trigger a new build:**
1. Create and push a tag: `git tag -a v1.0.1 -m "Release v1.0.1" && git push origin v1.0.1`
2. Wait for GitHub Actions to complete
3. Download from Releases page

The package contains:
- Compiled React web app
- Node.js server code with production dependencies
- Installation script (`install.sh`)
- systemd service template
- Environment configuration template (`.env.example`)

### 2. Transfer to Pi

```bash
scp vorsight-server-*.tar.gz pi@raspberrypi:~/
```

Replace `raspberrypi` with your Pi's hostname or IP address.

### 3. Install on Pi

SSH into your Pi:

```bash
ssh pi@raspberrypi
```

Extract and install:

```bash
tar -xzf vorsight-server-*.tar.gz
cd vorsight-server
sudo ./install.sh
```

The installer will:
- Create a `vorsight` system user
- Install files to `/opt/vorsight`
- Install Node.js dependencies (production only)
- Create `/opt/vorsight/.env` from template
- Create systemd service
- Start the service

### 4. Configure Environment

Edit `/opt/vorsight/.env` with your settings:

```bash
sudo nano /opt/vorsight/.env
```

Key settings to configure:

```bash
PORT=3000                                    # Server port
HOST=0.0.0.0                                 # Listen on all interfaces
NODE_ENV=production
CLIENT_ORIGIN=http://your-pi-ip:3000        # CORS origin
JWT_SECRET=your-secure-random-secret-here   # CHANGE THIS!
PSK=your-secure-psk-here                    # Pre-shared key (match Windows client)
DB_PATH=./data/vorsight.db
```

**Important**: The `PSK` value must match the `PresharedKey` in the Windows client's `appsettings.json`.

After editing, restart the service:

```bash
sudo systemctl restart vorsight
```

## Service Management

### Check Status

```bash
sudo systemctl status vorsight
```

### View Logs

```bash
# Live logs
journalctl -u vorsight -f

# Last 100 lines
journalctl -u vorsight -n 100
```

### Start/Stop/Restart

```bash
sudo systemctl start vorsight
sudo systemctl stop vorsight
sudo systemctl restart vorsight
```

### Enable/Disable Auto-Start

```bash
sudo systemctl enable vorsight   # Start on boot (default)
sudo systemctl disable vorsight  # Don't start on boot
```

## Accessing the Web UI

Once the service is running, access the web interface at:

```
http://your-pi-ip:3000
```

Or from the Pi itself:

```
http://localhost:3000
```

## File Locations

| Path | Description |
|------|-------------|
| `/opt/vorsight` | Installation directory |
| `/opt/vorsight/.env` | Configuration file |
| `/opt/vorsight/data/vorsight.db` | SQLite database |
| `/opt/vorsight/src/server.js` | Server entry point |
| `/opt/vorsight/public/` | React web app |
| `/etc/systemd/system/vorsight.service` | Systemd service file |

## Troubleshooting

### Service won't start

Check the logs:

```bash
journalctl -u vorsight -n 50
```

Common issues:
- **Port already in use**: Change `PORT` in `.env`
- **Database permission errors**: Check `/opt/vorsight/data` ownership
- **Node.js not found**: Install Node.js 18+

### Can't connect to web UI

1. Check service is running: `systemctl status vorsight`
2. Check firewall: `sudo ufw status` (if enabled, allow port 3000)
3. Verify the Pi's IP: `hostname -I`

### Database errors

Reset the database (⚠️ will delete all data):

```bash
sudo systemctl stop vorsight
sudo rm /opt/vorsight/data/vorsight.db
sudo systemctl start vorsight
```

### Update deployment

To update to a new version:

1. Download new deployment package from GitHub Actions
2. Transfer to Pi
3. Extract to temporary location
4. Stop service: `sudo systemctl stop vorsight`
5. Backup `.env` and `data/`: 
   ```bash
   sudo cp /opt/vorsight/.env ~/vorsight-env-backup
   sudo cp -r /opt/vorsight/data ~/vorsight-data-backup
   ```
6. Remove old files: `sudo rm -rf /opt/vorsight/*`
7. Copy new files: `sudo cp -r vorsight-server/* /opt/vorsight/`
8. Restore `.env`: `sudo cp ~/vorsight-env-backup /opt/vorsight/.env`
9. Restore `data/`: `sudo cp -r ~/vorsight-data-backup /opt/vorsight/data`
10. Install dependencies: `cd /opt/vorsight && sudo -u vorsight npm install --production`
11. Fix ownership: `sudo chown -R vorsight:vorsight /opt/vorsight`
12. Start service: `sudo systemctl start vorsight`

## Uninstallation

To completely remove Vorsight:

```bash
# Stop and disable service
sudo systemctl stop vorsight
sudo systemctl disable vorsight
sudo rm /etc/systemd/system/vorsight.service
sudo systemctl daemon-reload

# Remove files
sudo rm -rf /opt/vorsight

# Remove user
sudo userdel vorsight
```

## Advanced Configuration

### Change Installation Directory

Edit `install.sh` before running and change `INSTALL_DIR` variable.

### Custom Service Configuration

Edit `/etc/systemd/system/vorsight.service` to customize:
- User account
- Environment variables
- Resource limits
- Restart behavior

After editing, reload systemd:

```bash
sudo systemctl daemon-reload
sudo systemctl restart vorsight
```

### Database Backup

Create a cron job to backup the database:

```bash
sudo crontab -e
```

Add:

```cron
0 2 * * * cp /opt/vorsight/data/vorsight.db /home/pi/backups/vorsight-$(date +\%Y\%m\%d).db
```

## Support

For issues or questions, refer to the main repository documentation.
