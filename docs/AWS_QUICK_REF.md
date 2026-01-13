# AWS EC2 Quick Reference for TerrainSim

Your AWS deployment details and quick commands.

## 🔧 Your AWS Configuration

### EC2 Instance
- **Instance ID:** (will get after creation)
- **Public IP:** (will get after creation)
- **Instance Type:** t3.micro (1 vCPU, 1GB RAM) - Free tier
- **AMI:** Ubuntu Server 22.04 LTS
- **Security Group:** terrainsim-sg
- **SSH Key:** terrainsim-key.pem

### Cloudflare Configuration
- **Domain:** lmvcruz.work
- **Frontend URL:** https://terrainsim.lmvcruz.work
- **API URL:** https://api.lmvcruz.work
- **Account ID:** 96c957fcf53cc9819a60e23c2437dafe
- **Zone ID:** 14cad50d481eb300f39564224165fd49

### GitHub Repository
- **URL:** https://github.com/lmvcruz/TerrainSim
- **Branch:** main

---

## 🚀 Quick Start Checklist

### 1. Create EC2 Instance
- [ ] Launch t3.micro Ubuntu 22.04
- [ ] Create terrainsim-key.pem
- [ ] Configure security group (ports 22, 80, 443)
- [ ] Get public IP address
- [ ] Test SSH connection

### 2. Install Dependencies
- [ ] Node.js 20
- [ ] Build tools (cmake, g++)
- [ ] Nginx
- [ ] Certbot
- [ ] PM2

### 3. Deploy Application
- [ ] Clone repository
- [ ] Build C++ addon
- [ ] Configure environment
- [ ] Start with PM2
- [ ] Configure nginx

### 4. Setup DNS & SSL
- [ ] Add A record in Cloudflare
- [ ] Obtain SSL certificate
- [ ] Test HTTPS

### 5. Deploy Frontend
- [ ] Create Cloudflare API token
- [ ] Create Pages project
- [ ] Add custom domain
- [ ] Test deployment

### 6. Setup CI/CD
- [ ] Add GitHub secrets
- [ ] Create workflow files
- [ ] Test auto-deployment

---

## 📝 Essential Commands

### SSH Connection
```powershell
# From Windows
ssh -i "$env:USERPROFILE\.ssh\terrainsim-key.pem" ubuntu@54.242.131.12

# Or if you created config:
ssh terrainsim
```

### Server Management
```bash
# Application status
pm2 status
pm2 logs terrainsim-api
pm2 monit

# Restart application
pm2 restart terrainsim-api

# Nginx status
sudo systemctl status nginx
sudo nginx -t                    # Test config
sudo systemctl reload nginx      # Reload config

# View logs
tail -f /var/log/terrainsim/out.log
tail -f /var/log/terrainsim/error.log
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Manual Deployment
```bash
# SSH into server
ssh terrainsim

# Go to application directory
cd /var/www/terrainsim

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Rebuild C++ addon
cd libs/core/bindings/node
npm run build
cd /var/www/terrainsim

# Restart
pm2 restart terrainsim-api
```

### Health Checks
```bash
# From server
curl http://localhost:3001/health

# From anywhere
curl https://api.lmvcruz.work/health
curl https://terrainsim.lmvcruz.work
```

### SSL Certificate Renewal
```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 🔍 Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs terrainsim-api --lines 100

# Check if C++ addon built
ls -lh /var/www/terrainsim/libs/core/bindings/node/build/Release/
# Should see terrain_erosion_native.node

# Rebuild addon
cd /var/www/terrainsim/libs/core/bindings/node
npm run build

# Check Node.js version
node --version  # Should be v20.x
```

### Nginx Errors
```bash
# Check nginx config
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Out of Memory (t3.micro)
```bash
# Check memory
free -h

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
free -h  # Should now show swap

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### DNS Not Resolving
```powershell
# Check DNS from local machine
nslookup api.lmvcruz.work
nslookup terrainsim.lmvcruz.work

