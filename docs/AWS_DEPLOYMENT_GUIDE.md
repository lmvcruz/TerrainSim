# AWS Deployment Guide for TerrainSim

Complete guide for deploying TerrainSim using **AWS EC2** (backend) and **Cloudflare Pages** (frontend).

**Your Configuration:**
- Domain: `lmvcruz.work`
- Cloudflare Account ID: `96c957fcf53cc9819a60e23c2437dafe`
- Cloudflare Zone ID: `14cad50d481eb300f39564224165fd49`

---

## ⚠️ AWS Free Tier vs Production Requirements

### AWS Free Tier Limitations

**What's included FREE (12 months):**
- ✅ **750 hours/month** of t2.micro or t3.micro (1 vCPU, 1GB RAM)
- ✅ **30GB** EBS storage
- ✅ **15GB** data transfer out
- ✅ Runs 24/7 for free if only 1 instance

**⚠️ IMPORTANT: Free tier is NOT enough for production**

| Requirement | Free Tier (t2.micro) | Recommended (t3.medium) |
|-------------|---------------------|-------------------------|
| **RAM** | 1GB ❌ Too small | 4GB ✅ Good |
| **CPU** | 1 vCPU ⚠️ Slow | 2 vCPU ✅ Good |
| **C++ Build** | Works but slow | Fast compilation |
| **Erosion Sim** | Laggy with users | Smooth performance |
| **Cost** | FREE (12 months) | ~$30/month |

**Recommendation:**
1. **For Testing:** Use t2.micro (FREE) - test deployment process
2. **For Production:** Use t3.medium ($30/mo) - smooth user experience
3. **Hybrid Approach:** Start with t2.micro, upgrade when you get users

**We'll use t3.micro (1GB RAM) initially - still free tier, slightly better than t2.micro.**

---

## Part 1: AWS EC2 Setup (Backend Server)

### Step 1: Launch EC2 Instance (20 minutes)

1. **Login to AWS Console**
   - Go to: https://console.aws.amazon.com
   - Sign in with your account

2. **Navigate to EC2**
   - Search for "EC2" in top search bar
   - Click **EC2** (Virtual Servers in the Cloud)

3. **Launch Instance**
   - Click **Launch Instance** button (orange)
   - You'll see the launch wizard

4. **Configure Instance**

   **Name:** `terrainsim-backend`

   **Application and OS Images (AMI):**
   - Click **Quick Start** tab
   - Select **Ubuntu**
   - Choose: **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type**
   - Architecture: **64-bit (x86)**
   - ✅ Free tier eligible badge should show

   **Instance Type:**
   - Select: **t3.micro** (1 vCPU, 1GB RAM) ✅ Free tier
   - Or if you want better performance: **t3.medium** (2 vCPU, 4GB RAM) 💰 ~$30/mo

   **Key Pair (login):**
   - Click **Create new key pair**
   - Key pair name: `terrainsim-key`
   - Key pair type: **RSA**
   - Private key format: **`.pem`** (for OpenSSH)
   - Click **Create key pair**
   - ⚠️ **IMPORTANT:** Save the `.pem` file - you'll need it for SSH!
   - Move to safe location: `C:\Users\YourName\.ssh\terrainsim-key.pem` (Windows)

   **Network Settings:**
   - Click **Edit** button
   - VPC: Keep default
   - Subnet: Keep default (No preference)
   - Auto-assign public IP: **Enable** ✅
   - Firewall (security groups): **Create security group** ✅
   - Security group name: `terrainsim-sg`
   - Description: `Security group for TerrainSim backend`

   **Security group rules:**
   - ✅ SSH (port 22) - Keep default
   - Click **Add security group rule**:
     - Type: **HTTP**
     - Port: **80**
     - Source: **Anywhere (0.0.0.0/0)**
   - Click **Add security group rule**:
     - Type: **HTTPS**
     - Port: **443**
     - Source: **Anywhere (0.0.0.0/0)**

   **Configure Storage:**
   - Size: **30 GiB** (free tier limit)
   - Volume type: **gp3** (General Purpose SSD)
   - ✅ Free tier eligible

   **Advanced details:**
   - Leave all as default

5. **Review and Launch**
   - Review all settings on right side
   - Click **Launch instance** (orange button)
   - Wait 1-2 minutes for instance to start

6. **Note Your Public IP**
   - Go to **Instances** in left sidebar
   - Find your `terrainsim-backend` instance
   - **Status check:** Wait until it shows "2/2 checks passed" (2-3 minutes)
   - Copy the **Public IPv4 address**
   - Your IP: `54.242.131.12` ✅
   - **⚠️ SAVE THIS IP - YOU'LL NEED IT!**

### Step 2: Configure SSH Access (10 minutes)

**On Windows PowerShell:**

1. **Fix SSH Key Permissions**
   ```powershell
   # Move to SSH directory (skip if file already there)
   Move-Item "Downloads\terrainsim-key.pem" "$env:USERPROFILE\.ssh\"

   # Fix permissions (Windows)
   icacls "$env:USERPROFILE\.ssh\terrainsim-key.pem" /inheritance:r
   icacls "$env:USERPROFILE\.ssh\terrainsim-key.pem" /grant "${env:USERNAME}:(R)"
   ```

