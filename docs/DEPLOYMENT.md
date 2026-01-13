# Cloudflare Deployment Guide

Complete guide for deploying TerrainSim to production using Cloudflare Pages (frontend) and a custom server (backend).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Network                       │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Cloudflare Pages (Frontend)                │     │
│  │  • React + Vite static site                        │     │
│  │  • CDN-distributed globally                        │     │
│  │  • Auto SSL/TLS                                    │     │
│  │  • https://terrainsim.yourdomain.com               │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          │ HTTPS + WebSocket                │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Cloudflare DNS & Proxy                     │     │
│  │  • DDoS protection                                 │     │
│  │  • SSL/TLS termination                             │     │
│  │  • Caching & optimization                          │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Your Server (VM/VPS/Cloud)                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Nginx Reverse Proxy                        │     │
│  │  • HTTPS → Backend                                 │     │
│  │  • WebSocket upgrade                               │     │
│  │  • Let's Encrypt SSL                               │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Node.js API Server (PM2)                   │     │
│  │  • Express + Socket.io                             │     │
│  │  • C++ Native Addon (HydraulicErosion)             │     │
│  │  • api.terrainsim.yourdomain.com:3001              │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

**Why not Cloudflare Workers for backend?**
- Native Node-API addons (our C++ erosion engine) cannot run on Workers
- Workers don't support native modules or system-level operations
- Alternative: WebAssembly version (future enhancement)

---

## Prerequisites

### Required Accounts
- ✅ **GitHub Account** - For repository and GitHub Actions
- ✅ **Cloudflare Account** - For Pages and DNS (you have this)
- ✅ **Domain Name** - Registered and added to Cloudflare (you have this)
- ⚠️ **Server/VPS** - For backend (DigitalOcean, AWS, Hetzner, etc.)

### Local Development Tools
- Node.js 20+
- pnpm 8+
- Git
- SSH client

### Server Requirements
- **OS:** Ubuntu 22.04 LTS (recommended) or Debian 12
- **CPU:** 2+ cores (4+ recommended)
- **RAM:** 4GB minimum (8GB recommended)
- **Storage:** 50GB SSD minimum
- **Network:** Static IP address, ports 80/443/22 open

---

## Part 1: Frontend Deployment (Cloudflare Pages)

### Step 1: Prepare Cloudflare Pages Project

1. **Login to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com
   - Select your account

2. **Create Pages Project**
   - Go to **Workers & Pages** → **Pages**
   - Click **Create application**
   - Choose **Connect to Git**
   - Authorize GitHub access
   - Select repository: `lmvcruz/TerrainSim`
   - Click **Begin setup**

3. **Configure Build Settings**
   ```yaml
   Project name: terrainsim (or your choice)
   Production branch: main
   Build command: pnpm install && pnpm --filter @terrain/web run build
   Build output directory: apps/web/dist
   Root directory: (leave empty)
   ```

4. **Environment Variables**
   Click **Environment variables** and add:
   ```
   VITE_API_URL=https://api.yourdomain.com
   VITE_WS_URL=wss://api.yourdomain.com
   ```

   ⚠️ **Replace `yourdomain.com` with your actual domain**

5. **Advanced Settings**
   - **Node.js version:** `20`
   - **Environment:** `Production`

6. **Save and Deploy**
   - Click **Save and Deploy**
   - Wait 2-5 minutes for first deployment
   - You'll get a temporary URL: `https://terrainsim-xxx.pages.dev`

### Step 2: Configure Custom Domain

1. **Add Custom Domain**
   - In your Pages project, go to **Custom domains**
   - Click **Set up a custom domain**
   - Enter: `terrainsim.yourdomain.com` (or your preferred subdomain)
   - Click **Continue**

2. **DNS Configuration (Automatic)**
   - Cloudflare will automatically create DNS records
   - Wait 1-5 minutes for DNS propagation
   - SSL certificate provisions automatically (up to 24 hours, usually <15 minutes)

3. **Verify Deployment**
   ```bash
   curl -I https://terrainsim.yourdomain.com
   # Should return 200 OK with SSL
   ```

### Step 3: Update Frontend Code (if needed)

If you need to configure the API URLs in code:

