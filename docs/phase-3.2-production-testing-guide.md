# Phase 3.2: Production Testing Guide

## Overview

This guide walks through testing the complete logging infrastructure in production, validating that all components work correctly in the live environment.

## Prerequisites

- ✅ Phase 1 (Infrastructure) complete
- ✅ Phase 2 (Management Scripts) complete
- ✅ Phase 3.1 (Local Testing) complete
- SSH access to production server: `ubuntu@54.242.131.12`
- GitHub repository access for deployments
- Python 3.8+ installed locally with required packages

## Testing Checklist

### 1. Backend Deployment with Winston Logging

**Objective**: Deploy backend to production with Winston logging fully configured.

#### Pre-Deployment Checklist

- [ ] Verify `.env.production` has correct log configuration:
  ```bash
  LOG_LEVEL=info
  LOG_DIR=/var/log/terrainsim
  ENABLE_FILE_LOGGING=true
  ENABLE_CONSOLE_LOGGING=true
  ```

- [ ] Verify Winston logger is imported in backend
- [ ] Verify log routes are mounted (`/api/logs/frontend`, `/admin/log-level`, `/api/logs/filter`)

#### Deployment Steps

```bash
# 1. Commit and push latest changes
git add .
git commit -m "Deploy logging infrastructure to production"
git push origin main

# 2. SSH into production server
ssh ubuntu@54.242.131.12

# 3. Create log directory if it doesn't exist
sudo mkdir -p /var/log/terrainsim
sudo chown ubuntu:ubuntu /var/log/terrainsim
sudo chmod 755 /var/log/terrainsim

# 4. Navigate to backend directory
cd /var/www/terrainsim

# 5. Pull latest changes
git pull origin main

# 6. Install dependencies
pnpm install

# 7. Update .env file with production settings
nano .env
# Ensure LOG_LEVEL=info, LOG_DIR=/var/log/terrainsim, etc.

# 8. Restart PM2 process
pm2 restart terrainsim-api

# 9. Check PM2 status
pm2 status

# 10. View live logs to verify Winston initialization
pm2 logs terrainsim-api --lines 50
```

#### Expected Results

You should see in PM2 logs:
```
Winston logger initialized
  - Level: info
  - Log Directory: /var/log/terrainsim
  - Transports: 3 (app, error, simulation)
  - Rotation: enabled
```

### 2. Verify Production Log Files

**Objective**: Confirm logs are being written to `/var/log/terrainsim/`.

```bash
# SSH into production
ssh ubuntu@54.242.131.12

# List log files
ls -lh /var/log/terrainsim/

# Check log file contents
tail -f /var/log/terrainsim/simulation-2026-01-23.log

# Verify log format (should be JSON)
head -5 /var/log/terrainsim/simulation-2026-01-23.log | python3 -m json.tool
```

#### Expected Results

- [ ] Log directory exists: `/var/log/terrainsim/`
- [ ] Three log files created (or will be after requests):
  - `app-YYYY-MM-DD.log` - General application logs
  - `error-YYYY-MM-DD.log` - Error logs only
  - `simulation-YYYY-MM-DD.log` - Simulation + frontend logs
- [ ] Logs are in valid JSON format
- [ ] Each log entry has: `timestamp`, `level`, `message`, `context`

### 3. Deploy Frontend with Remote Logging

**Objective**: Deploy frontend to Cloudflare Pages with remote logging enabled.

#### Pre-Deployment Checklist

- [ ] Verify `apps/web/.env.production` has:
  ```bash
  VITE_LOG_LEVEL=info
  VITE_REMOTE_LOGGING=true
  VITE_LOG_ENDPOINT=/api/logs/frontend
  VITE_API_URL=https://api.lmvcruz.work
  ```

- [ ] Verify remote logger is integrated in frontend code
- [ ] Backend `/api/logs/frontend` endpoint is working

#### Deployment Steps

