# Phase 3.1 Local Testing Script
# Comprehensive tests for all logging infrastructure components

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "  PHASE 3.1: LOCAL TESTING" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"
$testResults = @()

# Helper function to add test result
function Add-TestResult {
    param($name, $passed, $details)
    $script:testResults += [PSCustomObject]@{
        Test    = $name
        Passed  = $passed
        Details = $details
    }
}

# Test 1: Backend Health Check
Write-Host "[Test 1] Backend Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod "$baseUrl/health"
    Write-Host "  PASSED: Server is healthy" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor White
    Add-TestResult "Backend Health" $true "Server responding"
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Backend Health" $false $_.Exception.Message
}

# Test 2: GET Admin Log Level
Write-Host "`n[Test 2] GET /admin/log-level" -ForegroundColor Yellow
try {
    $logConfig = Invoke-RestMethod "$baseUrl/admin/log-level"
    Write-Host "  PASSED" -ForegroundColor Green
    Write-Host "  Current Level: $($logConfig.currentLevel)" -ForegroundColor White
    Write-Host "  Environment: $($logConfig.environment)" -ForegroundColor White
    Write-Host "  Log Directory: $($logConfig.logDir)" -ForegroundColor White
    Add-TestResult "GET Log Level" $true "Level: $($logConfig.currentLevel)"
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "GET Log Level" $false $_.Exception.Message
}

# Test 3: POST Admin Log Level (Change to info)
Write-Host "`n[Test 3] POST /admin/log-level (change to info)" -ForegroundColor Yellow
try {
    $body = @{ level = "info" } | ConvertTo-Json
    $response = Invoke-RestMethod "$baseUrl/admin/log-level" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  PASSED" -ForegroundColor Green
    Write-Host "  Previous: $($response.previousLevel) -> Current: $($response.currentLevel)" -ForegroundColor White
    Add-TestResult "POST Log Level (info)" $true "Changed successfully"
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "POST Log Level (info)" $false $_.Exception.Message
}

# Test 4: Verify log level changed
Write-Host "`n[Test 4] Verify log level changed to info" -ForegroundColor Yellow
try {
    $logConfig = Invoke-RestMethod "$baseUrl/admin/log-level"
    if ($logConfig.currentLevel -eq "info") {
        Write-Host "  PASSED: Log level is now info" -ForegroundColor Green
        Add-TestResult "Verify Log Level Change" $true "Level confirmed: info"
    }
    else {
        Write-Host "  FAILED: Expected info, got $($logConfig.currentLevel)" -ForegroundColor Red
        Add-TestResult "Verify Log Level Change" $false "Unexpected level"
    }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Verify Log Level Change" $false $_.Exception.Message
}

# Test 5: Restore log level to debug
Write-Host "`n[Test 5] Restore log level to debug" -ForegroundColor Yellow
try {
    $body = @{ level = "debug" } | ConvertTo-Json
    $response = Invoke-RestMethod "$baseUrl/admin/log-level" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  PASSED: Restored to debug" -ForegroundColor Green
    Add-TestResult "Restore Log Level" $true "Restored to debug"
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Restore Log Level" $false $_.Exception.Message
}

# Test 6: Test invalid log level (should fail)
Write-Host "`n[Test 6] Test invalid log level (expected to fail)" -ForegroundColor Yellow
try {
    $body = @{ level = "invalid" } | ConvertTo-Json
    $response = Invoke-RestMethod "$baseUrl/admin/log-level" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "  FAILED: Should have rejected invalid level" -ForegroundColor Red
    Add-TestResult "Invalid Log Level Rejection" $false "Accepted invalid level"
}
catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "  PASSED: Correctly rejected invalid level (400)" -ForegroundColor Green
        Add-TestResult "Invalid Log Level Rejection" $true "Rejected with 400"
    }
    else {
        Write-Host "  FAILED: Wrong error code" -ForegroundColor Red
        Add-TestResult "Invalid Log Level Rejection" $false "Wrong error code"
    }
}

