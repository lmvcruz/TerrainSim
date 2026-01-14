# Backend CI/CD Setup Guide

**Delivery Block 3: Backend CI/CD Automation**  
**Date:** January 14, 2026  
**Status:** Implementation Complete

---

## 🎯 Overview

This guide explains how to set up automated backend deployment for TerrainSim using GitHub Actions with SSH authentication.

**Workflow Features:**
- ✅ Manual trigger via GitHub Actions UI
- ✅ Parameterized C++ addon rebuild (none/incremental/full)
- ✅ SSH authentication via webfactory/ssh-agent
- ✅ Automated health checks with 30 retries (60 seconds)
- ✅ Alert on failure (GitHub email + UptimeRobot monitoring)

---

## 🔑 Step 1: Add SSH Private Key to GitHub Secrets

### Prerequisites
- SSH key pair already created (`terrainsim-key.pem`)
- SSH access to server working locally (`ssh terrainsim`)

### Instructions

1. **Navigate to GitHub Repository Settings:**
   ```
   https://github.com/lmvcruz/TerrainSim/settings/secrets/actions
   ```

2. **Click "New repository secret"**

3. **Add SSH_PRIVATE_KEY:**
   
   **On Windows PowerShell:**
   ```powershell
   # Display the private key content
   Get-Content "$env:USERPROFILE\.ssh\terrainsim-key.pem"
   ```

   **Copy the entire output**, including:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpAIBAAKCAQEA...
   ...
   ...
   -----END RSA PRIVATE KEY-----
   ```

4. **In GitHub Secrets:**
   - **Name:** `SSH_PRIVATE_KEY`
   - **Value:** Paste the entire private key content
   - Click **Add secret**

### Verification

Test that the key works locally:
```powershell
# Test SSH connection
ssh -i "$env:USERPROFILE\.ssh\terrainsim-key.pem" ubuntu@54.242.131.12 "echo 'SSH working'"

# Or using alias
ssh terrainsim "echo 'Alias working'"
```

---

## 🚀 Step 2: Trigger Manual Deployment

### Via GitHub Actions UI

1. **Navigate to Actions tab:**
   ```
   https://github.com/lmvcruz/TerrainSim/actions/workflows/deploy-backend.yml
   ```

2. **Click "Run workflow" button** (top right)

3. **Select options:**
   - **Branch:** `main` (default)
   - **Rebuild C++ addon:** Choose from dropdown:
     - `none` (default) - Just code update + restart (~30 seconds)
     - `incremental` - Rebuild changed C++ files (~1-2 minutes)
     - `full` - Clean rebuild from scratch (~3-4 minutes)

4. **Click "Run workflow"** (green button)

5. **Watch progress** in real-time:
   - Click the running workflow
   - See each step's output
   - Health check will show 30 retry attempts

### Expected Timeline

| Rebuild Option | Total Time | Use When |
|---------------|------------|----------|
| **none** | ~30 sec | Only TypeScript/JavaScript changes |
| **incremental** | ~1-2 min | C++ code changes in libs/core |
| **full** | ~3-4 min | CMakeLists.txt changes, new files, or broken build |

---

## 📋 Workflow Steps Explained

### Step 1: Checkout Repository
```yaml
- uses: actions/checkout@v4
```
Downloads your code to GitHub Actions runner.

### Step 2: Setup SSH Agent
```yaml
- uses: webfactory/ssh-agent@v0.9.0
  with:
    ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
```
Loads SSH key into agent for passwordless authentication.

### Step 3: Add Server to Known Hosts
```yaml
- run: ssh-keyscan -H 54.242.131.12 >> ~/.ssh/known_hosts
```
Prevents "Host key verification failed" error.

### Step 4: Pull Latest Code
```bash
cd /var/www/terrainsim
git pull origin main
pnpm install
```
Updates code and dependencies on production server.

### Step 5: Rebuild C++ Addon (Conditional)
- **If `rebuild: incremental`:**
  ```bash
  cmake --build build --config Release
  ```
  Recompiles only changed `.cpp` files.

- **If `rebuild: full`:**
  ```bash
  rm -rf build
  cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
  cmake --build build --config Release
  ```
  Deletes build directory and compiles everything from scratch.

### Step 6: Restart PM2
```bash
pm2 restart terrainsim-api
```
Restarts Node.js process with new code.

### Step 7: Wait for PM2 Restart
```bash
sleep 10
```
Gives PM2 time to fully restart the process.

### Step 8: Health Check (30 Retries)
```bash
for i in {1..30}; do
  if curl -f -s https://api.lmvcruz.work/health; then
    echo "✅ Deployment successful!"
    exit 0
  fi
  sleep 2
done
echo "❌ Health check failed"
exit 1
```

**What this does:**
- Tries 30 times over 60 seconds
- Calls `https://api.lmvcruz.work/health`
- Succeeds if endpoint returns 200 OK
- Fails if endpoint never responds

**If health check fails:**
- ❌ Workflow marked as failed
- 📧 GitHub sends failure email
- 🚨 UptimeRobot detects downtime and sends email alert
- 🔍 You investigate via logs: `ssh terrainsim "pm2 logs terrainsim-api"`

---

## 🏥 Health Check Endpoint

**URL:** `https://api.lmvcruz.work/health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T10:30:00.000Z"
}
```

**What it verifies:**
- ✅ Server is running
- ✅ Node.js process is alive
- ✅ Express server is responding
- ✅ nginx reverse proxy working
- ✅ SSL certificate valid
- ✅ Public internet routing working

