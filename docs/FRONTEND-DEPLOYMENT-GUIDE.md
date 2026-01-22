# Frontend Deployment Setup

## Quick Fix (Manual Deployment)

Your production frontend is **out of date** and still has the simulation bug. Here's how to deploy the fix:

### Cloudflare Pages Manual Deployment

1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages** → **terrainsim**
3. Click **Create deployment** (or **View details** → **Deployments** → **Create deployment**)
4. Select branch: `main`
5. Click **Save and Deploy**

**This will deploy the fixed code to https://terrainsim.lmvcruz.work**

---

## Automated Deployment (Optional - for future)

I've created `.github/workflows/deploy-frontend.yml` to automatically deploy the frontend when code is pushed to `main`.

### Setup Cloudflare Secrets

To enable the automated workflow, add these secrets to your GitHub repository:

1. Go to https://github.com/lmvcruz/TerrainSim/settings/secrets/actions
2. Click **New repository secret**
3. Add these secrets:

#### `CLOUDFLARE_API_TOKEN`
- Go to https://dash.cloudflare.com/profile/api-tokens
- Click **Create Token**
- Use template: **Edit Cloudflare Workers**
- Or create custom token with permissions:
  - Account > Cloudflare Pages > Edit
- Copy the token and save it as `CLOUDFLARE_API_TOKEN`

#### `CLOUDFLARE_ACCOUNT_ID`
- Go to https://dash.cloudflare.com/
- Click on **Workers & Pages**
- Your Account ID is shown on the right sidebar
- Copy and save it as `CLOUDFLARE_ACCOUNT_ID`

### Test the Workflow

After adding the secrets:
```bash
# Push changes to trigger auto-deployment
git add .github/workflows/deploy-frontend.yml
git commit -m "Add automated frontend deployment workflow"
git push origin main
```

Or manually trigger it:
- Go to https://github.com/lmvcruz/TerrainSim/actions/workflows/deploy-frontend.yml
- Click **Run workflow**

---

## Verify Deployment

After deployment, verify the fix is live:

1. Go to https://terrainsim.lmvcruz.work
2. Generate terrain with default parameters (seed 42)
3. Simulate 10 frames
4. Check the logs - you should now see:
   - ✅ `correlationId` (not `sessionId`)
   - ✅ Stable erosion values (-54 to 57 range)
   - ✅ NO catastrophic spikes (-635)

---

## Why This Happened

- **Backend**: Deployed automatically via `.github/workflows/deploy-backend.yml` to AWS EC2 ✅
- **Frontend**: Was NOT configured for automatic deployments ❌
- **Result**: Backend was updated but frontend was still serving old code

With the new workflow, both will deploy automatically when you push to `main`.