# Test 7: GET Log Stats
Write-Host "`n[Test 7] GET /api/logs/stats" -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod "$baseUrl/api/logs/stats"
    Write-Host "  PASSED" -ForegroundColor Green
    Write-Host "  Total Files: $($stats.stats.totalFiles)" -ForegroundColor White
    Write-Host "  Total Size: $($stats.stats.totalSizeFormatted)" -ForegroundColor White
    Write-Host "  Log Directory: $($stats.stats.logDirectory)" -ForegroundColor White
    Add-TestResult "Log Stats" $true "Files: $($stats.stats.totalFiles)"
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Log Stats" $false $_.Exception.Message
}

# Test 8: Filter logs by level
Write-Host "`n[Test 8] GET /api/logs/filter?level=info&limit=5" -ForegroundColor Yellow
try {
    $filtered = Invoke-RestMethod "$baseUrl/api/logs/filter?level=info&limit=5"
    Write-Host "  PASSED" -ForegroundColor Green
    Write-Host "  Logs Found: $($filtered.count)" -ForegroundColor White
    if ($filtered.count -gt 0) {
        Write-Host "  Sample: $($filtered.logs[0].message)" -ForegroundColor Gray
    }
    Add-TestResult "Filter by Level" $true "Found $($filtered.count) logs"
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Filter by Level" $false $_.Exception.Message
}

# Test 9: Search logs
Write-Host "`n[Test 9] GET /api/logs/filter?searchTerm=Winston&limit=10" -ForegroundColor Yellow
try {
    $searched = Invoke-RestMethod "$baseUrl/api/logs/filter?searchTerm=Winston&limit=10"
    Write-Host "  PASSED" -ForegroundColor Green
    Write-Host "  Logs with 'Winston': $($searched.count)" -ForegroundColor White
    Add-TestResult "Search Logs" $true "Found $($searched.count) logs"
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Search Logs" $false $_.Exception.Message
}