---

## 🔍 Troubleshooting

### Workflow Fails: "Permission denied (publickey)"

**Cause:** SSH_PRIVATE_KEY secret not configured or incorrect.

**Solution:**
1. Verify secret exists: `https://github.com/lmvcruz/TerrainSim/settings/secrets/actions`
2. Re-add SSH_PRIVATE_KEY with correct key content
3. Ensure you copied **entire key** including BEGIN/END lines

### Workflow Fails: "Health check failed after 60 seconds"

**Cause:** Service didn't start properly after deployment.

**Solution:**
1. SSH into server: `ssh terrainsim`
2. Check PM2 status: `pm2 status`
3. Check logs: `pm2 logs terrainsim-api --lines 50`
4. Look for errors (missing dependencies, build failures, etc.)
5. Fix issue and trigger deployment again

### Health Check Passes but Service Broken

**Cause:** Health endpoint works but actual functionality broken.

**Solution:**
- UptimeRobot monitors multiple endpoints (`/health`, `/generate`, WebSocket)
- If `/generate` or WebSocket fail, you'll get email alert
- Check PM2 logs for runtime errors

### Build Fails: "cmake: command not found"

**Cause:** Server missing build dependencies.

**Solution:**
```bash
ssh terrainsim
sudo apt-get update
sudo apt-get install -y cmake build-essential
```

---

## 📊 Monitoring & Alerts

### GitHub Actions
- **Email on failure:** Automatic from GitHub
- **View logs:** Actions tab → Click workflow run
- **Re-run failed:** Click "Re-run jobs" button

### UptimeRobot (Already Configured - Block 2)
- **Monitors:** `/health`, `/generate`, WebSocket, frontend
- **Check interval:** 5 minutes
- **Email alerts:** lmvcruz@gmail.com
- **Flood prevention:** 10-min confirmation, 6-hour re-alert

### PM2 Logs (Already Configured - Block 2)
- **View logs:** `ssh terrainsim "pm2 logs terrainsim-api"`
- **Error logs:** `ssh terrainsim "pm2 logs terrainsim-api --err"`
- **Log files:** `/var/www/terrainsim/logs/`
- **Rotation:** 90 days, 100MB max, gzip compression

---

## 🎓 Usage Recommendations

### When to Use Each Rebuild Option

**Choose `none` when:**
- ✅ Only changed TypeScript files in `apps/simulation-api/`
- ✅ Only changed frontend code
- ✅ Updated documentation
- ✅ Changed configuration files (ecosystem.config.js, etc.)

**Choose `incremental` when:**
- ✅ Modified `.cpp` or `.hpp` files in `libs/core/`
- ✅ Changed C++ erosion algorithm
- ✅ Added new C++ methods to existing classes
- ✅ You're confident incremental build will work

**Choose `full` when:**
- ✅ Modified `CMakeLists.txt`
- ✅ Added new `.cpp` files to project
- ✅ Changed build configuration (Release/Debug)
- ✅ Incremental build failed or behaving strangely
- ✅ Want to ensure completely clean build

### Deployment Frequency

**Recommended:** Deploy after each completed feature or bug fix.

**Avoid:** Deploying during:
- Active users on site (check analytics first)
- Middle of testing/debugging session
- Unfinished features (commit to branch, not main)

---

## 🔮 Future Improvements (Iteration 4 - Block 7)

### Planned for DEPLOY-041:

**Automatic Deployment Trigger:**
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'apps/simulation-api/**'
      - 'libs/core/**'
```

**Smart Rebuild Detection:**
- Automatically detect which files changed
- Choose incremental vs full based on file patterns
- Skip rebuild if only JavaScript changed

**Enhanced Failure Handling:**
- Retry deployment once if health check fails
- More sophisticated rollback strategies
- Deployment status dashboard

---

## ✅ Completion Checklist

**Before first deployment:**
- [ ] SSH_PRIVATE_KEY added to GitHub Secrets
- [ ] Verified SSH key works locally
- [ ] UptimeRobot configured and monitoring
- [ ] PM2 logs confirmed working

**First deployment test:**
- [ ] Trigger workflow with `rebuild: none`
- [ ] Watch workflow complete successfully
- [ ] Verify health check passes
- [ ] Test frontend: https://terrainsim.lmvcruz.work
- [ ] Test API: https://api.lmvcruz.work/health
- [ ] Check PM2 logs for any warnings

**After successful deployment:**
- [ ] Mark DEPLOY-024, DEPLOY-025, DEPLOY-027 as complete
- [ ] Document any issues encountered
- [ ] Share deployment process with team

---

## 📞 Support

**Issues with deployment?**
1. Check workflow logs in GitHub Actions
2. SSH into server: `ssh terrainsim`
3. Check PM2 logs: `pm2 logs terrainsim-api`
4. Review UptimeRobot dashboard for health status
5. Check PM2 status: `pm2 status`

**Common commands:**
```bash
# View running deployment
ssh terrainsim "pm2 status"

# Check recent logs
ssh terrainsim "pm2 logs terrainsim-api --lines 30"

# Restart manually if needed
ssh terrainsim "pm2 restart terrainsim-api"

# Check git status on server
ssh terrainsim "cd /var/www/terrainsim && git status"
```

---

**Documentation Status:** ✅ Complete  
**Last Updated:** January 14, 2026  
**Next Review:** Iteration 4, Block 7 (Deployment Resilience Discussion)
