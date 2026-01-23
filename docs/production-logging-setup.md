# Production Logging Setup Instructions

## 🚀 Deploy Winston Logging to Production

### Prerequisites
- SSH access to EC2: `ssh ubuntu@54.242.131.12`
- Backend code already deployed with Winston logging

---

## Step 1: Create Log Directory on EC2

```bash
# SSH to production server
ssh ubuntu@54.242.131.12

# Create log directory
sudo mkdir -p /var/log/terrainsim

# Set ownership to ubuntu user
sudo chown ubuntu:ubuntu /var/log/terrainsim

# Set proper permissions
sudo chmod 755 /var/log/terrainsim

# Verify
ls -ld /var/log/terrainsim
# Should show: drwxr-xr-x 2 ubuntu ubuntu 4096 ... /var/log/terrainsim
```

---

## Step 2: Deploy Environment Configuration

```bash
# Still on production server
cd /var/www/terrainsim/apps/simulation-api

# Create .env file with production logging config
cat > .env << 'EOF'
# Backend API Configuration - Production
NODE_ENV=production
PORT=3001

# Winston Logging Configuration
LOG_LEVEL=info
LOG_DIR=/var/log/terrainsim
ENABLE_FILE_LOGGING=true
ENABLE_CONSOLE_LOGGING=true
EOF

# Verify file
cat .env
```

---

## Step 3: Restart Backend Service

```bash
# Restart PM2 process to load new logging config
pm2 restart terrainsim-api

# Check logs to verify Winston initialized
pm2 logs terrainsim-api --lines 20

# You should see:
# "Winston logging initialized"
# "TerrainSim API server started"
```

---

## Step 4: Verify Log Files Are Created

```bash
# Wait a few seconds for requests to generate logs
sleep 5

# Check log directory
ls -lh /var/log/terrainsim/

# Expected files:
# app-YYYY-MM-DD.log
# error-YYYY-MM-DD.log
# simulation-YYYY-MM-DD.log
# *.audit.json (rotation tracking)

# View recent logs
tail -f /var/log/terrainsim/app-$(date +%Y-%m-%d).log
```

---

## Step 5: Test Logging

```bash
# From your local machine, make a test request
curl -X POST https://api.lmvcruz.work/generate \
  -H "Content-Type: application/json" \
  -d '{"method":"perlin","width":64,"height":64,"seed":123}'

# Back on production, check if logs appear
tail -20 /var/log/terrainsim/app-$(date +%Y-%m-%d).log | grep "Heightmap generation"
```

---

## Step 6: Set Up Log Rotation Monitoring (Optional)

```bash
# Create a cron job to monitor disk usage
crontab -e

# Add this line (runs daily at midnight):
0 0 * * * du -sh /var/log/terrainsim | mail -s "TerrainSim Log Size" your-email@example.com
```

---

## Verification Checklist

- [ ] Log directory exists: `/var/log/terrainsim`
- [ ] Directory owned by ubuntu:ubuntu
- [ ] Directory permissions: 755
- [ ] .env file contains production logging config
- [ ] PM2 service restarted
- [ ] Winston initialization message in PM2 logs
- [ ] Log files being created (app, error, simulation)
- [ ] Test request generates log entries
- [ ] Logs are in JSON format
- [ ] Timestamps are correct

---

## Troubleshooting

### Problem: Permission denied writing to /var/log/terrainsim

**Solution**:
```bash
sudo chown -R ubuntu:ubuntu /var/log/terrainsim
sudo chmod -R 755 /var/log/terrainsim
```

### Problem: Logs not appearing

**Check**:
1. ENV variables loaded: `pm2 env terrainsim-api | grep LOG`
2. Winston initialized: `pm2 logs terrainsim-api | grep Winston`
3. File permissions: `ls -la /var/log/terrainsim`
4. Disk space: `df -h /var/log`

### Problem: Log files too large

**Solution**:
```bash
# Check current size
du -sh /var/log/terrainsim/

# Manually compress old logs
cd /var/log/terrainsim
gzip app-*.log
gzip error-*.log
gzip simulation-*.log

# Or use the cleanup script (Phase 2)
```

---

## Next Steps

After production logging is working:

1. ✅ Monitor disk usage for a few days
2. ✅ Verify log rotation happens automatically
3. ✅ Test log capture scripts (Phase 2.1)
4. ✅ Set up log level management API (Phase 2.2)
5. ✅ Implement frontend remote logging (Phase 1.2)

---

## Quick Reference

```bash
# View live logs
tail -f /var/log/terrainsim/app-$(date +%Y-%m-%d).log

# View error logs only
tail -f /var/log/terrainsim/error-$(date +%Y-%m-%d).log

# View simulation logs
tail -f /var/log/terrainsim/simulation-$(date +%Y-%m-%d).log

# Check log size
du -sh /var/log/terrainsim/

# Count log entries today
grep -c "timestamp" /var/log/terrainsim/app-$(date +%Y-%m-%d).log

# Search for errors
grep "level\":\"error" /var/log/terrainsim/app-$(date +%Y-%m-%d).log | jq .

# Restart backend (reload logging config)
pm2 restart terrainsim-api
```
