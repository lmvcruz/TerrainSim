# TerrainSim Deployment - Quick Reference

**Replace `yourdomain.com` with your actual Cloudflare domain throughout this guide.**

## 🔗 URLs After Deployment

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | `https://terrainsim.yourdomain.com` | Main web application |
| **API Health** | `https://api.yourdomain.com/health` | Backend health check |
| **WebSocket** | `wss://api.yourdomain.com` | Real-time communication |

## 📝 Configuration Values

### Cloudflare Pages Environment Variables
```
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

### Backend Environment (.env)
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://terrainsim.yourdomain.com
```

### DNS Records (Cloudflare)
```
Type: A
Name: api
IPv4: YOUR_SERVER_IP
Proxy: ON (orange cloud)
TTL: Auto

Type: A
Name: terrainsim (or @)
IPv4: (Cloudflare Pages automatic)
Proxy: ON
TTL: Auto
```

## 🚀 Quick Commands

### On Your Server

```bash
# SSH into server
ssh deploy@YOUR_SERVER_IP

# Check application status
pm2 status

# View logs
pm2 logs terrainsim-api

# Restart application
pm2 reload terrainsim-api

# Pull latest code & deploy
cd /var/www/terrainsim
git pull origin main
cd libs/core/bindings/node && npm run build && cd ../../../..
pm2 reload terrainsim-api

# Check nginx status
sudo systemctl status nginx

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# View nginx logs
sudo tail -f /var/log/nginx/error.log

# Check SSL certificates
sudo certbot certificates

# Renew SSL manually
sudo certbot renew
sudo systemctl reload nginx
```

### On Your Local Machine

```bash
# Deploy frontend manually
cd /path/to/TerrainSim
pnpm --filter @terrain/web run build
# Then upload to Cloudflare Pages (usually automatic via GitHub)

# Trigger automated deployment
git add .
git commit -m "deploy: your changes"
git push origin main

# Check GitHub Actions status
# Visit: https://github.com/lmvcruz/TerrainSim/actions
```

## 🔍 Verification Commands

```bash
# Test frontend
curl -I https://terrainsim.yourdomain.com
# Should return: 200 OK

# Test backend health
curl https://api.yourdomain.com/health
# Should return: {"status":"ok","timestamp":"..."}

# Test DNS resolution
dig api.yourdomain.com
dig terrainsim.yourdomain.com

# Test SSL certificate
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com < /dev/null

# Check WebSocket (in browser console)
const socket = new WebSocket('wss://api.yourdomain.com');
socket.onopen = () => console.log('Connected!');
socket.onerror = (e) => console.error('Error:', e);
```

## 🎯 GitHub Secrets Required

Go to: `https://github.com/lmvcruz/TerrainSim/settings/secrets/actions`

```
CLOUDFLARE_API_TOKEN       = (get from Cloudflare Dashboard → API Tokens)
CLOUDFLARE_ACCOUNT_ID      = (get from Cloudflare Dashboard → Account ID)
SERVER_HOST                = YOUR_SERVER_IP
SERVER_USER                = deploy
SERVER_SSH_KEY             = (paste private key: cat ~/.ssh/id_rsa)
SERVER_DEPLOY_PATH         = /var/www/terrainsim
```

## 📊 Monitoring Endpoints

Add these to your monitoring service (UptimeRobot, Pingdom, etc.):

```
https://terrainsim.yourdomain.com
https://api.yourdomain.com/health
```

## 🆘 Emergency Procedures

### Frontend Not Loading
```bash
# 1. Check Cloudflare Pages dashboard
# 2. Purge Cloudflare cache:
#    Dashboard → Caching → Purge Everything
# 3. Check environment variables in Pages settings
# 4. Redeploy from GitHub Actions
```

### Backend Not Responding
```bash
# SSH into server
ssh deploy@YOUR_SERVER_IP

# Check if app is running
pm2 status

# If stopped, restart
pm2 start ecosystem.config.js

# Check logs for errors
pm2 logs terrainsim-api --err --lines 100

# Check nginx
sudo systemctl status nginx
sudo nginx -t

# Check port 3001 listening
sudo netstat -tlnp | grep 3001

# Test local connection
curl http://localhost:3001/health
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx

# If DNS changed recently, wait 5-10 minutes
# Then rerun certbot
sudo certbot --nginx -d api.yourdomain.com
```

### Rollback Deployment

**Frontend:**
1. Go to Cloudflare Pages → Deployments
2. Find previous successful deployment
3. Click ⋯ → Rollback

**Backend:**
```bash
ssh deploy@YOUR_SERVER_IP
cd /var/www/terrainsim
git log --oneline -n 10
git reset --hard COMMIT_HASH
cd libs/core/bindings/node && npm run build && cd ../../../..
pm2 reload terrainsim-api
```

## 📈 Performance Checks

```bash
# Server resource usage
ssh deploy@YOUR_SERVER_IP
htop  # or: top

# Disk space
df -h

# Memory usage
free -h

# PM2 resource monitor
pm2 monit

# Nginx access logs (check traffic)
sudo tail -f /var/log/nginx/access.log

# Check response times
time curl -o /dev/null -s -w '%{time_total}\n' https://api.yourdomain.com/health
```

## 🔐 Security Checks

```bash
# Check firewall status
sudo ufw status

# List open ports
sudo netstat -tlnp

# Check fail2ban (if installed)
sudo fail2ban-client status

# Review nginx security headers
curl -I https://api.yourdomain.com/health | grep -E 'X-Frame-Options|X-Content-Type|Strict-Transport'

# Check SSL rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.yourdomain.com
```

## 💡 Useful One-Liners

```bash
# Watch PM2 logs in real-time
pm2 logs terrainsim-api --lines 50

# Check app uptime
pm2 describe terrainsim-api | grep uptime

# Count nginx requests in last hour
sudo awk -v d1="$(date --date='-1 hour' '+%d/%b/%Y:%H:%M:%S')" '$4 > "["d1' /var/log/nginx/access.log | wc -l

# Check WebSocket connections
sudo netstat -an | grep :3001 | grep ESTABLISHED | wc -l

# Restart everything
pm2 reload terrainsim-api && sudo systemctl reload nginx

# Clear all logs
pm2 flush terrainsim-api

# Backup current code
cd /var/www/terrainsim && tar -czf ~/backup-$(date +%Y%m%d-%H%M%S).tar.gz .
```

## 📞 Support Contacts

| Issue | Resource |
|-------|----------|
| **Cloudflare** | https://dash.cloudflare.com/support |
| **GitHub Actions** | https://github.com/lmvcruz/TerrainSim/actions |
| **Server Provider** | Check your hosting provider dashboard |
| **Let's Encrypt** | https://letsencrypt.org/docs/ |
| **Project Issues** | https://github.com/lmvcruz/TerrainSim/issues |

## 🎓 Learning Resources

- **Cloudflare Pages:** https://developers.cloudflare.com/pages/
- **Nginx Guide:** https://nginx.org/en/docs/beginners_guide.html
- **PM2 Cheat Sheet:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **Let's Encrypt:** https://letsencrypt.org/getting-started/

---

**Last Updated:** January 13, 2026
**Your Domain:** (Replace `yourdomain.com` everywhere)
**Server IP:** (Note your server IP here)

---

**💡 Tip:** Keep this file updated with your actual domain and server details for quick reference!