# Should return Cloudflare IPs (not your EC2 IP)
# If not, wait 10 minutes and try again
```

---

## 💰 Cost Tracking

### AWS Free Tier Limits (12 months)
- ✅ **750 hours/month** t2.micro or t3.micro (enough for 24/7)
- ✅ **30GB** EBS storage
- ✅ **15GB** data transfer out per month
- ⚠️ **After 15GB:** $0.09/GB

### After Free Tier (Month 13+)
- **t3.micro:** ~$7.50/month
- **t3.small:** ~$15/month (2GB RAM)
- **t3.medium:** ~$30/month (4GB RAM) - recommended

### Cloudflare
- **Pages:** FREE (unlimited bandwidth)
- **DNS:** FREE
- **SSL:** FREE
- **CDN:** FREE

### Estimated Monthly Cost
```
Year 1:  $0 (free tier) ✅
Year 2+: $7.50-30/month (depending on instance size)
```

---

## 🔐 Security Checklist

### Server Security
- [ ] SSH key authentication only (no passwords)
- [ ] Firewall configured (only ports 22, 80, 443)
- [ ] Regular system updates
- [ ] Strong passwords for any services
- [ ] Fail2ban installed (optional)

### Application Security
- [ ] CORS configured for your domain only
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Environment variables secured
- [ ] Regular dependency updates

### Cloudflare Security
- [ ] Proxy enabled (orange cloud)
- [ ] SSL mode: Full (strict)
- [ ] WAF enabled (optional, paid)
- [ ] DDoS protection active

---

## 📊 Monitoring

### AWS CloudWatch
- Go to AWS Console → CloudWatch
- Monitor CPU, Memory, Network, Disk

### PM2 Monitoring
```bash
pm2 monit  # Real-time dashboard
pm2 logs   # Application logs
```

### UptimeRobot (Free)
1. Sign up: https://uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: https://api.lmvcruz.work/health
   - Interval: 5 minutes
3. Add another:
   - Type: HTTPS
   - URL: https://terrainsim.lmvcruz.work

### Test Health
```bash
# API health
curl https://api.lmvcruz.work/health

# Frontend health
curl -I https://terrainsim.lmvcruz.work
```

---

## 📚 Useful AWS Console Links

- **EC2 Dashboard:** https://console.aws.amazon.com/ec2
- **Your Instances:** https://console.aws.amazon.com/ec2/home#Instances:
- **Security Groups:** https://console.aws.amazon.com/ec2/home#SecurityGroups:
- **CloudWatch:** https://console.aws.amazon.com/cloudwatch
- **Billing:** https://console.aws.amazon.com/billing

---

## 🆘 Emergency Procedures

### Application Crashed
```bash
ssh terrainsim
pm2 restart terrainsim-api
pm2 logs
```

### Server Not Responding
1. Go to AWS Console → EC2
2. Select your instance
3. Actions → Instance State → Reboot
4. Wait 2-3 minutes
5. Test: `ssh terrainsim`

### Rollback Deployment
```bash
ssh terrainsim
cd /var/www/terrainsim

# See recent commits
git log --oneline -n 5

# Rollback to previous commit
git reset --hard HEAD~1

# Rebuild
cd libs/core/bindings/node
npm run build
cd /var/www/terrainsim

# Restart
pm2 restart terrainsim-api
```

### Need Help?
- **GitHub Issues:** https://github.com/lmvcruz/TerrainSim/issues
- **AWS Support:** https://console.aws.amazon.com/support
- **Cloudflare Support:** https://dash.cloudflare.com → Support

---

## 🎯 Next Steps After Deployment

### Performance Monitoring
- [ ] Set up CloudWatch alarms
- [ ] Enable PM2 monitoring
- [ ] Configure UptimeRobot
- [ ] Test under load

### Optimization
- [ ] Enable Cloudflare caching
- [ ] Configure nginx caching
- [ ] Optimize C++ build
- [ ] Add CDN for assets

### Scaling (When Needed)
- [ ] Upgrade to t3.small (2GB RAM)
- [ ] Add Redis for sessions
- [ ] Enable auto-scaling
- [ ] Add load balancer

---

**Last Updated:** January 2026
**Your EC2 IP:** 54.242.131.12 ✅
**Instance ID:** (get from AWS Console)
