# Phase 3.1 Local Testing Guide

## Overview

This document provides comprehensive testing procedures for Phase 3.1 - Local Testing of the logging infrastructure.

## Prerequisites

1. **Backend Server Running**:
```bash
cd apps/simulation-api
pnpm run dev
```

2. **Verify Server Started**:
- Check console output shows: "TerrainSim API server running on http://localhost:3001"
- Verify Winston initialized successfully

## Test Execution

### Automated Testing

Run the comprehensive test script:
```powershell
cd D:\playground\TerrainSim
.\scripts\test-phase-3.1.ps1
```

The script tests 15 different scenarios across all logging components.

### Manual Testing (if automated tests fail)

#### Test 1: Backend Health Check
```powershell
Invoke-RestMethod http://localhost:3001/health
```

**Expected**: `{ "status": "ok", "timestamp": "..." }`

#### Test 2: Get Current Log Level
```powershell
Invoke-RestMethod http://localhost:3001/admin/log-level
```

**Expected**: Returns current level (debug), environment, log directory

#### Test 3: Change Log Level to Info
```powershell
$body = @{ level = "info" } | ConvertTo-Json
Invoke-RestMethod http://localhost:3001/admin/log-level -Method POST -Body $body -ContentType "application/json"
```

**Expected**: Returns success with previousLevel and currentLevel

#### Test 4: Verify Level Changed
```powershell
Invoke-RestMethod http://localhost:3001/admin/log-level
```

**Expected**: currentLevel should be "info"

#### Test 5: Restore to Debug
```powershell
$body = @{ level = "debug" } | ConvertTo-Json
Invoke-RestMethod http://localhost:3001/admin/log-level -Method POST -Body $body -ContentType "application/json"
```

**Expected**: Successfully restored to debug

#### Test 6: Test Invalid Level (Should Fail with 400)
```powershell
$body = @{ level = "invalid" } | ConvertTo-Json
try {
    Invoke-RestMethod http://localhost:3001/admin/log-level -Method POST -Body $body -ContentType "application/json"
} catch {
    $_.Exception.Response.StatusCode.value__  # Should be 400
}
```

**Expected**: 400 Bad Request error

#### Test 7: Get Log Statistics
```powershell
Invoke-RestMethod http://localhost:3001/api/logs/stats
```

**Expected**: Returns totalFiles, files array, totalSize, logDirectory

#### Test 8: Filter Logs by Level
```powershell
Invoke-RestMethod "http://localhost:3001/api/logs/filter?level=info&limit=5"
```

**Expected**: Returns filtered logs with count

#### Test 9: Search Logs
```powershell
Invoke-RestMethod "http://localhost:3001/api/logs/filter?searchTerm=Winston&limit=10"
```

**Expected**: Returns logs containing "Winston"

#### Test 10: Post Frontend Log
```powershell
$frontendLogs = @{
    logs = @(
        @{
            timestamp = (Get-Date).ToUniversalTime().ToString('o')
            level = 'info'
            message = 'Test frontend log from Phase 3.1'
            component = 'test-script'
            sessionId = 'test-session-phase-3.1'
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod http://localhost:3001/api/logs/frontend -Method POST -Body $frontendLogs -ContentType "application/json"
```

**Expected**: Returns success message

#### Test 11: Verify Frontend Log in File
```powershell
$logDate = Get-Date -Format 'yyyy-MM-dd'
Get-Content "apps\simulation-api\logs\simulation-$logDate.log" -Tail 10 | Where-Object { $_ -match '"source":"frontend"' }
```

**Expected**: Shows frontend log entry with source:"frontend"

#### Test 12: Python log-manager Status
```bash
python scripts/log-manager.py status
```

**Expected**: Shows backend local config, frontend config, captured logs status

#### Test 13: Python Capture Backend Logs
```bash
python scripts/capture-backend-logs.py local
```

**Expected**: Captures 3 files (app, error, simulation) to logs/captured/backend

#### Test 14: Python Clean Logs (Dry Run)
```bash
python scripts/clean-backend-logs.py local --dry-run
```

