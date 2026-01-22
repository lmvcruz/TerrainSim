# Production vs Local Terrain Generation Testing Guide

## Quick Start

This guide helps you compare terrain generation between production and local environments to identify differences.

## Prerequisites

- Local development environment running:
  - Backend: `http://localhost:3001`
  - Frontend: `http://localhost:5173`
- Production environment accessible:
  - Frontend: `https://terrainsim.lmvcruz.work`
  - API: `https://api.lmvcruz.work`

## Default Test Parameters

The frontend now uses **consistent default parameters** for easy testing:

```typescript
{
  method: 'Perlin',
  seed: 42,
  frequency: 0.05,
  amplitude: 50,
  width: 256,
  height: 256
}
```

## Testing Workflow

### Step 1: Generate Terrain on Production

1. Open production: **https://terrainsim.lmvcruz.work**
2. Click **"Generate Terrain"** button (uses default parameters)
3. Open browser DevTools Console (F12)
4. Look for the log: `🎯 GENERATION #X` or `Generating terrain`
5. **Copy the `correlationId`** (e.g., `57810b6b-9ee2-4538-a779-1a99d8e69572`)

**Finding the correlationId:**
```javascript
// Look for logs like:
[PipelineBuilder] Generating terrain
  correlationId: "57810b6b-9ee2-4538-a779-1a99d8e69572"
  method: "perlin"
  width: 256
  height: 256
  seed: 42
```

### Step 2: Generate Terrain Locally

1. Open local environment: **http://localhost:5173**
2. **Ensure parameters match production** (they should by default):
   - Method: Perlin
   - Seed: 42
   - Frequency: 0.05
   - Amplitude: 50
   - Width: 256
   - Height: 256
3. Click **"Generate Terrain"** button
4. Open browser DevTools Console (F12)
5. **Copy the `correlationId`** (e.g., `abc-123-local`)

### Step 3: Compare Logs

Run the comparison script:

```powershell
pnpm tsx scripts/compare-logs.ts <production-correlationId> <local-correlationId>
```

**Example:**
```powershell
pnpm tsx scripts/compare-logs.ts 57810b6b-9ee2-4538-a779-1a99d8e69572 abc-123-local
```

### Step 4: Analyze Results

The script will output:

1. **Summary** - Total logs, backend/frontend counts, duration
2. **Differences** - Categorized by:
   - Parameter differences
   - Backend differences
   - Frontend differences
   - Timing differences
3. **Detailed Logs** - Full log output for both environments

## What to Look For

### 🎯 Parameter Mismatches

Check if all parameters match:
- ✅ Same seed
- ✅ Same dimensions (width/height)
- ✅ Same method
- ✅ Same frequency/amplitude

**If different:** Parameters aren't synchronized - adjust manually or clear browser cache.

### 🖥️ Backend Differences

**Missing logs:** Indicates code path divergence
- Component present in one but not the other
- Different execution flow

**Different messages:** Code running differently
- Check backend version
- Check for uncommitted changes

### 🌐 Frontend Differences

**Missing components:** Frontend code differs
- Check for build differences
- Verify deployed version matches local

### ⏱️ Timing Differences

**Significant timing differences (>100ms):**
- Hardware differences (expected)
- Performance optimization differences
- Different data processing

## Common Issues

### Issue: No logs found for correlationId

**Solution:**
1. Check if correlation ID was copied correctly
2. Verify the environment is running
3. Check if logs were sent (network tab in DevTools)
4. Ensure log level is set to TRACE: `curl -X POST http://localhost:3001/logs/config -H "Content-Type: application/json" -d '{"level":"trace"}'`

### Issue: Frontend logs missing

**Solution:**
1. Check browser console for errors
2. Verify log batching is working (logs sent every 2 seconds)
3. Check network tab for `/logs` POST requests

### Issue: Parameters don't match

**Solution:**
1. Clear browser localStorage: `localStorage.clear()`
2. Refresh both production and local
3. Verify default parameters in both environments

## Manual Verification

### Check logs directly via API:

**Production:**
```powershell
Invoke-WebRequest -Uri "https://api.lmvcruz.work/logs?correlationId=<id>" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Local:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/logs?correlationId=<id>" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### View latest operations:

**Production:**
```powershell
Invoke-WebRequest -Uri "https://api.lmvcruz.work/logs/latest" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Local:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/logs/latest" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## Expected Output Example

```
═══════════════════════════════════════════════════════════════
                    LOG COMPARISON RESULTS
═══════════════════════════════════════════════════════════════

📊 SUMMARY

  Production:
    Total Logs: 45
    Backend:    23
    Frontend:   22
    Duration:   234ms

  Local:
    Total Logs: 45
    Backend:    23
    Frontend:   22
    Duration:   221ms

⚠️  DIFFERENCES FOUND: 1

⏱️  TIMING DIFFERENCES:

  • Backend execution time differs by 13ms
    Production: 234ms
    Local:      221ms
    Difference: 13ms

```

## Tips for Effective Testing

1. **Use Fixed Seeds** - Always test with the same seed (default: 42)
2. **Test Multiple Times** - Run 3-5 generations to see consistent patterns
3. **Compare Same Operations** - Ensure you're testing the same feature
4. **Check Timestamps** - Logs should be recent (within last few minutes)
5. **Clear Cache** - Clear browser localStorage if parameters seem stuck

## Advanced: Comparing Different Scenarios

To test different parameters:

1. Update parameters in both environments manually
2. Generate terrain
3. Compare logs as usual

**Example - Testing larger terrain:**
```typescript
{
  seed: 42,
  width: 512,  // Changed
  height: 512, // Changed
  frequency: 0.05,
  amplitude: 50
}
```

## Troubleshooting

### Script won't run

```powershell
# Install dependencies if needed
pnpm install

# Try running directly with tsx
pnpm exec tsx scripts/compare-logs.ts <prod-id> <local-id>
```

### Can't access production logs

Check CORS and network access:
```powershell
curl https://api.lmvcruz.work/logs/latest
```

### Logs not showing in console

1. Open DevTools Console
2. Set filter to "All levels"
3. Look for logs with prefix: `[PipelineBuilder]`, `[TerrainViewer]`, etc.
4. Check network tab for log submissions to `/logs` endpoint

## Next Steps

After identifying differences:

1. **Document findings** - Note what differs and where
2. **Check code versions** - Ensure deployed version matches local
3. **Review changes** - Look at recent commits that might explain differences
4. **Fix discrepancies** - Update code to align both environments
5. **Re-test** - Verify fixes with another comparison

## Contact & Support

For issues or questions about this testing process, refer to:
- Implementation Plan: `docs/temp/centralized-logging-implementation.md`
- API Documentation: `docs/spec/API.md`