```typescript
// apps/web/src/config.ts (create if doesn't exist)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
```

Use in your app:
```typescript
import { API_URL, WS_URL } from './config';
const socket = io(WS_URL);
```

---

## Part 2: Backend Server Setup

### Step 1: Provision Server

**Option A: DigitalOcean (Recommended for beginners)**
1. Create account at https://digitalocean.com
2. Create Droplet:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic ($24/mo) - 4GB RAM, 2 vCPUs
   - **Region:** Choose closest to your users
   - **Authentication:** SSH key (add your public key)
3. Note the public IP address

**Option B: AWS EC2**
1. Launch EC2 instance: `t3.medium` (2 vCPU, 4GB RAM)
2. **AMI:** Ubuntu 22.04 LTS
3. Configure security group: Allow ports 22, 80, 443
4. Create/use SSH key pair

**Option C: Hetzner (Most cost-effective)**
1. Create account at https://hetzner.com
2. Order Cloud Server: CX32 (€12/mo) - 4GB RAM, 2 vCPUs
3. **Image:** Ubuntu 22.04
4. Add SSH key

### Step 2: Initial Server Configuration

SSH into your server:
```bash
ssh root@YOUR_SERVER_IP
```

**Update system:**
```bash
apt update && apt upgrade -y
```

**Create deployment user:**
```bash
adduser deploy
usermod -aG sudo deploy
# Set password when prompted
```

**Add SSH key for deploy user:**
```bash
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

**Test deploy user:**
```bash
exit  # Exit root session
ssh deploy@YOUR_SERVER_IP  # Should work without password
```

### Step 3: Install Dependencies

As deploy user:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools for C++ addon
sudo apt install -y build-essential cmake g++ git

# Install nginx
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 (Node.js process manager)
sudo npm install -g pm2

# Verify installations
node --version    # Should be v20.x
npm --version
cmake --version
nginx -v
pm2 --version
```

### Step 4: Clone and Build Application

```bash
# Create application directory
sudo mkdir -p /var/www/terrainsim
sudo chown deploy:deploy /var/www/terrainsim
cd /var/www/terrainsim

# Clone repository
git clone https://github.com/lmvcruz/TerrainSim.git .

# Install dependencies
npm install -g pnpm
pnpm install

# Build C++ native addon
cd libs/core/bindings/node
npm install
npm run build
cd ../../../..

# Build API (if needed)
cd apps/simulation-api
pnpm run build  # If you have a build step
cd ../..
```

**Verify native addon built:**
```bash
ls -lh libs/core/bindings/node/build/Release/terrain_erosion_native.node
# Should show the compiled .node file
```

### Step 5: Configure Environment Variables

Create environment file:
```bash
nano /var/www/terrainsim/apps/simulation-api/.env
```

Add:
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://terrainsim.yourdomain.com
```

Save and exit (Ctrl+X, Y, Enter)

### Step 6: Configure PM2

Create PM2 ecosystem file:
```bash
nano /var/www/terrainsim/ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'terrainsim-api',
    cwd: '/var/www/terrainsim/apps/simulation-api',
    script: 'src/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: '/var/log/terrainsim/error.log',
    out_file: '/var/log/terrainsim/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
```

Create log directory:
```bash
sudo mkdir -p /var/log/terrainsim
sudo chown deploy:deploy /var/log/terrainsim
```

Start application:
```bash
cd /var/www/terrainsim
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the command it outputs
```

Verify it's running:
```bash
pm2 status
pm2 logs terrainsim-api
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Step 7: Configure Nginx Reverse Proxy

Create nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/terrainsim
```

Add:
```nginx
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - API Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # CORS headers (if needed, PM2 app handles this)
    # add_header Access-Control-Allow-Origin "https://terrainsim.yourdomain.com" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