```bash
# 1. Commit frontend changes
git add apps/web
git commit -m "Deploy frontend with remote logging"
git push origin main

# 2. Cloudflare Pages will auto-deploy
# Monitor deployment at: https://dash.cloudflare.com/

# 3. Wait for deployment to complete (~2-3 minutes)
```

#### Verify Deployment

```bash
# Check Cloudflare deployment status
# Visit: https://terrainsim.pages.dev (or your custom domain)

# Open browser developer console (F12)
# Look for remote logger initialization messages
```

### 4. Test Frontend Logging in Production

**Objective**: Generate frontend logs and verify they appear in backend files.

#### Test Steps

1. **Open Production Frontend**: https://terrainsim.pages.dev
2. **Open Browser Console** (F12 → Console tab)
3. **Generate Test Logs**:
   - Navigate to different pages
   - Perform terrain generation
   - Trigger any errors (optional)
4. **Check Console Output**:
   - Look for: `[RemoteLogger] Flushing X logs to backend`
   - Verify: No errors sending logs

#### Verify Backend Received Logs

```bash
# SSH into production
ssh ubuntu@54.242.131.12

# Check simulation log (frontend logs go here)
tail -100 /var/log/terrainsim/simulation-$(date +%Y-%m-%d).log | grep '"source":"frontend"'

# Or use jq for better formatting
tail -100 /var/log/terrainsim/simulation-$(date +%Y-%m-%d).log | \
  grep '"source":"frontend"' | jq '.'
```

#### Expected Results

- [ ] Frontend logs appear in `simulation-YYYY-MM-DD.log`
- [ ] Each log has `"source":"frontend"`
- [ ] Each log has `sessionId`, `url`, `userAgent`
- [ ] Log levels match frontend activity (info, warn, error)
- [ ] No errors in browser console or backend logs

### 5. Test SSH Access for Log Scripts

**Objective**: Verify Python scripts can connect to production and download logs.

#### Test SSH Connection

```bash
# From your local machine
ssh ubuntu@54.242.131.12 "ls -lh /var/log/terrainsim/"
```

**Expected**: List of log files displayed without password prompt

#### Test Python Script SSH Commands

```bash
# From project root on your local machine

# Test log-manager status (includes SSH commands)
python scripts/log-manager.py status

# Expected output:
# 📊 Logging System Status
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# 🔧 Backend (Production):
#   Log Level: info
#   Log Directory: /var/log/terrainsim
#   Disk Usage: 8.4G (or similar)
#   Latest Logs:
#   -rw-r--r-- 1 ubuntu ubuntu 2.1M Jan 23 10:30 simulation-2026-01-23.log
#   ...
```

### 6. Test Log Capture from Production

**Objective**: Download production logs using Python scripts.

#### Capture Backend Logs

```bash
# Capture all backend logs from production
python scripts/capture-backend-logs.py production

# Or use unified manager
python scripts/log-manager.py capture-execution-backend production
```

**Expected Results**:
- [ ] Script connects via SSH successfully
- [ ] Logs downloaded to `logs/captured/backend/production-YYYY-MM-DD/`
- [ ] Files: `app-*.log`, `error-*.log`, `simulation-*.log`
- [ ] Summary shows file count and total size

#### Capture Frontend Logs

```bash
# Extract frontend logs from backend simulation log
python scripts/capture-frontend-logs.py production

# Or use unified manager
python scripts/log-manager.py capture-execution-frontend production
```

**Expected Results**:
- [ ] Script connects and downloads simulation log
- [ ] Frontend logs extracted to `logs/captured/frontend/frontend-logs-YYYY-MM-DD.json`
- [ ] JSON file contains array of frontend log entries
- [ ] Each entry has `source: "frontend"`

### 7. Test Dynamic Log Level Changes

**Objective**: Change production log level without restart.

#### Test via API Endpoint

