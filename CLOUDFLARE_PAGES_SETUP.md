# Cloudflare Pages Configuration Issue

## Problem
Deployed page is empty: https://0fe5117a.terrainsim.pages.dev

## Root Cause
The build is using an incorrect `BASE_PATH` environment variable, causing asset paths to be prefixed with `/TerrainSim/` instead of `/`.

## Solution

### Cloudflare Pages Settings
Go to: https://dash.cloudflare.com → Workers & Pages → terrainsim → Settings

**Build Configuration:**
- **Build command**: `pnpm install && pnpm --filter @terrain/web run build`
- **Build output directory**: `apps/web/dist`
- **Root directory**: (leave empty / default)

**Environment Variables:**
- **Remove any `BASE_PATH` variable** if it exists
- Ensure no environment variables are interfering with the build

**Node Version:**
- Set to `20` or `20.19.6`

### Verification Steps
1. Go to Cloudflare Pages dashboard
2. Trigger a new deployment (Deployments → Retry deployment OR push a commit)
3. Monitor build logs for errors
4. Check the deployed site

### Expected Result
- Assets should load from `/assets/` (not `/TerrainSim/assets/`)
- Application should render correctly
- No 404 errors for JS/CSS files

## Quick Fix Command
If building locally before deployment:
```bash
cd apps/web
$env:BASE_PATH="" # PowerShell
# or
export BASE_PATH="" # bash
pnpm run build
```

## Production URLs
- **Primary**: https://terrainsim.lmvcruz.work
- **Preview**: https://0fe5117a.terrainsim.pages.dev (or latest deployment URL)