# Test 10: Test frontend logging endpoint
Write-Host "`n[Test 10] POST /api/logs/frontend (frontend logging)" -ForegroundColor Yellow
try {
    $frontendLogs = @{
        logs = @(
            @{
                timestamp = (Get-Date).ToUniversalTime().ToString('o')
                level     = 'info'
                message   = 'Phase 3.1 Test - Frontend Log'
                component = 'test-script'
                sessionId = 'test-session-phase-3.1'
                userAgent = 'PowerShell/Testing'
                url       = 'http://localhost:5173/test'
            }
        )
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod "$baseUrl/api/logs/frontend" -Method POST -Body $frontendLogs -ContentType "application/json"
    Write-Host "  PASSED: $($response.message)" -ForegroundColor Green
    Add-TestResult "Frontend Logging" $true "Log received"
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Frontend Logging" $false $_.Exception.Message
}

# Test 11: Verify frontend log appears in simulation log
Write-Host "`n[Test 11] Verify frontend log in simulation log" -ForegroundColor Yellow
try {
    Start-Sleep -Seconds 1
    $logDate = Get-Date -Format 'yyyy-MM-dd'
    $simLogPath = "D:\playground\TerrainSim\apps\simulation-api\logs\simulation-$logDate.log"

    if (Test-Path $simLogPath) {
        $lastLines = Get-Content $simLogPath -Tail 10 | Where-Object { $_ -match '"source":"frontend"' }
        if ($lastLines) {
            Write-Host "  PASSED: Frontend log found in simulation log" -ForegroundColor Green
            $parsed = $lastLines | ForEach-Object { $_ | ConvertFrom-Json } | Select-Object -First 1
            Write-Host "  Message: $($parsed.message)" -ForegroundColor Gray
            Add-TestResult "Frontend Log Verification" $true "Found in simulation log"
        }
        else {
            Write-Host "  WARNING: Frontend log not found yet (may need more time)" -ForegroundColor Yellow
            Add-TestResult "Frontend Log Verification" $false "Not found in log file"
        }
    }
    else {
        Write-Host "  WARNING: Simulation log file not found" -ForegroundColor Yellow
        Add-TestResult "Frontend Log Verification" $false "Log file not found"
    }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Frontend Log Verification" $false $_.Exception.Message
}

# Test 12: Python Scripts - log-manager.py status
Write-Host "`n[Test 12] Python Script - log-manager.py status" -ForegroundColor Yellow
try {
    $output = python scripts/log-manager.py status 2>&1 | Out-String
    if ($output -match "Backend \(Local\)") {
        Write-Host "  PASSED: log-manager.py executed successfully" -ForegroundColor Green
        Add-TestResult "Python log-manager status" $true "Executed successfully"
    }
    else {
        Write-Host "  FAILED: Unexpected output" -ForegroundColor Red
        Add-TestResult "Python log-manager status" $false "Unexpected output"
    }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Python log-manager status" $false $_.Exception.Message
}

# Test 13: Python Scripts - capture-backend-logs.py
Write-Host "`n[Test 13] Python Script - capture-backend-logs.py local" -ForegroundColor Yellow
try {
    $output = python scripts/capture-backend-logs.py local 2>&1 | Out-String
    if ($output -match "Captured \d+ file") {
        Write-Host "  PASSED: Logs captured successfully" -ForegroundColor Green
        Add-TestResult "Python capture logs" $true "Captured logs"
    }
    else {
        Write-Host "  FAILED: No files captured" -ForegroundColor Red
        Add-TestResult "Python capture logs" $false "No files captured"
    }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Python capture logs" $false $_.Exception.Message
}

# Test 14: Python Scripts - clean-backend-logs.py dry-run
Write-Host "`n[Test 14] Python Script - clean-backend-logs.py local --dry-run" -ForegroundColor Yellow
try {
    $output = python scripts/clean-backend-logs.py local --dry-run 2>&1 | Out-String
    if ($output -match "DRY RUN" -or $output -match "No old log files") {
        Write-Host "  PASSED: Cleanup script executed" -ForegroundColor Green
        Add-TestResult "Python cleanup (dry-run)" $true "Executed successfully"
    }
    else {
        Write-Host "  FAILED: Unexpected output" -ForegroundColor Red
        Add-TestResult "Python cleanup (dry-run)" $false "Unexpected output"
    }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Python cleanup (dry-run)" $false $_.Exception.Message
}

# Test 15: Verify log files exist
Write-Host "`n[Test 15] Verify log files exist and have content" -ForegroundColor Yellow
try {
    $logDir = "D:\playground\TerrainSim\apps\simulation-api\logs"
    $logFiles = Get-ChildItem "$logDir\*.log" -ErrorAction Stop

    if ($logFiles.Count -gt 0) {
        Write-Host "  PASSED: Found $($logFiles.Count) log file(s)" -ForegroundColor Green
        foreach ($file in $logFiles) {
            $sizeKB = [math]::Round($file.Length / 1KB, 2)
            Write-Host "    $($file.Name): $sizeKB KB" -ForegroundColor Gray
        }
        Add-TestResult "Log Files Exist" $true "Found $($logFiles.Count) files"
    }
    else {
        Write-Host "  FAILED: No log files found" -ForegroundColor Red
        Add-TestResult "Log Files Exist" $false "No files found"
    }
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Add-TestResult "Log Files Exist" $false $_.Exception.Message
}

# Summary
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

$passed = ($testResults | Where-Object { $_.Passed -eq $true }).Count
$failed = ($testResults | Where-Object { $_.Passed -eq $false }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host ""

# Detailed results
$testResults | Format-Table -AutoSize

if ($failed -eq 0) {
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host ("=" * 70) -ForegroundColor Green
}
else {
    Write-Host ("=" * 70) -ForegroundColor Yellow
    Write-Host "  SOME TESTS FAILED - Review details above" -ForegroundColor Yellow
    Write-Host ("=" * 70) -ForegroundColor Yellow
}

Write-Host ""