```bash
# Query current log level
curl https://api.lmvcruz.work/admin/log-level

# Expected output:
# {"logLevel":"info","environment":"production"}

# Change log level to debug
curl -X POST https://api.lmvcruz.work/admin/log-level \
  -H "Content-Type: application/json" \
  -d '{"level":"debug"}'

# Expected output:
# {"message":"Log level updated to debug","currentLevel":"debug"}

# Verify change
curl https://api.lmvcruz.work/admin/log-level

# Change back to info
curl -X POST https://api.lmvcruz.work/admin/log-level \
  -H "Content-Type: application/json" \
  -d '{"level":"info"}'
```

#### Test via Python Script

```bash
# Change to debug level
python scripts/set-log-level.py production backend debug

# Expected output:
# 🔧 Setting backend log level to debug (production)...
# ✅ Log level updated via API to debug
# ✅ .env file updated (LOG_LEVEL=debug)
# ⚠️  For permanent changes, commit .env to repository

# Change back to info
python scripts/set-log-level.py production backend info
```

### 8. Test Log Filtering API

**Objective**: Query production logs using filter API.

#### Test Different Filters

```bash
# Get log statistics
curl "https://api.lmvcruz.work/api/logs/stats" | jq '.'

# Expected output: List of log files with metadata

# Filter by log level (errors only)
curl "https://api.lmvcruz.work/api/logs/filter?level=error&limit=10" | jq '.'

# Filter by source (frontend logs only)
curl "https://api.lmvcruz.work/api/logs/filter?source=frontend&limit=20" | jq '.'

# Search logs (find "simulation" mentions)
curl "https://api.lmvcruz.work/api/logs/filter?searchTerm=simulation&limit=50" | jq '.'

# Filter by component
curl "https://api.lmvcruz.work/api/logs/filter?component=terrain-generation&limit=10" | jq '.'
```

#### Test via Python Script

```bash
# Filter production logs by level
python scripts/filter-logs.py production level error

# Filter by search term
python scripts/filter-logs.py production searchTerm "generation"

# Filter by source
python scripts/filter-logs.py production source frontend 100
```

**Expected Results**:
- [ ] API returns filtered logs in JSON format
- [ ] Results match filter criteria
- [ ] Response includes `count` and `logs` array
- [ ] Logs are properly formatted with all fields

### 9. Test Log Cleanup Scripts

**Objective**: Verify cleanup scripts work safely on production.

#### Test Dry Run First

```bash
# Dry run - don't delete anything
python scripts/clean-backend-logs.py production --dry-run

# Expected output:
# 🧹 Cleaning backend logs older than 7 days (production)...
# 🔍 DRY RUN MODE - No files will be deleted
#
# Would delete:
#   /var/log/terrainsim/app-2026-01-10.log (14 days old)
#   /var/log/terrainsim/error-2026-01-12.log (12 days old)
#
# Total: 2 files, 45.2 MB
```

#### Actual Cleanup (Optional)

```bash
# Only run if you want to delete old logs
python scripts/clean-backend-logs.py production 14

# This will delete logs older than 14 days
```

### 10. End-to-End Integration Test

**Objective**: Complete workflow from frontend action to log capture.

#### Complete Test Flow

1. **Generate Frontend Activity**:
   - Open production site: https://terrainsim.pages.dev
   - Perform terrain generation
   - Navigate between pages
   - Trigger a few test actions

2. **Wait for Log Flush** (5-10 seconds for batching)

3. **Verify Backend Logs**:
   ```bash
   ssh ubuntu@54.242.131.12
   tail -50 /var/log/terrainsim/simulation-$(date +%Y-%m-%d).log | \
     grep '"source":"frontend"' | jq '.message'
   ```

4. **Capture Logs Locally**:
   ```bash
   python scripts/log-manager.py capture-execution-frontend production
   ```

5. **Filter Logs**:
   ```bash
   python scripts/filter-logs.py production source frontend 50
   ```

6. **Check System Status**:
   ```bash
   python scripts/log-manager.py status
   ```

#### Success Criteria

- [ ] Frontend logs visible in backend within 10 seconds
- [ ] Logs captured successfully to local machine
- [ ] Filter API returns correct results
- [ ] System status shows healthy state
- [ ] No errors in any step