**⚠️ Replace `api.yourdomain.com` with your actual domain**

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/terrainsim /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
```

### Step 8: Configure DNS for Backend

1. **Login to Cloudflare Dashboard**
2. **Select your domain**
3. **Go to DNS → Records**
4. **Add A record:**
   ```
   Type: A
   Name: api
   IPv4 address: YOUR_SERVER_IP
   Proxy status: Proxied (orange cloud)
   TTL: Auto
   ```
5. **Click Save**

Verify DNS propagation:
```bash
dig api.yourdomain.com
# Should return your server IP
```

### Step 9: Configure SSL with Let's Encrypt

**IMPORTANT:** Wait 5-10 minutes after DNS change before running certbot.

```bash
# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose: 2 (Redirect HTTP to HTTPS)
```

Certbot will:
- Obtain SSL certificate
- Modify nginx config automatically
- Set up auto-renewal

**Test auto-renewal:**
```bash
sudo certbot renew --dry-run
```

**Reload nginx:**
```bash
sudo systemctl reload nginx
```

### Step 10: Verify Backend Deployment

```bash
# Test health endpoint
curl https://api.yourdomain.com/health
# Should return: {"status":"ok",...}

# Test from browser
# Navigate to: https://api.yourdomain.com/health

# Check PM2 status
pm2 status
pm2 logs terrainsim-api --lines 50
```

---

## Part 3: GitHub Actions CI/CD

### Step 1: Set Up GitHub Secrets

1. **Go to your repository on GitHub**
2. **Settings → Secrets and variables → Actions**
3. **Click "New repository secret"**

Add these secrets:

**For Cloudflare Pages:**
```
CLOUDFLARE_API_TOKEN
```
- Get from: Cloudflare Dashboard → My Profile → API Tokens
- Create token with permissions: "Cloudflare Pages — Edit"

**For Server Deployment:**
```
SERVER_HOST = YOUR_SERVER_IP
SERVER_USER = deploy
SERVER_SSH_KEY = (your private SSH key content)
SERVER_DEPLOY_PATH = /var/www/terrainsim
```

To get your SSH private key:
```bash
cat ~/.ssh/id_rsa
# Copy entire output including BEGIN/END lines
```

### Step 2: Create Frontend Deployment Workflow

Create file: `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend to Cloudflare Pages

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Cloudflare Pages

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build frontend
        run: pnpm --filter @terrain/web run build
        env:
          VITE_API_URL: https://api.yourdomain.com
          VITE_WS_URL: wss://api.yourdomain.com

      - name: Publish to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: terrainsim
          directory: apps/web/dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}

      - name: Smoke Test
        run: |
          sleep 10
          curl -f https://terrainsim.yourdomain.com || exit 1
```

### Step 3: Create Backend Deployment Workflow

Create file: `.github/workflows/deploy-backend.yml`

```yaml
name: Deploy Backend to Server

on:
  push:
    branches: [main]
    paths:
      - 'apps/simulation-api/**'
      - 'libs/core/**'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Production Server

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd ${{ secrets.SERVER_DEPLOY_PATH }}

            # Pull latest code
            git fetch origin
            git reset --hard origin/main

            # Install/update dependencies
            pnpm install

            # Rebuild C++ addon if core changed
            cd libs/core/bindings/node
            npm install
            npm run build
            cd ../../../..

            # Restart application with zero downtime
            pm2 reload ecosystem.config.js --update-env

            # Wait for health check
            sleep 5
            curl -f http://localhost:3001/health || exit 1

            echo "Deployment successful!"

      - name: Health Check
        run: |
          sleep 10
          curl -f https://api.yourdomain.com/health || exit 1
```

### Step 4: Test Automated Deployment

```bash
# Make a small change to trigger deployment
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger deployment"
git push origin main
```

Watch the Actions tab on GitHub to see deployments in progress.

---

## Part 4: Monitoring & Maintenance

### Monitor Application Logs

```bash
# SSH into server
ssh deploy@YOUR_SERVER_IP

# Watch PM2 logs
pm2 logs terrainsim-api

# View specific lines
pm2 logs terrainsim-api --lines 100

# Monitor in real-time
pm2 monit
```

### Check Application Status

```bash
pm2 status
pm2 describe terrainsim-api
```

### Restart Application

```bash
pm2 restart terrainsim-api

