# Cloudflare Deployment - Quick Start Checklist

Use this checklist to track your deployment progress.

## Prerequisites
- [ ] Cloudflare account created ✅ (you have this)
- [ ] Domain added to Cloudflare ✅ (you have this)
- [ ] GitHub repository ready
- [ ] Server/VPS purchased (DigitalOcean, Hetzner, AWS, etc.)

---

## Phase 1: Cloudflare Pages (Frontend) - 30 minutes

### Setup (15 min)
- [ ] Login to Cloudflare Dashboard
- [ ] Create new Pages project
- [ ] Connect to GitHub repository `lmvcruz/TerrainSim`
- [ ] Configure build settings:
  - Build command: `pnpm install && pnpm --filter @terrain/web run build`
  - Output directory: `apps/web/dist`
  - Node version: `20`
- [ ] Add environment variables:
  - `VITE_API_URL=https://api.yourdomain.com`
  - `VITE_WS_URL=wss://api.yourdomain.com`
- [ ] Save and deploy (wait 2-5 minutes)

### Custom Domain (15 min)
- [ ] Go to **Custom domains** in Pages project
- [ ] Add custom domain: `terrainsim.yourdomain.com`
- [ ] Wait for DNS propagation (1-5 minutes)
- [ ] Wait for SSL certificate (up to 15 minutes)
- [ ] Test: Open `https://terrainsim.yourdomain.com` in browser

**✅ Checkpoint:** Frontend loads but shows API errors (expected - backend not deployed yet)

---

## Phase 2: Server Setup - 60 minutes

### Provision Server (10 min)
- [ ] Create account on hosting provider:
  - [ ] DigitalOcean (recommended) OR
  - [ ] Hetzner (cheapest) OR
  - [ ] AWS EC2 OR
  - [ ] Other VPS provider
- [ ] Launch server:
  - Image: **Ubuntu 22.04 LTS**
  - Size: **4GB RAM, 2 vCPU** minimum
  - Region: Choose closest to users
  - SSH key: Add your public key
- [ ] Note down **public IP address**

### Initial Configuration (20 min)
- [ ] SSH into server: `ssh root@YOUR_SERVER_IP`
- [ ] Update system: `apt update && apt upgrade -y`
- [ ] Create deploy user:
  ```bash
  adduser deploy
  usermod -aG sudo deploy
  ```
- [ ] Copy SSH keys to deploy user
- [ ] Test deploy user login: `ssh deploy@YOUR_SERVER_IP`
- [ ] Switch to deploy user for remaining steps

### Install Dependencies (20 min)
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Build tools (for C++ addon)
sudo apt install -y build-essential cmake g++ git

# Nginx (web server/reverse proxy)
sudo apt install -y nginx

# Certbot (SSL certificates)
sudo apt install -y certbot python3-certbot-nginx

# PM2 (process manager)
sudo npm install -g pm2 pnpm
```

- [ ] Verify all installations:
  ```bash
  node --version    # v20.x
  cmake --version   # 3.x
  nginx -v          # 1.x
  pm2 --version     # 5.x
  ```

### Clone and Build (10 min)
```bash
# Create app directory
sudo mkdir -p /var/www/terrainsim
sudo chown deploy:deploy /var/www/terrainsim
cd /var/www/terrainsim

# Clone repository
git clone https://github.com/lmvcruz/TerrainSim.git .

# Install dependencies
pnpm install

