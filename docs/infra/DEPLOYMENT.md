# TerrainSim Deployment Guide

## 🌐 Live URLs

- **Frontend**: https://terrainsim.lmvcruz.work
- **Backend API**: https://api.lmvcruz.work
- **Health Check**: https://api.lmvcruz.work/health

---

## 📋 Overview

TerrainSim uses a split deployment architecture:

- **Frontend** → Cloudflare Pages (automatic Git deployment)
- **Backend** → AWS EC2 t3.micro (manual SSH deployment)
- **CI/CD** → GitHub Actions (automated testing only)

---

## 🎨 Frontend Deployment (Cloudflare Pages)

### How It Works
Cloudflare Pages is configured with **Git integration** - it automatically deploys on every push to `main`.

### Setup (Already Configured)
1. Cloudflare Pages project: `terrainsim`
2. Connected to GitHub: `lmvcruz/TerrainSim`
3. Build settings:
   - Framework: None
   - Build command: `pnpm install && pnpm --filter @terrain/web run build`
   - Output directory: `apps/web/dist`
4. Custom domain: `terrainsim.lmvcruz.work`

### To Deploy Frontend
**Just push to `main` branch** - Cloudflare automatically:
- Detects the push
- Runs the build
- Deploys to production
- Updates https://terrainsim.lmvcruz.work

**No manual action needed!** ✨

---

## 🖥️ Backend Deployment (AWS EC2)

### Server Details
- **Instance**: AWS EC2 t3.micro
- **OS**: Ubuntu 22.04 LTS
- **IP**: 54.242.131.12
- **SSH**: `ssh terrainsim` (alias configured)
- **Path**: `/var/www/terrainsim`

### Technology Stack
- **Process Manager**: PM2 with systemd
- **Web Server**: nginx (reverse proxy + SSL termination)
- **Runtime**: Node.js 20.19.6
- **Package Manager**: pnpm 10.28.0
- **TypeScript**: tsx 4.21.0 (direct execution, no build step)
- **SSL**: Let's Encrypt with auto-renewal

### Manual Deployment Steps

#### Quick Deployment (if only code changed)
```bash
ssh terrainsim "cd /var/www/terrainsim && git pull && pnpm install && pm2 restart terrainsim-api"
```

#### Full Deployment Process

**1. SSH into server**
```bash
ssh terrainsim
```

**2. Navigate to project**
```bash
cd /var/www/terrainsim
```

**3. Pull latest code**
```bash
git pull origin main
```

**4. Install/update dependencies**
```bash
pnpm install
```

**5. Rebuild C++ addon (if core library changed)**
```bash
cd libs/core
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
cd ../..
```

**6. Restart backend**
```bash
pm2 restart terrainsim-api
```

**7. Verify deployment**
```bash
pm2 status
pm2 logs terrainsim-api --lines 20
curl http://localhost:3001/health
```

---

## 🧪 CI/CD Pipeline

### Continuous Integration: `ci.yml`

**Triggers**: Every push to `main` and all pull requests

**Frontend Tests:**
- ✅ TypeScript type checking (`pnpm typecheck`)
- ✅ Build validation (catches unused code)
- ✅ Vitest unit tests

**Backend Tests:**
- ✅ CMake configuration
- ✅ C++ compilation (Release mode)
- ✅ CTest unit tests (Google Test)

### Continuous Deployment

**Frontend**: Automatic via Cloudflare Pages Git integration (every push to `main`)

**Backend**: Manual trigger via GitHub Actions workflow

#### Backend Automated Deployment (`deploy-backend.yml`)

**How to Deploy:**

1. Navigate to **Actions** tab: `https://github.com/lmvcruz/TerrainSim/actions/workflows/deploy-backend.yml`
2. Click **"Run workflow"** button (top right)
3. Select options:
   - **Branch**: `main` (default)
   - **Rebuild C++ addon**:
     - `none` (default) - Code update only (~30 seconds)
     - `incremental` - Rebuild changed C++ files (~1-2 minutes)
     - `full` - Clean rebuild from scratch (~3-4 minutes)
4. Click **"Run workflow"** (green button)
5. Watch progress in real-time

**Deployment Steps:**
1. ✅ Checkout repository
2. ✅ Setup SSH agent with GitHub Secret `SSH_PRIVATE_KEY`
3. ✅ Add server to known hosts
4. ✅ Pull latest code: `git pull origin main && pnpm install`
5. ✅ Rebuild C++ addon (if selected)
6. ✅ Restart PM2: `pm2 restart terrainsim-api`
7. ✅ Health check with 30 retries (60 seconds)