# Or reload with zero downtime
pm2 reload terrainsim-api
```

### View Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Renewal

Certificates auto-renew via cron. To manually renew:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## Troubleshooting

### Frontend Issues

**Problem:** Frontend not updating after deployment
```bash
# Clear Cloudflare cache
# Dashboard → Caching → Purge Everything
```

**Problem:** API connection errors in browser console
- Check `VITE_API_URL` and `VITE_WS_URL` in Cloudflare Pages environment variables
- Verify CORS settings in backend

### Backend Issues

**Problem:** PM2 app not starting
```bash
pm2 logs terrainsim-api --err
# Check for errors in output
```

**Problem:** Native addon build fails
```bash
cd /var/www/terrainsim/libs/core/bindings/node
npm run clean
npm install
npm run build
# Check for C++ compiler errors
```

**Problem:** WebSocket connections failing
- Check nginx WebSocket configuration
- Verify `proxy_set_header Upgrade` and `Connection 'upgrade'` headers
- Check firewall allows port 443

### DNS/SSL Issues

**Problem:** SSL certificate not provisioning
```bash
# Check DNS propagation
dig api.yourdomain.com

# Manual certbot
sudo certbot certonly --nginx -d api.yourdomain.com
```

**Problem:** Mixed content warnings
- Ensure all API calls use HTTPS
- Check browser console for specific URLs

---

## Performance Optimization

### Enable Cloudflare Features

1. **Speed → Optimization**
   - Auto Minify: HTML, CSS, JS ✅
   - Brotli: ✅
   - Early Hints: ✅

2. **Caching → Configuration**
   - Caching Level: Standard
   - Browser Cache TTL: 4 hours

3. **Speed → Performance**
   - HTTP/2: ✅
   - HTTP/3 (QUIC): ✅
   - 0-RTT Connection Resumption: ✅

### Nginx Performance Tuning

```bash
sudo nano /etc/nginx/nginx.conf
```

Add in `http` block:
```nginx
# Worker processes
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # ... existing config ...

    # Keep-alive connections
    keepalive_timeout 65;
    keepalive_requests 100;

    # Client body buffer
    client_body_buffer_size 128k;
    client_max_body_size 10m;
}
```

Reload nginx:
```bash
sudo systemctl reload nginx
```

---

## Rollback Procedure

### Frontend Rollback

1. Go to Cloudflare Pages → Your Project
2. Click **Deployments**
3. Find previous successful deployment
4. Click **⋯ → Rollback to this deployment**

### Backend Rollback

```bash
ssh deploy@YOUR_SERVER_IP
cd /var/www/terrainsim

# Find previous commit
git log --oneline -n 10

# Rollback to specific commit
git reset --hard COMMIT_HASH

# Rebuild if needed
cd libs/core/bindings/node
npm run build
cd ../../../..

# Restart
pm2 reload terrainsim-api
```

---

## Cost Estimate

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| **Cloudflare Pages** | Free tier | $0 (500 builds/mo) |
| **Cloudflare DNS** | Free | $0 |
| **DigitalOcean Droplet** | 4GB RAM, 2 vCPU | $24 |
| **Let's Encrypt SSL** | Free | $0 |
| **GitHub Actions** | 2000 min/mo free | $0 |
| **Total** | | **~$24/month** |

Alternative cheaper servers:
- **Hetzner CX32:** €12/mo (~$13/mo)
- **Contabo VPS:** €7/mo (~$8/mo)

---

## Security Checklist

- [ ] Server firewall configured (UFW or iptables)
- [ ] SSH key authentication only (disable password login)
- [ ] Fail2ban installed and configured
- [ ] Regular security updates enabled
- [ ] PM2 logs reviewed regularly
- [ ] HTTPS enforced everywhere
- [ ] CORS properly configured
- [ ] Rate limiting enabled (optional: nginx limit_req)
- [ ] Database credentials secured (if applicable)
- [ ] GitHub secrets properly set

---

## Next Steps

After successful deployment:
1. Set up monitoring (UptimeRobot, Pingdom)
2. Configure error tracking (Sentry)
3. Set up automated backups
4. Add custom error pages
5. Implement rate limiting
6. Set up application metrics (Prometheus + Grafana)

---

## Support

- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/
- **Nginx Docs:** https://nginx.org/en/docs/
- **PM2 Docs:** https://pm2.keymetrics.io/docs/
- **Let's Encrypt:** https://letsencrypt.org/docs/

For project-specific issues, check the repository's issue tracker.