## Common Issues & Troubleshooting

### Issue: Log Directory Permission Denied

**Symptoms**: Backend can't write to `/var/log/terrainsim/`

**Solution**:
```bash
ssh ubuntu@54.242.131.12
sudo chown -R ubuntu:ubuntu /var/log/terrainsim
sudo chmod 755 /var/log/terrainsim
pm2 restart terrainsim-api
```

### Issue: SSH Connection Fails

**Symptoms**: `ssh: connect to host 54.242.131.12 port 22: Connection refused`

**Solution**:
1. Verify EC2 instance is running
2. Check security group allows SSH (port 22)
3. Verify SSH key is correct: `~/.ssh/id_rsa` or `~/.ssh/id_ed25519`

### Issue: Frontend Logs Not Appearing

**Symptoms**: No logs with `"source":"frontend"` in backend

**Solution**:
1. Check browser console for errors
2. Verify API endpoint is correct in `.env.production`
3. Check CORS configuration on backend
4. Verify backend endpoint `/api/logs/frontend` is mounted
5. Check network tab in browser dev tools for failed requests

### Issue: Log Files Too Large

**Symptoms**: Disk space warning, large log files

**Solution**:
```bash
# Check disk usage
ssh ubuntu@54.242.131.12
du -sh /var/log/terrainsim/*

# Clean old logs
python scripts/clean-backend-logs.py production 7

# Or manually
ssh ubuntu@54.242.131.12
cd /var/log/terrainsim
rm *-2026-01-0*.log  # Delete logs from early January
```

### Issue: Log Level Changes Not Persisting

**Symptoms**: Log level resets after PM2 restart

**Solution**:
API changes are temporary. For permanent changes:
```bash
ssh ubuntu@54.242.131.12
cd /var/www/terrainsim
nano .env
# Update LOG_LEVEL=debug
pm2 restart terrainsim-api
```

## Production Testing Results Template

Document your test results:

```markdown
# Phase 3.2 Production Testing Results

**Date**: YYYY-MM-DD
**Tester**: Your Name

## Backend Deployment
- [ ] Backend deployed successfully
- [ ] Winston logging initialized
- [ ] Log files created in `/var/log/terrainsim/`
- [ ] PM2 status: ✅ online

## Frontend Deployment
- [ ] Frontend deployed to Cloudflare Pages
- [ ] Remote logger initialized
- [ ] Test logs sent to backend
- [ ] Logs visible in backend files

## SSH & Python Scripts
- [ ] SSH connection working
- [ ] log-manager.py status: ✅
- [ ] capture-backend-logs.py: ✅
- [ ] capture-frontend-logs.py: ✅
- [ ] clean-backend-logs.py --dry-run: ✅
- [ ] set-log-level.py: ✅

## API Endpoints
- [ ] GET /admin/log-level: ✅
- [ ] POST /admin/log-level: ✅
- [ ] GET /api/logs/stats: ✅
- [ ] GET /api/logs/filter: ✅
- [ ] POST /api/logs/frontend: ✅

## Issues Encountered
- None / [List any issues]

## Overall Status
✅ All tests passed
⚠️ Minor issues (document above)
❌ Major issues (document above)
```

## Next Steps

After completing Phase 3.2:
- [ ] Document any issues in troubleshooting guide
- [ ] Update retention policies if needed
- [ ] Proceed to Phase 3.3: Cloudflare Log Capture Testing
- [ ] Plan Phase 4: Documentation & Training

## References

- [LOGGING-INFRASTRUCTURE-PLAN.md](./LOGGING-INFRASTRUCTURE-PLAN.md)
- [phase-3.1-testing-guide.md](./phase-3.1-testing-guide.md)
- [production-logging-setup.md](./production-logging-setup.md)
- [Python Scripts Implementation](./python-scripts-implementation.md)
- [Backend API Endpoints](./backend-api-endpoints-implementation.md)