2. **Test SSH Connection**
   ```powershell
   ssh -i "$env:USERPROFILE\.ssh\terrainsim-key.pem" ubuntu@54.242.131.12
   ```

   - First time: Type `yes` when asked about fingerprint
   - You should see Ubuntu welcome message ✅

3. **Create SSH Config (Optional but Recommended)**
   ```powershell
   notepad "$env:USERPROFILE\.ssh\config"
   ```

   Add:
   ```
   Host terrainsim
       HostName 54.242.131.12
       User ubuntu
       IdentityFile ~/.ssh/terrainsim-key.pem
   ```

   Now you can connect with just: `ssh terrainsim` 🎉

### Step 3: Initial Server Setup (15 minutes)

SSH into your server:
```bash
ssh -i ~/.ssh/terrainsim-key.pem ubuntu@54.242.131.12
# Or if you created config: ssh terrainsim
```

**Update system:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Install Node.js 20:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

**Install build tools (for C++ addon):**
```bash
sudo apt install -y build-essential cmake g++ git
cmake --version  # Should show 3.x
```

**Install Nginx (web server):**
```bash
sudo apt install -y nginx
nginx -v  # Should show nginx/1.x
```

**Install Certbot (SSL certificates):**
```bash
sudo apt install -y certbot python3-certbot-nginx
certbot --version
```

**Install PM2 (process manager):**
```bash
sudo npm install -g pm2 pnpm
pm2 --version
pnpm --version
```

**Verify all installations:**
```bash
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "pnpm: $(pnpm --version)"
echo "CMake: $(cmake --version | head -n1)"
echo "g++: $(g++ --version | head -n1)"
echo "Nginx: $(nginx -v 2>&1)"
echo "PM2: $(pm2 --version)"
```

All should show version numbers ✅

### Step 4: Clone and Build Application (15 minutes)

```bash
# Create application directory
sudo mkdir -p /var/www/terrainsim
sudo chown ubuntu:ubuntu /var/www/terrainsim
cd /var/www/terrainsim

# Clone repository
git clone https://github.com/lmvcruz/TerrainSim.git .

# Install dependencies
pnpm install

# Build C++ native addon
cd libs/core/bindings/node
npm install
npm run build

# Verify build succeeded
ls -lh build/Release/terrain_erosion_native.node
# Should show a .node file (~500KB)

cd /var/www/terrainsim
```

**If build fails:**
- Check you have 1GB+ RAM: `free -h`
- If t2.micro is too small, you may need to add swap:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  free -h  # Should now show swap
  ```

### Step 5: Configure Application (10 minutes)

**Create environment file:**
```bash
nano /var/www/terrainsim/apps/simulation-api/.env
```

Add:
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://terrainsim.lmvcruz.work
```

Save: Ctrl+X, Y, Enter

**Create PM2 ecosystem config:**
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

Save: Ctrl+X, Y, Enter

**Create log directory:**
```bash
sudo mkdir -p /var/log/terrainsim
sudo chown ubuntu:ubuntu /var/log/terrainsim
```

**Start application:**
```bash
cd /var/www/terrainsim
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Copy and run the command it outputs
```

**Verify running:**
```bash
pm2 status
# Should show "online" status

curl http://localhost:3001/health
# Should return: {"status":"ok",...}
```

### Step 6: Configure Nginx Reverse Proxy (15 minutes)

**Create nginx config:**
```bash
sudo nano /etc/nginx/sites-available/terrainsim
```

Add:
```nginx
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.lmvcruz.work;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - API Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.lmvcruz.work;

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/api.lmvcruz.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.lmvcruz.work/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Proxy to Node.js
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

    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Save: Ctrl+X, Y, Enter

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/terrainsim /etc/nginx/sites-enabled/
sudo nginx -t  # Should say "syntax is okay"
```

**Don't start nginx yet** - we need SSL certificates first

---

## Part 2: Cloudflare DNS Configuration (10 minutes)

1. **Login to Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com
   - Select domain: `lmvcruz.work`

2. **Go to DNS → Records**

3. **Add A Record for API**
   - Click **Add record**
   - Type: **A**
   - Name: **api**
   - IPv4 address: **54.242.131.12**
   - Proxy status: **Proxied** (orange cloud) ✅
   - TTL: **Auto**
   - Click **Save**

4. **Important: Set SSL/TLS Mode**
   - Go to **SSL/TLS** in left menu
   - Overview tab
   - Set encryption mode to: **Full (strict)** ⚠️ Important!
   - This ensures Cloudflare validates your server's certificate

5. **Wait for DNS Propagation**
   ```powershell
   # On your local machine
   nslookup api.lmvcruz.work
   # Should return Cloudflare IP (not your EC2 IP - that's correct!)
   ```

---

## Part 3: SSL Certificate Setup (15 minutes)

