# Test script for Phase 2.2 Backend API Endpoints
# Run this after starting the backend server with: pnpm --filter simulation-api dev

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "  Testing Phase 2.2 Backend API Endpoints" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$allTestsPassed = $true

# Test 1: GET /admin/log-level (Get current log level)
Write-Host "`n[Test 1] GET /admin/log-level" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/log-level" -Method GET
    Write-Host "  Status: Success" -ForegroundColor Green
    Write-Host "  Current Level: $($response.currentLevel)" -ForegroundColor White
    Write-Host "  Environment: $($response.environment)" -ForegroundColor White
    Write-Host "  Log Directory: $($response.logDir)" -ForegroundColor White
}
catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 2: POST /admin/log-level (Change log level to info)
Write-Host "`n[Test 2] POST /admin/log-level (change to info)" -ForegroundColor Yellow
try {
    $body = @{ level = "info" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/log-level" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  Status: Success" -ForegroundColor Green
    Write-Host "  Previous: $($response.previousLevel) → Current: $($response.currentLevel)" -ForegroundColor White
    Write-Host "  Message: $($response.message)" -ForegroundColor White
}
catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 3: POST /admin/log-level (Change back to debug)
Write-Host "`n[Test 3] POST /admin/log-level (change back to debug)" -ForegroundColor Yellow
try {
    $body = @{ level = "debug" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/log-level" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  Status: Success" -ForegroundColor Green
    Write-Host "  Previous: $($response.previousLevel) → Current: $($response.currentLevel)" -ForegroundColor White
}
catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 4: POST /admin/log-level (Invalid level - should fail)
Write-Host "`n[Test 4] POST /admin/log-level (invalid level - expected to fail)" -ForegroundColor Yellow
try {
    $body = @{ level = "invalid" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/log-level" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "  Status: UNEXPECTED SUCCESS (should have failed)" -ForegroundColor Red
    $allTestsPassed = $false
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "  Status: Success (correctly rejected invalid level)" -ForegroundColor Green
        Write-Host "  Status Code: 400 Bad Request" -ForegroundColor White
    }
    else {
        Write-Host "  Status: FAILED (wrong error code)" -ForegroundColor Red
        $allTestsPassed = $false
    }
}

# Test 5: GET /admin/health
Write-Host "`n[Test 5] GET /admin/health" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/health" -Method GET
    Write-Host "  Status: Success" -ForegroundColor Green
    Write-Host "  Health: $($response.status)" -ForegroundColor White
    Write-Host "  Uptime: $([math]::Round($response.uptime, 2)) seconds" -ForegroundColor White
    Write-Host "  Log Level: $($response.logging.level)" -ForegroundColor White
}
catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 6: GET /api/logs/filter (Filter by level)
Write-Host "`n[Test 6] GET /api/logs/filter?level=info&limit=5" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/logs/filter?level=info&limit=5" -Method GET
    Write-Host "  Status: Success" -ForegroundColor Green
    Write-Host "  Logs Found: $($response.count)" -ForegroundColor White
    Write-Host "  Limit: $($response.limit)" -ForegroundColor White
    if ($response.count -gt 0) {
        Write-Host "  Sample Log: $($response.logs[0].message)" -ForegroundColor White
    }
}
catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 7: GET /api/logs/filter (Filter by source)
Write-Host "`n[Test 7] GET /api/logs/filter?source=frontend&limit=5" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/logs/filter?source=frontend&limit=5" -Method GET
    Write-Host "  Status: Success" -ForegroundColor Green
    Write-Host "  Frontend Logs Found: $($response.count)" -ForegroundColor White
    if ($response.count -gt 0) {
        Write-Host "  Sample: $($response.logs[0].message)" -ForegroundColor White
    }
    else {
        Write-Host "  (No frontend logs yet - this is normal)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 8: GET /api/logs/filter (Search term)
Write-Host "`n[Test 8] GET /api/logs/filter?searchTerm=level&limit=5" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/logs/filter?searchTerm=level&limit=5" -Method GET
    Write-Host "  Status: Success" -ForegroundColor Green
    Write-Host "  Logs with 'level' keyword: $($response.count)" -ForegroundColor White
}
catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 9: GET /api/logs/stats
Write-Host "`n[Test 9] GET /api/logs/stats" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/logs/stats" -Method GET
    Write-Host "  Status: Success" -ForegroundColor Green
    Write-Host "  Total Log Files: $($response.stats.totalFiles)" -ForegroundColor White
    Write-Host "  Total Size: $($response.stats.totalSizeFormatted)" -ForegroundColor White
    Write-Host "  Log Directory: $($response.stats.logDirectory)" -ForegroundColor White
    if ($response.stats.files.Count -gt 0) {
        Write-Host "  Latest File: $($response.stats.files[0].name) ($($response.stats.files[0].sizeFormatted))" -ForegroundColor White
    }
}
catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Summary
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
if ($allTestsPassed) {
    Write-Host "  ALL TESTS PASSED" -ForegroundColor Green
}
else {
    Write-Host "  SOME TESTS FAILED" -ForegroundColor Red
}
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""