# Build C++ native addon
cd libs/core/bindings/node
npm install
npm run build
cd ../../../..
```

- [ ] Verify build: `ls libs/core/bindings/node/build/Release/*.node`

**✅ Checkpoint:** Native addon compiled successfully

---

## Phase 3: Backend Configuration - 30 minutes

### Environment Variables (5 min)
```bash
# Create .env file
nano /var/www/terrainsim/apps/simulation-api/.env
```

Add:
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://terrainsim.yourdomain.com
```

- [ ] Save file (Ctrl+X, Y, Enter)

### PM2 Configuration (10 min)
```bash
# Create PM2 config
nano /var/www/terrainsim/ecosystem.config.js
```

- [ ] Copy config from [DEPLOYMENT.md](DEPLOYMENT.md#step-6-configure-pm2)
- [ ] Create log directory: `sudo mkdir -p /var/log/terrainsim`
- [ ] Start app:
  ```bash
  cd /var/www/terrainsim
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup  # Run the command it outputs
  ```
- [ ] Verify: `pm2 status` (should show "online")
- [ ] Test: `curl http://localhost:3001/health` (should return JSON)

### Nginx Configuration (15 min)
```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/terrainsim
```

- [ ] Copy config from [DEPLOYMENT.md](DEPLOYMENT.md#step-7-configure-nginx-reverse-proxy)
- [ ] **Replace all instances of `yourdomain.com` with your actual domain**
- [ ] Enable site:
  ```bash
  sudo ln -s /etc/nginx/sites-available/terrainsim /etc/nginx/sites-enabled/
  sudo nginx -t  # Should say "syntax is okay"
  ```

**✅ Checkpoint:** Nginx config valid

---

## Phase 4: DNS & SSL - 20 minutes

### DNS Configuration (5 min)
- [ ] Login to Cloudflare Dashboard
- [ ] Go to DNS → Records
- [ ] Add A record:
  - Type: **A**
  - Name: **api**
  - IPv4: **YOUR_SERVER_IP**
  - Proxy: **Proxied** (orange cloud)
  - TTL: **Auto**
- [ ] Click **Save**
- [ ] Wait 2-5 minutes for propagation
- [ ] Verify: `dig api.yourdomain.com` (should show your IP)

### SSL Certificate (15 min)
**⚠️ Wait 5-10 minutes after DNS change before continuing**

```bash
# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

- [ ] Enter email address
- [ ] Agree to Terms of Service
- [ ] Choose option: **2 (Redirect HTTP to HTTPS)**
- [ ] Test auto-renewal: `sudo certbot renew --dry-run`
- [ ] Reload nginx: `sudo systemctl reload nginx`

**✅ Checkpoint:** SSL certificate installed

---

## Phase 5: Verification - 10 minutes

### Test Backend
- [ ] Health endpoint: `curl https://api.yourdomain.com/health`
- [ ] Should return: `{"status":"ok","timestamp":"..."}`
- [ ] Check browser: Navigate to `https://api.yourdomain.com/health`
- [ ] Check PM2 logs: `pm2 logs terrainsim-api`
- [ ] Check nginx logs: `sudo tail /var/log/nginx/error.log`

### Test Frontend
- [ ] Open `https://terrainsim.yourdomain.com` in browser
- [ ] Check browser console (F12) - no errors expected
- [ ] Click "Generate Terrain" - should work
- [ ] Try erosion simulation - should work
- [ ] Check WebSocket connection in Network tab

**✅ Checkpoint:** Full application working end-to-end

---

## Phase 6: GitHub Actions CI/CD - 30 minutes

### Add GitHub Secrets (10 min)
Go to GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- [ ] `CLOUDFLARE_API_TOKEN` (from Cloudflare Dashboard → API Tokens)
- [ ] `CLOUDFLARE_ACCOUNT_ID` (from Cloudflare Dashboard → Account ID)
- [ ] `SERVER_HOST` = YOUR_SERVER_IP
- [ ] `SERVER_USER` = deploy
- [ ] `SERVER_SSH_KEY` = (paste your private key: `cat ~/.ssh/id_rsa`)
- [ ] `SERVER_DEPLOY_PATH` = /var/www/terrainsim

### Create Workflow Files (10 min)
- [ ] Copy `.github/workflows/deploy-frontend.yml` from [DEPLOYMENT.md](DEPLOYMENT.md#step-2-create-frontend-deployment-workflow)
- [ ] Copy `.github/workflows/deploy-backend.yml` from [DEPLOYMENT.md](DEPLOYMENT.md#step-3-create-backend-deployment-workflow)
- [ ] **Replace `yourdomain.com` with your actual domain in both files**
- [ ] Commit and push workflows to `main` branch

### Test Automated Deployment (10 min)
```bash
# Make a test change
echo "# Test deployment" >> README.md
git add .
git commit -m "test: automated deployment"
git push origin main
```

- [ ] Go to GitHub → Actions tab
- [ ] Watch both workflows run
- [ ] Verify deployments succeed (green checkmarks)
- [ ] Test application still works

**✅ Checkpoint:** Automated deployment working

---

## Phase 7: Monitoring & Maintenance - 15 minutes

### Set Up Monitoring (10 min)
- [ ] Create account on UptimeRobot (https://uptimerobot.com) - FREE
- [ ] Add monitor for frontend: `https://terrainsim.yourdomain.com`
- [ ] Add monitor for backend: `https://api.yourdomain.com/health`
- [ ] Set up email/SMS alerts
- [ ] Add status page (optional)

### Security Hardening (5 min)
```bash
# SSH into server
ssh deploy@YOUR_SERVER_IP

# Enable firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Disable password authentication (SSH keys only)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

- [ ] Test SSH still works with keys
- [ ] Firewall enabled and configured

**✅ Checkpoint:** Monitoring and security configured

---

## Final Checklist

### Functionality
- [ ] Frontend loads at custom domain with HTTPS
- [ ] Backend API responds at `api.yourdomain.com`
- [ ] WebSocket connections work
- [ ] Terrain generation works
- [ ] Erosion simulation works
- [ ] No console errors in browser

### Infrastructure
- [ ] SSL certificates auto-renew (cron job from certbot)
- [ ] PM2 restarts app on crash
- [ ] Nginx serves as reverse proxy
- [ ] Firewall configured
- [ ] Monitoring alerts configured

### CI/CD
- [ ] GitHub Actions deploy frontend automatically
- [ ] GitHub Actions deploy backend automatically
- [ ] Health checks pass after deployment
- [ ] Can rollback deployments if needed

### Documentation
- [ ] Server details documented (IP, credentials)
- [ ] DNS records documented
- [ ] Environment variables documented
- [ ] Deployment procedures documented

---

## Common Issues & Solutions

### Issue: Frontend not loading
**Solution:**
1. Check Cloudflare Pages deployment status
2. Check browser console for errors
3. Verify environment variables in Pages settings
4. Purge Cloudflare cache

### Issue: API connection errors
**Solution:**
1. Check `CORS_ORIGIN` in backend `.env` file
2. Verify DNS points to correct IP: `dig api.yourdomain.com`
3. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Check PM2 logs: `pm2 logs terrainsim-api`

### Issue: SSL certificate errors
**Solution:**
1. Verify DNS is propagated: `dig api.yourdomain.com`
2. Wait 5-10 minutes after DNS change
3. Run certbot again: `sudo certbot --nginx -d api.yourdomain.com`
4. Check nginx config: `sudo nginx -t`

### Issue: GitHub Actions failing
**Solution:**
1. Check secrets are set correctly
2. Verify SSH key has no passphrase
3. Check workflow logs for specific errors
4. Test SSH connection manually: `ssh deploy@YOUR_SERVER_IP`

---

## Estimated Total Time

- **Phase 1:** Frontend setup - 30 min
- **Phase 2:** Server setup - 60 min
- **Phase 3:** Backend config - 30 min
- **Phase 4:** DNS & SSL - 20 min
- **Phase 5:** Verification - 10 min
- **Phase 6:** CI/CD - 30 min
- **Phase 7:** Monitoring - 15 min

**Total: ~3 hours** (first time)

Subsequent deployments via GitHub Actions: **~5 minutes automated**

---

## Next Steps After Deployment

1. **Performance Testing**
   - Load test with multiple users
   - Monitor resource usage
   - Optimize as needed

2. **Backup Strategy**
   - Set up automated backups
   - Test restore procedures
   - Document recovery process

3. **Scaling Planning**
   - Monitor traffic patterns
   - Plan for horizontal scaling if needed
   - Consider CDN for global users

4. **Advanced Monitoring**
   - Set up error tracking (Sentry)
   - Add performance monitoring (New Relic)
   - Create dashboards (Grafana)

---

## Need Help?

- **Deployment Guide:** [DEPLOYMENT.md](DEPLOYMENT.md) - Full detailed guide
- **Iteration Planning:** [Iterations Planning](Iterations%20Planning) - Iteration 2.5 tasks
- **GitHub Issues:** Report issues in repository
- **Community:** Discord/Slack (if applicable)

---

**Good luck with your deployment! 🚀**