**Health Check:**
- Endpoint: `https://api.lmvcruz.work/health`
- Expected: `{"status": "ok", "timestamp": "..."}`
- Retries: 30 attempts over 60 seconds
- Failure: Workflow fails, email alert sent

**When to Use Each Rebuild Option:**
- **`none`**: Only TypeScript/JavaScript changes
- **`incremental`**: Modified C++ files in `libs/core/`
- **`full`**: CMakeLists.txt changes, new C++ files, or broken incremental build

---

## 🔧 Backend Architecture

### PM2 Configuration

**Config file**: `/var/www/terrainsim/ecosystem.config.cjs`

```javascript
module.exports = {
  apps: [{
    name: 'terrainsim-api',
    script: '/var/www/terrainsim/start-api.sh',
    cwd: '/var/www/terrainsim',
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/terrainsim/error.log',
    out_file: '/var/log/terrainsim/out.log',
    time: true
  }]
};
```

**Start script**: `/var/www/terrainsim/start-api.sh`
```bash
#!/bin/bash
cd /var/www/terrainsim/apps/simulation-api
exec /var/www/terrainsim/node_modules/.bin/tsx src/index.ts
```

**PM2 Commands:**
```bash
pm2 status                    # Check status
pm2 logs terrainsim-api       # View logs
pm2 restart terrainsim-api    # Restart
pm2 stop terrainsim-api       # Stop
pm2 start ecosystem.config.cjs # Start
```

### nginx Configuration

**Config file**: `/etc/nginx/sites-available/terrainsim`

- Port 80: HTTP → HTTPS redirect
- Port 443: HTTPS → proxy to `localhost:3001`
- SSL: Let's Encrypt certificates
- WebSocket: Special handling for `/socket.io/`

**nginx Commands:**
```bash
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload config
sudo systemctl status nginx   # Check status
```

**Logs:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 Monitoring & Health Checks

### Check Backend Status
```bash
# PM2 status
ssh terrainsim "pm2 status"

# Recent logs
ssh terrainsim "pm2 logs terrainsim-api --lines 50 --nostream"

# Health check
curl https://api.lmvcruz.work/health
```

### Check SSL Certificate
```bash
ssh terrainsim "sudo certbot certificates"
```

### Check nginx Logs
```bash
ssh terrainsim "sudo tail -50 /var/log/nginx/access.log"
ssh terrainsim "sudo tail -50 /var/log/nginx/error.log"
```

---

## 🚨 Troubleshooting

### Backend Not Responding

**1. Check PM2 status**
```bash
ssh terrainsim "pm2 status"
```

**2. Check logs**
```bash
ssh terrainsim "pm2 logs terrainsim-api --err"
```

**3. Test locally**
```bash
ssh terrainsim "curl http://localhost:3001/health"
```

**4. Restart backend**
```bash
ssh terrainsim "pm2 restart terrainsim-api"
```

### Port 3001 Already in Use

```bash
ssh terrainsim "lsof -ti:3001 | xargs kill -9 && pm2 restart terrainsim-api"
```

### CORS Errors in Browser

Backend CORS is configured for:
- `http://localhost:5173` (local development)
- `https://terrainsim.lmvcruz.work` (production)
- `https://*.terrainsim.pages.dev` (Cloudflare preview URLs)

Check [apps/simulation-api/src/index.ts](../apps/simulation-api/src/index.ts) for `isAllowedOrigin()` function.

### SSL Certificate Expired

```bash
ssh terrainsim "sudo certbot renew && sudo systemctl reload nginx"
```

### C++ Addon Fails to Load

```bash
ssh terrainsim "cd /var/www/terrainsim/libs/core && rm -rf build && cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build --config Release"
```

---

## 💰 Cost Breakdown

### Year 1 (AWS Free Tier)
- **EC2 t3.micro**: Free for 12 months (750 hours/month)
- **30 GiB EBS Storage**: Free for 12 months
- **Cloudflare Pages**: Free forever (unlimited)
- **Domain (lmvcruz.work)**: ~$12/year
- **Total Year 1**: ~$12/year

### Year 2+ (After Free Tier Expires)
- **EC2 t3.micro**: ~$7.50/month = $90/year
- **30 GiB EBS Storage**: ~$3/year
- **Data Transfer**: ~$1/month = $12/year
- **Cloudflare Pages**: Free forever
- **Domain**: ~$12/year
- **Total Year 2+**: ~$117/year (~$10/month)

