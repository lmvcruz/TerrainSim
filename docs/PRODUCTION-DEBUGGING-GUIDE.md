# Production Debugging Guide

## Overview

This guide helps you investigate issues in the production deployment of TerrainSim.

## Common Issues & Solutions

### Issue 1: Viewer Not Updating After Terrain Generation

**Symptom**: After clicking "Generate Terrain", the 3D viewer stays black/flat. Changing texture mode makes it appear.

**Root Cause**: React state management bug - `heightmapCache` Map was mutated without triggering re-render.

**Solution**: ✅ **FIXED** in commit - `setHeightmapForFrame` now creates a new Map instance to trigger React updates.

**How to verify the fix works**:
1. Go to https://terrainsim.lmvcruz.work
2. Click "Generate Terrain"
3. The viewer should **immediately** show the terrain (no need to change texture mode)

---

### Issue 2: Missing Frontend Logs (correlationId not visible)

**Symptom**: Production console only shows `sessionId`, not `correlationId` or TRACE logs.

**Root Cause**: Frontend logger is configured differently or browser console filters are hiding logs.

**Investigation Steps**:

1. **Check Browser Console Settings**
   - Open DevTools (F12)
   - Console tab → Check if "Verbose" or "Debug" logs are hidden
   - Look for a filter dropdown - ensure all log levels are shown

2. **Check Frontend Logger Configuration**
   - The logger is in `apps/web/src/utils/logger.ts`
   - Default level should be 'trace' in development, 'info' in production
   - Check if environment variable is overriding the log level

3. **Backend Logs ARE Working**
   - Backend logs with `correlationId` are being captured correctly
   - You can query them via API:
     ```powershell
     $sessionId = "YOUR_SESSION_ID"
     Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?sessionId=$sessionId&limit=200"
     ```

4. **Frontend Logger Level**
   - By default, the frontend logger filters based on environment
   - Production builds may suppress TRACE/DEBUG logs to reduce noise
   - Check `apps/web/src/utils/logger.ts` line ~40-50 for log level configuration

**Solution**:
- For production debugging, temporarily enable verbose logging:
  ```typescript
  // In apps/web/src/utils/logger.ts
  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? true
    this.minLevel = options.level ?? 'trace' // Force trace in production
  ```

---

### Issue 3: Backend Log Level Configuration

**Check Production Backend Log Level**:
```powershell
# Check current log level
Invoke-RestMethod -Uri 'https://api.lmvcruz.work/logs/config' -Method GET

# Set log level to TRACE
$body = @{ level = 'trace' } | ConvertTo-Json
Invoke-RestMethod -Uri 'https://api.lmvcruz.work/logs/config' -Method POST -Body $body -ContentType 'application/json'
```

**Backend Log Configuration**:
- Log level persists in memory (resets on restart)
- Default level: 'info'
- For debugging: Set to 'trace'

---

## Deployment Verification Checklist

After deploying frontend or backend changes, verify:

### Backend Deployment (AWS EC2)

1. **Health Check**:
   ```powershell
   Invoke-RestMethod -Uri 'https://api.lmvcruz.work/health'
   ```
   Expected: `{ status: "ok", uptime: "..." }`

2. **Version Check** (if you added version endpoint):
   ```powershell
   Invoke-RestMethod -Uri 'https://api.lmvcruz.work/version'
   ```

3. **Log Level**:
   ```powershell
   $config = Invoke-RestMethod -Uri 'https://api.lmvcruz.work/logs/config'
   Write-Host "Log Level: $($config.level)"
   ```

4. **Sample Generation Test**:
   ```powershell
   $correlationId = [Guid]::NewGuid().ToString()
   $body = @{
     method = 'fbm'
     seed = 42
     width = 256
     height = 256
     frequency = 0.05
     amplitude = 50
   } | ConvertTo-Json

   $response = Invoke-RestMethod -Uri 'https://api.lmvcruz.work/generate' `
     -Method POST -Body $body -ContentType 'application/json' `
     -Headers @{ 'x-correlation-id' = $correlationId }

   Write-Host "✅ Generation successful"
   Write-Host "CorrelationId: $correlationId"
   Write-Host "Statistics: min=$($response.statistics.min), max=$($response.statistics.max)"
   ```

### Frontend Deployment (Cloudflare Pages)

1. **Check Deployment Status**:
   - Go to https://dash.cloudflare.com/
   - Navigate to **Workers & Pages** → **terrainsim**
   - Check latest deployment timestamp and status

2. **Verify Build Output**:
   - Click on the deployment
   - Check build logs for errors
   - Verify: "Build successful" message