**⚠️ Wait 5-10 minutes after DNS change before continuing**

SSH into your EC2 instance:
```bash
ssh terrainsim  # or: ssh -i ~/.ssh/terrainsim-key.pem ubuntu@54.242.131.12
```

**Obtain SSL certificate:**
```bash
sudo certbot --nginx -d api.lmvcruz.work
```

Follow prompts:
- Email: Enter your email
- Terms: Agree (A)
- Updates: Your choice (Y or N)
- Redirect HTTP to HTTPS: Choose **2** (Redirect)

**If it fails with DNS error:**
- Wait 10 more minutes for DNS to propagate globally
- Try again

**Test auto-renewal:**
```bash
sudo certbot renew --dry-run
# Should say "Congratulations, all simulations succeeded"
```

**Start/reload nginx:**
```bash
sudo systemctl reload nginx
sudo systemctl enable nginx  # Start on boot
```

**Test backend:**
```bash
# From EC2 server
curl http://localhost:3001/health
curl https://api.lmvcruz.work/health

# From your local machine (PowerShell)
curl https://api.lmvcruz.work/health
```

Should return: `{"status":"ok","timestamp":"..."}`

---

## Part 4: Cloudflare Pages Setup (Frontend) (20 minutes)

### Step 1: Create API Token

1. **Go to Cloudflare Dashboard**
   - Profile icon (top right) → **My Profile**
   - Click **API Tokens** tab
   - Click **Create Token**

2. **Use "Edit Cloudflare Workers" Template**
   - Find **Edit Cloudflare Workers** template
   - Click **Use template**

3. **Configure Token**
   - Token name: `GitHub-TerrainSim`
   - Permissions: Should already be set to:
     - Account → Cloudflare Pages → Edit
   - Account Resources: Include → Your account
   - Zone Resources: Include → `lmvcruz.work`
   - Click **Continue to summary**
   - Click **Create Token**

4. **⚠️ SAVE TOKEN IMMEDIATELY**
   - Copy the token (starts with `v1.0-...`)
   - Save it somewhere safe - you can't see it again!
   - We'll use this in GitHub Actions

### Step 2: Create Cloudflare Pages Project

1. **Go to Workers & Pages**
   - Dashboard → **Workers & Pages**
   - Click **Create application**
   - Click **Pages** tab
   - Click **Connect to Git**

2. **Connect GitHub**
   - Click **GitHub**
   - Authorize Cloudflare
   - Select repository: **lmvcruz/TerrainSim**
   - Click **Begin setup**

3. **Configure Build**
   ```
   Project name: terrainsim
   Production branch: main
   Build command: pnpm install && pnpm --filter @terrain/web run build
   Build output directory: apps/web/dist
   Root directory: (leave empty)
   ```

4. **Environment Variables**
   Click **Add variable**:
   ```
   VITE_API_URL = https://api.lmvcruz.work
   ```

   Click **Add variable** again:
   ```
   VITE_WS_URL = wss://api.lmvcruz.work
   ```

5. **Deploy**
   - Click **Save and Deploy**
   - Wait 3-5 minutes for build
   - You'll get a URL: `https://terrainsim-xxx.pages.dev`
   - Test it - frontend should load but API errors (expected for now)

### Step 3: Add Custom Domain

1. **In your Pages project**
   - Go to **Custom domains** tab
   - Click **Set up a custom domain**
   - Enter: `terrainsim.lmvcruz.work`
   - Click **Continue**

2. **DNS Setup (Automatic)**
   - Cloudflare will create DNS records automatically
   - Wait 1-5 minutes

3. **Test**
   - Go to: https://terrainsim.lmvcruz.work
   - Frontend should load
   - Try generating terrain - should work!
   - Try erosion - should work!

---

## Part 5: GitHub Actions Setup (30 minutes)

### Step 1: Add GitHub Secrets

1. **Go to GitHub Repository**
   - https://github.com/lmvcruz/TerrainSim
   - Go to **Settings** tab
   - Click **Secrets and variables** → **Actions**

2. **Add Repository Secrets**

   Click **New repository secret** for each:

   ```
   Name: CLOUDFLARE_API_TOKEN
   Value: (paste the API token you saved earlier)
   ```

   ```
   Name: CLOUDFLARE_ACCOUNT_ID
   Value: 96c957fcf53cc9819a60e23c2437dafe
   ```

   ```
   Name: SERVER_HOST
   Value: 54.242.131.12
   ```

   ```
   Name: SERVER_USER
   Value: ubuntu
   ```

   ```
   Name: SERVER_SSH_KEY
   Value: (paste contents of terrainsim-key.pem)
   ```

   To get SSH key content (PowerShell):
   ```powershell
   Get-Content "$env:USERPROFILE\.ssh\terrainsim-key.pem" | clip
   # Now paste in GitHub
   ```

   ```
   Name: SERVER_DEPLOY_PATH
   Value: /var/www/terrainsim
   ```

### Step 2: Create Deployment Workflows

The workflow files are already in the repository docs. Let me create them in the correct location:

---

Continue to next message for workflow files...
