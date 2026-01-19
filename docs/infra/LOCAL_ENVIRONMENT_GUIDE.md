# Local Environment Reproduction Guide

**Created:** 2026-01-19
**Purpose:** Test and reproduce production environments locally
**Platforms:** Docker (AWS EC2), act (GitHub Actions), Log Capture Scripts

---

## Table of Contents

1. [Docker Environment (AWS EC2 Simulation)](#docker-environment)
2. [GitHub Actions Local Testing (act)](#github-actions-local-testing)
3. [Log Capture Scripts](#log-capture-scripts)
4. [Environment Variables](#environment-variables)
5. [Troubleshooting](#troubleshooting)

---

## Docker Environment

### Overview

The Docker Compose configuration mimics the AWS EC2 production environment with:
- Node.js 20.19.6 (matching production)
- PM2 process manager
- Nginx reverse proxy (simulating AWS load balancer)
- Health checks and restart policies

### Prerequisites

```bash
# Install Docker Desktop
# Windows: https://docs.docker.com/desktop/install/windows-install/
# macOS: https://docs.docker.com/desktop/install/mac-install/
# Linux: https://docs.docker.com/engine/install/

# Verify installation
docker --version
docker-compose --version
```

### Quick Start

```bash
# 1. Start all services
docker-compose up -d

# 2. Check service status
docker-compose ps

# 3. View logs
docker-compose logs -f api
docker-compose logs -f nginx

# 4. Test API
curl http://localhost/api/health

# 5. Stop services
docker-compose down
```

### Detailed Usage

#### Build and Start

```bash
# Build images (first time or after changes)
docker-compose build

# Start in detached mode (background)
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific service
docker-compose up -d api
```

#### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 api

# With timestamps
docker-compose logs -f -t api
```

#### Access Containers

```bash
# Execute commands in running container
docker-compose exec api sh
docker-compose exec nginx sh

# Inside container, you can:
# - Check PM2 status: pm2 status
# - View PM2 logs: pm2 logs
# - Check nginx config: nginx -t
```

#### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api
docker-compose restart nginx

# Full rebuild and restart
docker-compose down
docker-compose up -d --build
```

#### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all
```

### Services Configuration

#### API Service (Port 3001)

- **Base Image:** node:20.19.6-bullseye
- **PM2 Config:** `apps/simulation-api/ecosystem.config.cjs`
- **Environment:** Production-like settings
- **Health Check:** `/health` endpoint every 30s
- **Restart Policy:** Unless manually stopped

#### Nginx Service (Ports 80, 443)

- **Configuration:** `docker/nginx/nginx.conf`
- **Features:**
  - Reverse proxy to API
  - WebSocket support
  - Rate limiting (10 req/s)
  - GZIP compression
  - CORS headers
  - SSL/TLS support (if configured)

### Nginx Configuration

The nginx configuration includes:

**Rate Limiting:**
```nginx
limit_req zone=api_limit burst=20 nodelay;
limit_conn addr 10;
```

**WebSocket Support:**
```nginx
location /ws {
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

**Health Check (no rate limit):**
```nginx
location /health {
    access_log off;
}
```

### SSL/TLS Setup (Optional)

```bash
# Generate self-signed certificates for local testing
./scripts/generate-ssl-certs.sh

# Uncomment HTTPS server block in docker/nginx/nginx.conf

# Restart nginx
docker-compose restart nginx

# Access: https://localhost (will show security warning)
```

⚠️ **Warning:** Self-signed certificates are for LOCAL TESTING ONLY. Use proper certificates in production.

### Accessing Services

| Service | URL | Description |
|---------|-----|-------------|
| API (Direct) | http://localhost:3001 | Direct access to API |
| API (via Nginx) | http://localhost/api | Through reverse proxy |
| Health Check | http://localhost/api/health | Health endpoint |
| WebSocket | ws://localhost/ws | WebSocket connection |

### Production Parity

**Matching AWS EC2:**
- ✅ Same Node.js version (20.19.6)
- ✅ PM2 process manager
- ✅ Production environment variables
- ✅ Nginx reverse proxy
- ✅ Health checks
- ✅ Auto-restart on failure

**Differences from AWS:**
- ❌ No actual AWS services (S3, RDS, etc.)
- ❌ Single instance (no load balancing)
- ❌ No CloudWatch logging
- ❌ No IAM roles

---

## GitHub Actions Local Testing

### Overview

Use `act` to run GitHub Actions workflows locally without pushing to GitHub.

### Installation

**Windows (Chocolatey):**
```powershell
choco install act-cli
```

**macOS (Homebrew):**
```bash
brew install act
```

**Linux:**
```bash
# Download from https://github.com/nektos/act/releases
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

**Verify Installation:**
```bash
act --version
```

### Configuration

Create `.actrc` in project root:
```bash
# Use medium-sized Docker image (good balance)
-P ubuntu-latest=catthehacker/ubuntu:act-latest

# Reuse containers for faster runs
--reuse

# Use GitHub token for API access (optional)
-s GITHUB_TOKEN=your_token_here
```

### Usage

#### List Workflows

```bash
# List all workflows
act -l

# Output example:
# Stage  Job ID        Job name           Workflow name              Workflow file
# 0      test-backend  test-backend       CI - Terrain Simulation    ci.yml
# 0      test-frontend test-frontend      CI - Terrain Simulation    ci.yml
```

#### Run Workflows

```bash
# Run all workflows
act

# Run specific workflow
act -W .github/workflows/ci.yml

# Run specific job
act -j test-backend

# Run on specific event
act push
act pull_request
act workflow_dispatch
```

#### Dry Run

```bash
# See what would run without executing
act -n

# Show what would run for a specific job
act -j test-backend -n
```

#### With Secrets

```bash
# Pass secrets via command line
act -s GITHUB_TOKEN=ghp_xxxxx

# Or create .secrets file:
# GITHUB_TOKEN=ghp_xxxxx
# AWS_ACCESS_KEY_ID=AKIAXXXXX
act --secret-file .secrets
```

⚠️ **Important:** Never commit `.secrets` file. Add to `.gitignore`.

#### Debugging

```bash
# Verbose output
act -v

# Very verbose (debug mode)
act -vv

# Interactive shell on failure
act --shell /bin/bash
```

### Limitations

**What Works:**
- ✅ Basic workflow execution
- ✅ Job steps and commands
- ✅ Environment variables
- ✅ Checkout actions
- ✅ Most official GitHub actions

**What Doesn't Work:**
- ❌ Workflow artifacts (partially supported)
- ❌ Workflow caching (limited support)
- ❌ GitHub-hosted runner features
- ❌ Some marketplace actions
- ❌ GitHub API integrations (requires token)

### Example: Testing CI Workflow

```bash
# Test frontend build
act -j test-frontend

# Test backend with specific Node version
act -j test-backend --matrix nodejs:20

# Test entire CI pipeline
act -W .github/workflows/ci.yml

# Test with environment variables
act -j test-backend --env NODE_ENV=test
```

### Tips

1. **First run is slow** - Downloads Docker images
2. **Reuse containers** - Add `--reuse` flag or to `.actrc`
3. **Test locally before push** - Catch issues early
4. **Use medium image** - Balance between size and features
5. **Check job compatibility** - Some jobs may need modification

---

## Log Capture Scripts

### Overview

Scripts to capture logs from all deployment platforms:
- AWS EC2 (PM2, nginx, system logs)
- GitHub Actions (workflow logs)
- Cloudflare Pages (build logs)

### Prerequisites

**AWS Log Capture:**
```bash
# SSH access to EC2 instance
ssh-keygen -t rsa -b 4096 -f ~/.ssh/terrainsim-ec2
# Add public key to EC2 instance
```

**GitHub Log Capture:**
```bash
# GitHub CLI
winget install GitHub.cli  # Windows
brew install gh            # macOS

# Authenticate
gh auth login
```

**Cloudflare Log Capture:**
```bash
# Cloudflare API token
# Create at: https://dash.cloudflare.com/profile/api-tokens
# Required permissions: Workers R2 Storage, Pages
```

### AWS Log Capture

**Script:** `scripts/capture-aws-logs.sh`

```bash
# Capture PM2 logs
./scripts/capture-aws-logs.sh pm2

# Capture nginx access logs
./scripts/capture-aws-logs.sh nginx-access

# Capture nginx error logs
./scripts/capture-aws-logs.sh nginx-error

# Capture system logs
./scripts/capture-aws-logs.sh system

# Capture all logs
./scripts/capture-aws-logs.sh all

# Save to file
./scripts/capture-aws-logs.sh all > logs/aws-$(date +%Y%m%d).log
```

**Configuration:**
Create `.aws-logs.conf`:
```bash
EC2_HOST=ec2-user@your-instance.compute.amazonaws.com
EC2_KEY=~/.ssh/terrainsim-ec2
PM2_APP_NAME=simulation-api
```

### GitHub Actions Log Capture

**Script:** `scripts/capture-gh-logs.sh`

```bash
# List recent workflow runs
./scripts/capture-gh-logs.sh list

# Capture latest run logs
./scripts/capture-gh-logs.sh latest

# Capture specific run
./scripts/capture-gh-logs.sh run 1234567890

# Capture specific job
./scripts/capture-gh-logs.sh job test-backend

# Download logs
./scripts/capture-gh-logs.sh download 1234567890 logs/gh-logs.zip
```

### Cloudflare Log Capture

**Script:** `scripts/capture-cloudflare-logs.sh`

```bash
# Set API token
export CLOUDFLARE_API_TOKEN=your_token_here

# Capture latest deployment logs
./scripts/capture-cloudflare-logs.sh latest

# Capture specific deployment
./scripts/capture-cloudflare-logs.sh deployment abc123

# List deployments
./scripts/capture-cloudflare-logs.sh list

# Save logs
./scripts/capture-cloudflare-logs.sh latest > logs/cf-$(date +%Y%m%d).log
```

### Log Aggregation

**Script:** `scripts/aggregate-logs.sh`

Combines logs from all platforms into a unified format.

```bash
# Aggregate all logs
./scripts/aggregate-logs.sh

# Specify time range
./scripts/aggregate-logs.sh --from "2026-01-19 00:00" --to "2026-01-19 23:59"

# Filter by severity
./scripts/aggregate-logs.sh --level error

# Filter by source
./scripts/aggregate-logs.sh --source aws

# Output to file
./scripts/aggregate-logs.sh > logs/aggregated-$(date +%Y%m%d).log
```

**Unified Log Format:**
```json
{
  "timestamp": "2026-01-19T10:30:00Z",
  "source": "aws-pm2",
  "level": "error",
  "message": "Native addon failed to load",
  "context": {
    "file": "index.js",
    "line": 42,
    "instance": "i-0123456789abcdef"
  }
}
```

### Log Viewer

**HTML Dashboard:** `scripts/view-logs.html`

```bash
# Open log viewer
open scripts/view-logs.html  # macOS
start scripts/view-logs.html # Windows

# Or serve locally
python -m http.server 8080
# Navigate to: http://localhost:8080/scripts/view-logs.html
```

Features:
- Real-time log streaming
- Filter by source, level, time range
- Search across all logs
- Export filtered results
- Syntax highlighting

---

## Environment Variables

### Development (.env.local)

```bash
# API Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug
ENABLE_CORS=true

# C++ Native Addon
NATIVE_ADDON_PATH=../../libs/core/build/Release

# Feature Flags
ENABLE_WEBSOCKET=true
ENABLE_JOB_SYSTEM=true
```

### Docker (.env.docker)

```bash
# API Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
ENABLE_CORS=true

# Performance
PM2_INSTANCES=2
PM2_MAX_MEMORY_RESTART=500M

# Nginx
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
```

### AWS EC2 (.env.production)

```bash
# API Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn
ENABLE_CORS=false

# AWS Integration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXX
AWS_SECRET_ACCESS_KEY=secret

# Monitoring
ENABLE_APM=true
APM_SERVICE_NAME=terrainsim-api

# PM2
PM2_INSTANCES=max
PM2_MAX_MEMORY_RESTART=1G
```

### GitHub Actions

Configured in `.github/workflows/*.yml` and repository secrets:

**Secrets (Repository Settings → Secrets):**
- `AWS_ACCESS_KEY_ID` - AWS deployment credentials
- `AWS_SECRET_ACCESS_KEY` - AWS deployment credentials
- `EC2_SSH_KEY` - SSH private key for EC2
- `CLOUDFLARE_API_TOKEN` - Cloudflare deployment token

**Variables:**
```yaml
env:
  NODE_VERSION: '20.19.6'
  PNPM_VERSION: '9.15.4'
  CI: true
```

### Cloudflare Pages

Set in Cloudflare Dashboard → Pages → Settings → Environment Variables:

**Build Variables:**
```
NODE_VERSION=20
PNPM_VERSION=9
```

**Runtime Variables:**
```
NODE_ENV=production
```

### Environment Variable Reference

| Variable | Dev | Docker | AWS | GH Actions | Cloudflare | Description |
|----------|-----|--------|-----|------------|------------|-------------|
| `NODE_ENV` | development | production | production | test | production | Environment mode |
| `PORT` | 3001 | 3001 | 3001 | - | - | API port |
| `LOG_LEVEL` | debug | info | warn | info | - | Logging verbosity |
| `ENABLE_CORS` | true | true | false | - | - | CORS enabled |
| `PM2_INSTANCES` | 1 | 2 | max | - | - | PM2 instances |

---

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs api

# Remove and rebuild
docker-compose down -v
docker-compose up -d --build
```

**Port already in use:**
```bash
# Find process using port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # macOS/Linux

# Kill process or change port in docker-compose.yml
```

**Native addon not loading:**
```bash
# Rebuild C++ addon
cd libs/core
rm -rf build
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release

# Verify addon exists
ls -la libs/core/build/Release/*.node
```

### act Issues

**Workflow not found:**
```bash
# Ensure workflow file exists
ls -la .github/workflows/

# Check workflow syntax
act -n -W .github/workflows/ci.yml
```

**Action not supported:**
```bash
# Use alternative action
# OR skip step locally
act --skip-step unsupported-step
```

**Out of disk space:**
```bash
# Clean Docker images
docker system prune -a

# Use smaller act image
act -P ubuntu-latest=node:20-slim
```

### Log Capture Issues

**SSH connection refused:**
```bash
# Test SSH connection
ssh -i ~/.ssh/terrainsim-ec2 ec2-user@your-instance

# Check security group allows SSH (port 22)
# Check key permissions: chmod 600 ~/.ssh/terrainsim-ec2
```

**GitHub API rate limit:**
```bash
# Authenticate with token
gh auth login

# Check rate limit
gh api rate_limit
```

**Cloudflare API error:**
```bash
# Verify token has correct permissions
# Test API access
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

---

## Best Practices

1. **Test locally first** - Use Docker before deploying to AWS
2. **Validate workflows** - Use act before pushing to GitHub
3. **Capture logs regularly** - Run log capture daily for historical analysis
4. **Monitor resources** - Check Docker resource usage: `docker stats`
5. **Clean up** - Remove old containers/images: `docker system prune`
6. **Secure secrets** - Never commit `.env` or `.secrets` files
7. **Document changes** - Update this guide when modifying configurations

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
**Maintained By:** Development Team