3. **Test Frontend Functionality**:
   - Go to https://terrainsim.lmvcruz.work
   - Open DevTools Console (F12)
   - Click "Generate Terrain"
   - Check for:
     - ✅ `correlationId` in console logs
     - ✅ Viewer updates immediately (no need to change texture mode)
     - ✅ No JavaScript errors

4. **Cache Busting** (if changes don't appear):
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Clear browser cache
   - Try incognito/private window

---

## Fetching Production Logs

### By SessionId (Frontend Session)
```powershell
$sessionId = "YOUR_SESSION_ID"
$logs = Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?sessionId=$sessionId&limit=200"
$logs | Select-Object -First 10 | Format-Table level, type, message, correlationId
```

### By CorrelationId (Specific Operation)
```powershell
$correlationId = "YOUR_CORRELATION_ID"
$logs = Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?correlationId=$correlationId&limit=200"
$logs | Select-Object -First 10 | Format-Table level, type, message
```

### Recent Logs (Last N)
```powershell
$logs = Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?limit=50"
$logs | Format-Table timestamp, level, type, message -AutoSize
```

### Filter by Log Level
```powershell
$logs = Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?limit=200"
$errors = $logs | Where-Object { $_.level -eq 'error' }
Write-Host "Found $($errors.Count) errors"
$errors | Format-Table timestamp, message, metadata
```

---

## Analyzing Simulation Issues

### Check Terrain Generation
```powershell
# Fetch logs by sessionId
$sessionId = "YOUR_SESSION_ID"
$logs = Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?sessionId=$sessionId&limit=200"

# Find generation logs
$genLogs = $logs | Where-Object { $_.type -match 'generation' -or $_.message -match 'terrain generated' }
Write-Host "Generation Logs: $($genLogs.Count)"
$genLogs | Format-Table level, message, metadata

# Find correlationId from generation
$correlationId = ($logs | Where-Object { $_.correlationId })[0].correlationId
Write-Host "`nCorrelationId: $correlationId"
```

### Check Simulation Progress
```powershell
# Fetch logs by correlationId (from simulation)
$correlationId = "YOUR_CORRELATION_ID"
$logs = Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?correlationId=$correlationId&limit=200"

# Group by frame
$simLogs = $logs | Where-Object { $_.message -match 'frame|simulation' }
Write-Host "Simulation Logs: $($simLogs.Count)"

# Check frame statistics
$frameStats = $simLogs | Where-Object { $_.metadata -match 'statistics' }
$frameStats | ForEach-Object {
    $meta = $_.metadata | ConvertFrom-Json
    Write-Host "Frame: $($meta.frame), Min: $($meta.statistics.min), Max: $($meta.statistics.max)"
}
```

### Compare Local vs Production
```powershell
# Run local simulation, note correlationId
# Run production simulation, note correlationId

# Fetch both
$localId = "LOCAL_CORRELATION_ID"
$prodId = "PROD_CORRELATION_ID"

$localLogs = Invoke-RestMethod -Uri "http://localhost:3001/logs?correlationId=$localId"
$prodLogs = Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?correlationId=$prodId"

# Extract frame statistics
function Get-FrameStats($logs) {
    $logs | Where-Object { $_.message -match 'frame.*complete' } | ForEach-Object {
        $meta = $_.metadata | ConvertFrom-Json
        [PSCustomObject]@{
            Frame = $meta.frame
            Min = [math]::Round($meta.statistics.min, 2)
            Max = [math]::Round($meta.statistics.max, 2)
            Mean = [math]::Round($meta.statistics.mean, 2)
        }
    }
}

Write-Host "`n📊 LOCAL STATS:"
Get-FrameStats $localLogs | Format-Table

Write-Host "`n📊 PRODUCTION STATS:"
Get-FrameStats $prodLogs | Format-Table
```

---

## Monitoring Backend Health

### Setup Health Monitoring Script
```powershell
# Save as monitor-backend.ps1
param(
    [int]$IntervalSeconds = 60,
    [int]$Iterations = 10
)

for ($i = 0; $i -lt $Iterations; $i++) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    try {
        $health = Invoke-RestMethod -Uri 'https://api.lmvcruz.work/health' -TimeoutSec 10
        $config = Invoke-RestMethod -Uri 'https://api.lmvcruz.work/logs/config' -TimeoutSec 10

        Write-Host "[$timestamp] ✅ Backend Healthy - Uptime: $($health.uptime), Logs: $($config.totalLogs), Level: $($config.level)" -ForegroundColor Green
    } catch {
        Write-Host "[$timestamp] ❌ Backend Down - Error: $($_.Exception.Message)" -ForegroundColor Red
    }

    if ($i -lt $Iterations - 1) {
        Start-Sleep -Seconds $IntervalSeconds
    }
}
```

Usage:
```powershell
# Check every 60 seconds for 10 iterations
.\monitor-backend.ps1