**Expected**: Shows what would be deleted without actually deleting

#### Test 15: Verify Log Files
```powershell
Get-ChildItem "apps\simulation-api\logs\*.log" | Select-Object Name, Length, LastWriteTime
```

**Expected**: Shows 3 log files (app, error, simulation) with sizes and timestamps

## Test Checklist

- [ ] Backend server starts successfully
- [ ] Health endpoint responds
- [ ] GET /admin/log-level returns current configuration
- [ ] POST /admin/log-level successfully changes level
- [ ] Log level change persists across API calls
- [ ] Invalid log level is rejected with 400
- [ ] GET /api/logs/stats returns log file information
- [ ] GET /api/logs/filter works with level filter
- [ ] GET /api/logs/filter works with search term
- [ ] POST /api/logs/frontend accepts frontend logs
- [ ] Frontend logs appear in simulation log file with source:"frontend"
- [ ] Python log-manager.py status shows system overview
- [ ] Python capture-backend-logs.py captures logs to logs/captured/backend
- [ ] Python clean-backend-logs.py dry-run shows cleanup preview
- [ ] Log files exist in apps/simulation-api/logs directory

## Expected Results

### Log Files

After running tests, you should have:
- `apps/simulation-api/logs/app-YYYY-MM-DD.log` - Application logs
- `apps/simulation-api/logs/error-YYYY-MM-DD.log` - Error logs
- `apps/simulation-api/logs/simulation-YYYY-MM-DD.log` - Simulation logs (includes frontend)

### Captured Logs

After running capture script:
- `logs/captured/backend/app-YYYY-MM-DD.log`
- `logs/captured/backend/error-YYYY-MM-DD.log`
- `logs/captured/backend/simulation-YYYY-MM-DD.log`

## Common Issues

### Issue: "Unable to connect to the remote server"
**Solution**:
1. Verify backend server is running: `netstat -ano | findstr ":3001"`
2. Check console shows "TerrainSim API server running"
3. Try `curl http://localhost:3001/health` in a new terminal

### Issue: "Module not found" errors
**Solution**:
1. Check all dependencies installed: `pnpm install`
2. Verify TypeScript compiles: `pnpm run build` (in simulation-api)

### Issue: Log files not found
**Solution**:
1. Check LOG_DIR environment variable in .env.development
2. Verify directory exists: `apps/simulation-api/logs`
3. Check file permissions

### Issue: Python scripts fail
**Solution**:
1. Verify Python 3.8+ installed: `python --version`
2. Install requirements if needed
3. Run from workspace root: `cd D:\playground\TerrainSim`

## Test Results Documentation

After completing tests, document results:

### API Endpoints
- ✅/❌ GET /health
- ✅/❌ GET /admin/log-level
- ✅/❌ POST /admin/log-level
- ✅/❌ GET /admin/health
- ✅/❌ GET /api/logs/filter
- ✅/❌ GET /api/logs/stats
- ✅/❌ POST /api/logs/frontend

### Python Scripts
- ✅/❌ log-manager.py status
- ✅/❌ capture-backend-logs.py local
- ✅/❌ clean-backend-logs.py local --dry-run
- ✅/❌ set-log-level.py local backend info

### Log Files
- ✅/❌ Log files created with correct names
- ✅/❌ Logs contain JSON formatted entries
- ✅/❌ Frontend logs appear in simulation log
- ✅/❌ Log rotation works (after 24 hours)

## Next Steps

After Phase 3.1 completion:
1. Document any failed tests with error details
2. Fix any issues discovered during testing
3. Proceed to Phase 3.2: Production Testing
4. Update LOGGING-INFRASTRUCTURE-PLAN.md with test results

## Automated Test Script

The comprehensive test script `test-phase-3.1.ps1` automates all 15 tests and provides:
- Color-coded output (Green=Pass, Red=Fail)
- Detailed test results table
- Summary statistics
- Individual test details

Run after starting the backend server:
```powershell
.\scripts\test-phase-3.1.ps1
```
