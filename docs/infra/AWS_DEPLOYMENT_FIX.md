# AWS Deployment Fix - Uncommitted Changes Issue

## Problem
The AWS EC2 server has **uncommitted local changes** to `package.json` and `pnpm-lock.yaml`, which prevents `git pull` from working:

```
error: Your local changes to the following files would be overwritten by merge:
	package.json
	pnpm-lock.yaml
Please commit your changes or stash them before you merge.
Aborting
```

This causes the deployment to **fail silently** - the CI/CD reports success, but the server continues running old code.

## Current Status
- ✅ Frontend deployed successfully (commit 682f4e8)
- ❌ Backend deployment failed to update code
- ✅ CORS configuration is correct
- ❌ `/simulate/create` returns 404 (old code running)

## Immediate Fix (Manual)

SSH into your AWS EC2 server and run:

```bash
ssh ubuntu@54.242.131.12

cd /var/www/terrainsim

# Check what files have local changes
git status

# Stash the local changes
git stash

# Pull the latest code
git pull origin main

# Verify you're on the correct commit
git log -1 --oneline
# Should show: 682f4e8 fix: use tsx for production start script

# Reinstall dependencies
pnpm install

# Restart PM2
pm2 restart terrainsim-api

# Wait 10 seconds
sleep 10

# Test the endpoint
curl -X POST https://api.lmvcruz.work/simulate/create \
  -H "Content-Type: application/json" \
  -H "Origin: https://terrainsim.lmvcruz.work" \
  -d '{"config": {"test": "data"}}'

# Should return 400 or 500, NOT 404
```

## Permanent Fix (Update CI/CD)

Update your GitHub Actions workflow file to handle uncommitted changes:

**File:** `.github/workflows/deploy-backend.yml`

Find the deployment step and add git stash before pull:

```yaml
- name: Deploy to AWS EC2
  run: |
    ssh -o StrictHostKeyChecking=no ubuntu@54.242.131.12 '
      cd /var/www/terrainsim
      echo "📥 Pulling latest code from main branch..."

      # Stash any local changes first
      if ! git diff-index --quiet HEAD --; then
        echo "⚠️  Local changes detected, stashing..."
        git stash
      fi

      git pull origin main

      echo "📦 Installing/updating dependencies..."
      pnpm install
    '
```

## Alternative: Force Clean Pull

If you don't care about local changes:

```bash
ssh ubuntu@54.242.131.12 '
  cd /var/www/terrainsim

  # Discard all local changes
  git reset --hard

  # Pull latest
  git pull origin main

  # Continue with deployment...
  pnpm install
  pm2 restart terrainsim-api
'
```

## Verification

After fixing, verify the deployment:

```bash
# Check commit hash
git log -1 --format=%H
# Should be: 682f4e854ee5833b922673370d51b47b5556b734

# Check PM2 status
pm2 status

# Test health endpoint
curl https://api.lmvcruz.work/health

# Test simulate/create (should NOT return 404)
curl -X POST https://api.lmvcruz.work/simulate/create \
  -H "Content-Type: application/json" \
  -d '{"config": {}}'
```

## Root Cause Analysis

The local changes likely occurred during:
1. Manual testing/debugging on the server
2. Previous failed deployments
3. pnpm installing different dependency versions

## Prevention

1. **Never manually edit files** on production server
2. **Use environment variables** for configuration (not file edits)
3. **Add git stash** to deployment script
4. **Monitor deployment logs** for git errors
5. **Add post-deployment verification** that checks commit hash

## Related Files
- `.github/workflows/deploy-backend.yml` - GitHub Actions deployment script
- `apps/simulation-api/package.json` - Start script with tsx
- `docs/infra/DEPLOYMENT.md` - General deployment documentation