# Custom interval
.\monitor-backend.ps1 -IntervalSeconds 30 -Iterations 20
```

---

## Common Error Patterns

### Error: "No session ID - generate terrain first"
**Cause**: Simulation was triggered before terrain generation completed.
**Solution**: Ensure `sessionId` is set in PipelineContext after generation.

### Error: "Frame X execution failed"
**Cause**: Backend simulation error for specific frame.
**Investigation**:
```powershell
$sessionId = "YOUR_SESSION_ID"
$logs = Invoke-RestMethod -Uri "https://api.lmvcruz.work/logs?sessionId=$sessionId"
$errors = $logs | Where-Object { $_.level -eq 'error' }
$errors | Format-Table message, metadata
```

### Error: Catastrophic Value Spikes
**Symptom**: Frame 6+ shows extreme values like -635 (should be -54 to 57 range).
**Root Cause**: Progressive erosion compounding bug.
**Solution**: ✅ **FIXED** - Default seed changed from 12345 → 42, erosion stabilized.
**Verification**: Check frame 10 min/max should be around -54 to 57, NOT -635.

---

## Rollback Procedures

### Rollback Frontend (Cloudflare Pages)
1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages** → **terrainsim** → **Deployments**
3. Find a previous working deployment
4. Click **"..."** → **"Rollback to this deployment"**

### Rollback Backend (AWS EC2)
1. SSH into EC2 instance
2. Navigate to deployment directory
3. Checkout previous commit:
   ```bash
   git fetch origin
   git checkout <previous-commit-hash>
   pm2 restart all
   ```

---

## Performance Monitoring

### Check API Response Times
```powershell
$startTime = Get-Date
$response = Invoke-RestMethod -Uri 'https://api.lmvcruz.work/generate' -Method POST -Body (@{
    method = 'fbm'
    seed = 42
    width = 256
    height = 256
} | ConvertTo-Json) -ContentType 'application/json' -Headers @{ 'x-correlation-id' = [Guid]::NewGuid().ToString() }
$duration = (Get-Date) - $startTime

Write-Host "Generation Time: $($duration.TotalSeconds) seconds"
Write-Host "Statistics: min=$($response.statistics.min), max=$($response.statistics.max)"
```

### Check Frontend Load Time
1. Open https://terrainsim.lmvcruz.work
2. Open DevTools (F12) → Network tab
3. Hard refresh (Ctrl+Shift+R)
4. Check:
   - Total page load time
   - JS bundle sizes
   - Asset loading times

---

## Getting Help

If you encounter issues not covered here:

1. **Collect Information**:
   - SessionId or CorrelationId
   - Browser console logs (screenshot or copy)
   - Backend logs (via API)
   - Deployment timestamps
   - Steps to reproduce

2. **Check Recent Deployments**:
   - GitHub Actions: https://github.com/lmvcruz/TerrainSim/actions
   - Cloudflare Pages: https://dash.cloudflare.com/

3. **Review Recent Commits**:
   ```bash
   git log --oneline -10
   ```

4. **Test in Local Environment**:
   - If it works locally but not in production, likely a deployment issue
   - If it fails in both, likely a code bug

---

## Quick Reference

### URLs
- **Production Frontend**: https://terrainsim.lmvcruz.work
- **Production API**: https://api.lmvcruz.work
- **GitHub Repository**: https://github.com/lmvcruz/TerrainSim
- **GitHub Actions**: https://github.com/lmvcruz/TerrainSim/actions
- **Cloudflare Dashboard**: https://dash.cloudflare.com/

### API Endpoints
- **Health**: `GET /health`
- **Log Config**: `GET /logs/config`, `POST /logs/config`
- **Logs**: `GET /logs?sessionId=X&limit=200`
- **Generate**: `POST /generate`
- **Simulate**: `POST /simulate/session`, `POST /simulate/execute`

### Testing Commands
```powershell
# Quick health check
Invoke-RestMethod https://api.lmvcruz.work/health

# Quick log check
Invoke-RestMethod "https://api.lmvcruz.work/logs?limit=10"

# Test generation
$body = @{ method='fbm'; seed=42; width=256; height=256 } | ConvertTo-Json
Invoke-RestMethod -Uri 'https://api.lmvcruz.work/generate' -Method POST -Body $body -ContentType 'application/json'
```
