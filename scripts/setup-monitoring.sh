#!/bin/bash

# Monitoring & Observability Setup Script
# This script configures PM2 logging, log rotation, and monitoring for TerrainSim API

set -e

echo "🔧 Setting up Monitoring & Observability..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/terrainsim"
LOG_DIR="/var/www/terrainsim/logs"
API_DIR="$APP_DIR/apps/simulation-api"

echo -e "${YELLOW}📁 Creating log directory...${NC}"
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"

echo -e "${YELLOW}📦 Installing PM2 log rotation module...${NC}"
pm2 install pm2-logrotate

echo -e "${YELLOW}⚙️  Configuring PM2 log rotation...${NC}"
# Max log file size: 100MB
pm2 set pm2-logrotate:max_size 100M

# Retain logs for 90 days
pm2 set pm2-logrotate:retain 90

# Compress rotated logs
pm2 set pm2-logrotate:compress true

# Date format for rotated logs
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

# Rotation interval: daily at midnight
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# TZ for rotation schedule
pm2 set pm2-logrotate:TZ UTC

echo -e "${YELLOW}🔄 Restarting PM2 with new configuration...${NC}"
cd "$API_DIR"

# Stop existing process if running
pm2 stop terrainsim-api 2>/dev/null || true
pm2 delete terrainsim-api 2>/dev/null || true

# Start with ecosystem config
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script (run on system boot)
pm2 startup systemd -u $USER --hp $HOME

echo -e "${GREEN}✅ PM2 configuration complete!${NC}"
echo ""
echo "📊 Log rotation settings:"
pm2 conf pm2-logrotate

echo ""
echo "📝 Current PM2 status:"
pm2 list

echo ""
echo "📂 Log files:"
echo "  Output: $LOG_DIR/terrainsim-api-out.log"
echo "  Error:  $LOG_DIR/terrainsim-api-error.log"

echo ""
echo "🔍 Useful commands:"
echo "  View logs:        pm2 logs terrainsim-api"
echo "  View errors only: pm2 logs terrainsim-api --err"
echo "  Log rotation:     pm2 conf pm2-logrotate"
echo "  Clear logs:       pm2 flush"

echo ""
echo -e "${GREEN}🎉 Monitoring setup complete!${NC}"