---

## 🔄 Future Improvements

### 1. Automate Backend Deployment

**Current State**: Manual SSH deployment

**Options to Automate**:

**Option A: Fix GitHub Actions SSH Deployment**
- Use `webfactory/ssh-agent` action
- Base64-encode SSH key in GitHub Secret
- Auto-deploy on push to `main`

**Option B: AWS CodeDeploy**
- Native AWS CI/CD service
- Integrates with GitHub
- More complex setup

**Option C: Docker + AWS ECS**
- Containerize application
- Use Elastic Container Service
- Better scalability (higher cost)

### 2. Scaling Recommendations

**When traffic increases:**

**Level 1: PM2 Cluster Mode**
```javascript
// ecosystem.config.cjs
exec_mode: 'cluster',
instances: 'max', // Use all CPU cores
```

**Level 2: Larger EC2 Instance**
- Upgrade from t3.micro (1 vCPU, 1GB RAM)
- To t3.small (2 vCPU, 2GB RAM) or t3.medium (2 vCPU, 4GB RAM)

**Level 3: Load Balancer + Multiple Instances**
- AWS Application Load Balancer
- Multiple EC2 instances
- Auto-scaling group

**Level 4: Serverless**
- AWS Lambda for API (if C++ addon can be removed)
- S3 + CloudFront for frontend
- DynamoDB for data storage

---

## 📝 Important Notes

### tsx Dependency
- **Must be in `dependencies`, NOT `devDependencies`**
- PM2 needs it in production to run TypeScript files
- See [apps/simulation-api/package.json](../apps/simulation-api/package.json)

### C++ Native Addon
- Must be rebuilt on the server (platform-specific binary)
- Cannot be copied from local machine
- Requires cmake and build-essential on server

### PM2 Systemd Integration
- PM2 auto-starts on server reboot
- Configured via: `pm2 startup systemd && pm2 save`
- Status: `systemctl status pm2-ubuntu`

### Let's Encrypt SSL
- Auto-renewal configured via certbot
- Runs twice daily via systemd timer
- Certificates valid for 90 days
- Check: `sudo certbot certificates`

### Cloudflare Proxy
- DNS record for `api.lmvcruz.work` is **proxied** (orange cloud)
- Provides DDoS protection and caching
- Traffic goes: Client → Cloudflare → nginx → PM2

---

## 🏗️ Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Cloudflare Network                         │
│                                                               │
│  ┌─────────────────────────┐  ┌────────────────────────┐    │
│  │  Cloudflare Pages       │  │  Cloudflare Proxy      │    │
│  │  (Frontend)             │  │  (DNS + DDoS)          │    │
│  │  terrainsim.lmvcruz.work│  │  api.lmvcruz.work      │    │
│  │  [Auto Git Deploy]      │  │  [Orange Cloud]        │    │
│  └─────────────────────────┘  └────────┬───────────────┘    │
│                                         │                     │
└─────────────────────────────────────────┼─────────────────────┘
                                          │ HTTPS
                                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    AWS EC2 (54.242.131.12)                    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  nginx (Reverse Proxy + SSL)                         │   │
│  │  • Port 80 → 443 redirect                            │   │
│  │  • Port 443 → localhost:3001                         │   │
│  │  • Let's Encrypt SSL                                 │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  PM2 Process Manager                                 │   │
│  │  • terrainsim-api (PID: dynamic)                     │   │
│  │  • Auto-restart on crash                             │   │
│  │  • Systemd integration                               │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  tsx (TypeScript Runtime)                            │   │
│  │  • Direct .ts execution                              │   │
│  │  • No build step needed                              │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  Express + Socket.IO Server                          │   │
│  │  • Port 3001                                         │   │
│  │  • REST API: /health, /generate                      │   │
│  │  • WebSocket: /socket.io                             │   │
│  │  • Loads C++ addon                                   │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  terrain_erosion_native.node                         │   │
│  │  • C++ Native Addon (Node-API)                       │   │
│  │  • Hydraulic Erosion Simulation                      │   │
│  │  • Built with cmake                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 📚 Related Documentation

- [AWS EC2 Setup Guide](./AWS_DEPLOYMENT_GUIDE.md) - Full EC2 server setup
- [C++ Integration](./CPP_EROSION_INTEGRATION_SUMMARY.md) - Native addon details
- [API Documentation](../apps/simulation-api/README.md) - Backend endpoints

---

**Last Updated**: January 13, 2026
**Status**: ✅ Production Deployment Live
