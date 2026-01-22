# Production vs Local Comparison - Setup Complete ✅

## What's Been Set Up

### 1. **Consistent Default Parameters** 🎯

The frontend now uses **seed: 42** by default (changed from 12345) to make testing easier and more consistent.

**Default Parameters:**
- Method: Perlin
- Seed: 42
- Frequency: 0.05
- Amplitude: 50
- Width: 256
- Height: 256

**Files Modified:**
- `apps/web/src/contexts/PipelineContext.tsx` - Updated DEFAULT_CONFIG
- `apps/web/src/components/pipeline/PipelineBuilder.tsx` - Updated fallback seed value

### 2. **Log Comparison Script** 📊

A comprehensive comparison tool that analyzes logs from both environments.

**File:** `scripts/compare-logs.ts`

**Features:**
- Fetches logs from production and local APIs
- Compares parameters, backend logs, frontend logs, and timings
- Shows detailed differences with clear categorization
- Displays full log output for both environments

**Usage:**
```powershell
pnpm tsx scripts/compare-logs.ts <production-correlationId> <local-correlationId>
```

### 3. **Test Helper Script** 🛠️

Simplified commands for common testing workflows.

**File:** `scripts/test-helper.ts`

**Commands:**
```powershell
pnpm test:compare    # Interactive mode (prompts for IDs)
pnpm test:latest     # Compare latest production vs local
pnpm test:prod <id>  # Show production logs for correlationId
pnpm test:local <id> # Show local logs for correlationId
```

### 4. **Testing Guide** 📖

Complete documentation on how to test and compare environments.

**File:** `docs/testing-production-vs-local.md`

**Includes:**
- Step-by-step testing workflow
- Common issues and solutions
- Expected output examples
- Tips for effective testing

---

## Quick Testing Workflow

### Option 1: Interactive Mode (Easiest)

```powershell
pnpm test:compare
```

This will:
1. Show you the steps to follow
2. Prompt you for production correlationId
3. Prompt you for local correlationId
4. Run the comparison automatically

### Option 2: Compare Latest

```powershell
pnpm test:latest
```

This automatically:
1. Fetches the latest correlationId from production
2. Fetches the latest correlationId from local
3. Runs the comparison

**Note:** This only works if you've generated terrain recently on both environments.

### Option 3: Manual Comparison

```powershell
# 1. Generate on production, copy correlationId
# 2. Generate on local, copy correlationId
# 3. Run comparison
pnpm tsx scripts/compare-logs.ts <prod-id> <local-id>
```

---

## Complete Testing Example

### Step 1: Generate on Production

1. Open: **https://terrainsim.lmvcruz.work**
2. Click "Generate Terrain" (uses default seed: 42)
3. Open DevTools Console (F12)
4. Find log: `[PipelineBuilder] Generating terrain`
5. Copy `correlationId`: `57810b6b-9ee2-4538-a779-1a99d8e69572`

### Step 2: Generate Locally

1. Open: **http://localhost:5173**
2. Verify parameters match (should by default)
3. Click "Generate Terrain"
4. Open DevTools Console (F12)
5. Find log: `[PipelineBuilder] Generating terrain`
6. Copy `correlationId`: `abc-123-local`

### Step 3: Compare

```powershell
pnpm test:compare

# When prompted:
# Production correlationId: 57810b6b-9ee2-4538-a779-1a99d8e69572
# Local correlationId: abc-123-local
```

### Step 4: Analyze Output

The comparison will show:

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

✅ NO DIFFERENCES FOUND - Logs are identical!
```

Or if differences exist:

```
⚠️  DIFFERENCES FOUND: 3

🎛️  PARAMETER DIFFERENCES:
  • Parameter 'seed' differs
    Production: 42
    Local:      12345

⏱️  TIMING DIFFERENCES:
  • Backend execution time differs by 13ms
    Production: 234ms
    Local:      221ms
```

---

## Quick Reference Commands

```powershell
# Interactive comparison (recommended)
pnpm test:compare

# Compare latest
pnpm test:latest

# View specific logs
pnpm test:prod 57810b6b-9ee2-4538-a779-1a99d8e69572
pnpm test:local abc-123-local

# Manual comparison with full details
pnpm tsx scripts/compare-logs.ts <prod-id> <local-id>
```

---

## Verifying Setup

### Check Default Parameters

1. Open frontend locally: `http://localhost:5173`
2. Check Pipeline Builder panel
3. Verify **Seed: 42** (not 12345)

### Check Logging System

```powershell
# Local backend should be running
curl http://localhost:3001/logs/latest

# Production should be accessible
curl https://api.lmvcruz.work/logs/latest
```

### Set Log Level to TRACE

```powershell
# Local
curl -X POST http://localhost:3001/logs/config `
  -H "Content-Type: application/json" `
  -d '{"level":"trace"}'

# Production (if needed)
curl -X POST https://api.lmvcruz.work/logs/config `
  -H "Content-Type: application/json" `
  -d '{"level":"trace"}'
```

---

## Troubleshooting

### Can't find correlationId

**Solution:** Check browser console logs:
1. Open DevTools (F12)
2. Console tab
3. Look for `[PipelineBuilder] Generating terrain`
4. Expand the log to see `correlationId`

### No logs returned

**Solution:**
1. Ensure terrain was generated (check browser console)
2. Wait 2-3 seconds for log batching
3. Check Network tab for POST to `/logs`
4. Verify correlationId is correct

### Parameters don't match

**Solution:**
1. Clear browser cache: `localStorage.clear()`
2. Refresh page
3. Verify default seed is 42 (not 12345)

### Script errors

**Solution:**
```powershell
# Ensure dependencies are installed
pnpm install

# Try running with explicit tsx
pnpm exec tsx scripts/test-helper.ts compare
```

---

## What to Test

### Basic Comparison
- Same parameters → Same results?
- Timing differences
- Log completeness

### Parameter Variations
- Different seeds
- Different dimensions (512x512)
- Different methods (Perlin vs FBM)

### Edge Cases
- Large terrains (1024x1024)
- Extreme parameters
- Error handling

---

## Next Steps

1. ✅ **Run first comparison** - Use `pnpm test:compare`
2. 📊 **Document findings** - Note any differences
3. 🔍 **Investigate discrepancies** - Identify root causes
4. 🛠️ **Fix issues** - Update code as needed
5. ✅ **Verify fixes** - Re-run comparison

---

## Files Created/Modified

### Created:
- ✅ `scripts/compare-logs.ts` - Main comparison script
- ✅ `scripts/test-helper.ts` - Simplified testing commands
- ✅ `docs/testing-production-vs-local.md` - Comprehensive testing guide
- ✅ `docs/testing-setup-complete.md` - This file

### Modified:
- ✅ `apps/web/src/contexts/PipelineContext.tsx` - Default seed: 42
- ✅ `apps/web/src/components/pipeline/PipelineBuilder.tsx` - Fallback seed: 42
- ✅ `package.json` - Added test helper commands

---

## Summary

You now have a complete testing system to compare production vs local terrain generation:

1. **Consistent Parameters** - Default seed: 42 for easy testing
2. **Comparison Tools** - Automated log comparison and analysis
3. **Helper Commands** - Simple commands for common workflows
4. **Documentation** - Complete guides and examples

**Start testing now:**
```powershell
pnpm test:compare
```

Good luck debugging! 🚀
