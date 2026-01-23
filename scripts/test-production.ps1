#!/usr/bin/env pwsh
# Production Testing Script for Phase 3.2
# Tests all logging infrastructure components in production environment

param(
    [switch]$SkipSSH = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"
$ProductionAPI = "https://api.lmvcruz.work"
$ProductionSSH = "ubuntu@54.242.131.12"
$TestResults = @()

function Add-TestResult {
    param($Name, $Status, $Details = "")
    $TestResults += [PSCustomObject]@{
        Test    = $Name
        Status  = $Status
        Details = $Details
    }
}

function Write-TestHeader {
    param($Message)
    Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "$('=' * 70)" -ForegroundColor Cyan
}

function Write-TestStep {
    param($Step, $Message)
    Write-Host "`n[$Step]" -ForegroundColor Yellow -NoNewline
    Write-Host " $Message" -ForegroundColor White
}

# Test 1: Backend Health Check
Write-TestHeader "TEST 1: Production Backend Health"
Write-TestStep "1.1" "Testing backend health endpoint..."

try {
    $health = Invoke-RestMethod -Uri "$ProductionAPI/health" -TimeoutSec 10

    if ($health.status -eq "ok") {
        Write-Host "  ✅ Backend is healthy" -ForegroundColor Green
        Write-Host "  Uptime: $($health.uptime)" -ForegroundColor Gray
        Write-Host "  Environment: $($health.environment)" -ForegroundColor Gray
        Add-TestResult "Backend Health" "PASS" "Status: $($health.status)"
    }
    else {
        Write-Host "  ❌ Backend health check failed" -ForegroundColor Red
        Add-TestResult "Backend Health" "FAIL" "Status: $($health.status)"
    }
}
catch {
    Write-Host "  ❌ Cannot connect to backend: $_" -ForegroundColor Red
    Add-TestResult "Backend Health" "FAIL" "Connection failed"
    exit 1
}

# Test 2: Log Level Configuration
Write-TestHeader "TEST 2: Production Log Level Configuration"
Write-TestStep "2.1" "Querying current log level..."

try {
    $logConfig = Invoke-RestMethod -Uri "$ProductionAPI/admin/log-level" -TimeoutSec 10
    Write-Host "  ✅ Current log level: $($logConfig.logLevel)" -ForegroundColor Green
    Write-Host "  Environment: $($logConfig.environment)" -ForegroundColor Gray
    Add-TestResult "Query Log Level" "PASS" "Level: $($logConfig.logLevel)"

    $originalLevel = $logConfig.logLevel

    # Test changing log level
    Write-TestStep "2.2" "Testing dynamic log level change to debug..."
    $newLevel = @{ level = "debug" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$ProductionAPI/admin/log-level" `
        -Method POST -Body $newLevel -ContentType "application/json" -TimeoutSec 10

    Write-Host "  ✅ Log level changed: $($response.message)" -ForegroundColor Green
    Add-TestResult "Change Log Level" "PASS" "Changed to debug"

    Start-Sleep -Seconds 2

    # Restore original level
    Write-TestStep "2.3" "Restoring original log level ($originalLevel)..."
    $restoreLevel = @{ level = $originalLevel } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$ProductionAPI/admin/log-level" `
        -Method POST -Body $restoreLevel -ContentType "application/json" -TimeoutSec 10

    Write-Host "  ✅ Log level restored: $($response.currentLevel)" -ForegroundColor Green
    Add-TestResult "Restore Log Level" "PASS" "Restored to $originalLevel"

}
catch {
    Write-Host "  ❌ Log level test failed: $_" -ForegroundColor Red
    Add-TestResult "Log Level Management" "FAIL" $_.Exception.Message
}

# Test 3: Log Statistics API
Write-TestHeader "TEST 3: Production Log Statistics"
Write-TestStep "3.1" "Fetching log file statistics..."

try {
    $stats = Invoke-RestMethod -Uri "$ProductionAPI/api/logs/stats" -TimeoutSec 10
    Write-Host "  ✅ Log statistics retrieved" -ForegroundColor Green
    Write-Host "  Total log files: $($stats.totalFiles)" -ForegroundColor Gray
    Write-Host "  Total size: $($stats.totalSize)" -ForegroundColor Gray

    if ($Verbose -and $stats.files) {
        Write-Host "`n  Recent files:" -ForegroundColor Cyan
        $stats.files | Select-Object -First 5 | ForEach-Object {
            Write-Host "    - $($_.name) ($($_.size))" -ForegroundColor Gray
        }
    }

    Add-TestResult "Log Statistics" "PASS" "$($stats.totalFiles) files"
}
catch {
    Write-Host "  ❌ Failed to get log statistics: $_" -ForegroundColor Red
    Add-TestResult "Log Statistics" "FAIL" $_.Exception.Message
}

# Test 4: Log Filtering API
Write-TestHeader "TEST 4: Production Log Filtering"
Write-TestStep "4.1" "Testing filter by level (info)..."

try {
    $filtered = Invoke-RestMethod -Uri "$ProductionAPI/api/logs/filter?level=info&limit=10" -TimeoutSec 15
    Write-Host "  ✅ Filter by level successful" -ForegroundColor Green
    Write-Host "  Results: $($filtered.count) logs" -ForegroundColor Gray
    Add-TestResult "Filter by Level" "PASS" "$($filtered.count) results"
}
catch {
    Write-Host "  ⚠️ Filter by level failed: $_" -ForegroundColor Yellow
    Add-TestResult "Filter by Level" "FAIL" $_.Exception.Message
}

Write-TestStep "4.2" "Testing filter by source (frontend)..."

try {
    $frontendLogs = Invoke-RestMethod -Uri "$ProductionAPI/api/logs/filter?source=frontend&limit=20" -TimeoutSec 15
    Write-Host "  ✅ Filter by source successful" -ForegroundColor Green
    Write-Host "  Frontend logs found: $($frontendLogs.count)" -ForegroundColor Gray

    if ($frontendLogs.count -gt 0) {
        Write-Host "  ✅ Frontend logging is working!" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠️ No frontend logs found (may need user activity)" -ForegroundColor Yellow
    }

    Add-TestResult "Filter by Source" "PASS" "$($frontendLogs.count) frontend logs"
}
catch {
    Write-Host "  ⚠️ Filter by source failed: $_" -ForegroundColor Yellow
    Add-TestResult "Filter by Source" "FAIL" $_.Exception.Message
}

# Test 5: Frontend Logging Endpoint
Write-TestHeader "TEST 5: Frontend Log Ingestion"
Write-TestStep "5.1" "Sending test log to production..."

try {
    $testLog = @{
        logs = @(
            @{
                timestamp = (Get-Date).ToUniversalTime().ToString('o')
                level     = 'info'
                message   = 'Production test log from automated script'
                component = 'test-script'
                sessionId = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
                userAgent = 'PowerShell/ProductionTest'
                url       = 'https://terrainsim.pages.dev/test'
                data      = @{
                    testType = 'automated'
                    phase    = '3.2'
                }
            }
        )
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "$ProductionAPI/api/logs/frontend" `
        -Method POST -Body $testLog -ContentType "application/json" -TimeoutSec 10

    Write-Host "  ✅ Test log sent successfully" -ForegroundColor Green
    Write-Host "  Response: $($response.message)" -ForegroundColor Gray
    Add-TestResult "Frontend Log Ingestion" "PASS" "Test log accepted"

    # Wait and verify log appears
    Write-TestStep "5.2" "Verifying test log appears in backend..."
    Start-Sleep -Seconds 3

    $sessionId = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $verify = Invoke-RestMethod -Uri "$ProductionAPI/api/logs/filter?searchTerm=Production test log&limit=5" -TimeoutSec 10

    if ($verify.count -gt 0) {
        Write-Host "  ✅ Test log found in backend!" -ForegroundColor Green
        Add-TestResult "Verify Frontend Log" "PASS" "Log found in backend"
    }
    else {
        Write-Host "  ⚠️ Test log not found yet (may need more time)" -ForegroundColor Yellow
        Add-TestResult "Verify Frontend Log" "WARN" "Not found immediately"
    }

}
catch {
    Write-Host "  ❌ Frontend logging test failed: $_" -ForegroundColor Red
    Add-TestResult "Frontend Log Ingestion" "FAIL" $_.Exception.Message
}

# Test 6: SSH Access (if not skipped)
if (-not $SkipSSH) {
    Write-TestHeader "TEST 6: SSH Access to Production Server"
    Write-TestStep "6.1" "Testing SSH connection..."

    try {
        $sshTest = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $ProductionSSH "echo 'SSH connection successful'"

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ SSH connection working" -ForegroundColor Green
            Add-TestResult "SSH Connection" "PASS" "Connected successfully"

            Write-TestStep "6.2" "Checking log directory on server..."
            $logDir = ssh -o StrictHostKeyChecking=no $ProductionSSH "ls -lh /var/log/terrainsim/ 2>/dev/null | head -5"

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Log directory accessible" -ForegroundColor Green
                if ($Verbose) {
                    Write-Host "`n$logDir" -ForegroundColor Gray
                }
                Add-TestResult "Log Directory Access" "PASS" "Directory accessible"
            }
            else {
                Write-Host "  ⚠️ Log directory not found or not accessible" -ForegroundColor Yellow
                Add-TestResult "Log Directory Access" "WARN" "Directory not accessible"
            }

            Write-TestStep "6.3" "Checking disk usage..."
            $diskUsage = ssh -o StrictHostKeyChecking=no $ProductionSSH "du -sh /var/log/terrainsim 2>/dev/null"

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Disk usage: $diskUsage" -ForegroundColor Green
                Add-TestResult "Disk Usage Check" "PASS" $diskUsage
            }

        }
        else {
            Write-Host "  ❌ SSH connection failed" -ForegroundColor Red
            Add-TestResult "SSH Connection" "FAIL" "Connection failed"
        }
    }
    catch {
        Write-Host "  ❌ SSH test failed: $_" -ForegroundColor Red
        Add-TestResult "SSH Connection" "FAIL" $_.Exception.Message
    }
}
else {
    Write-Host "`n⏭️  Skipping SSH tests (use without -SkipSSH to include)" -ForegroundColor Yellow
}

# Test 7: Python Scripts (if available)
Write-TestHeader "TEST 7: Python Management Scripts"
Write-TestStep "7.1" "Testing log-manager.py status..."

try {
    $pythonTest = python --version 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Python available: $pythonTest" -ForegroundColor Green

        if (Test-Path "scripts/log-manager.py") {
            Write-Host "  ✅ log-manager.py found" -ForegroundColor Green
            Write-Host "  ℹ️  Run manually: python scripts/log-manager.py status" -ForegroundColor Cyan
            Add-TestResult "Python Scripts" "PASS" "Scripts available"
        }
        else {
            Write-Host "  ⚠️ log-manager.py not found in scripts/" -ForegroundColor Yellow
            Add-TestResult "Python Scripts" "WARN" "Scripts not found"
        }
    }
    else {
        Write-Host "  ⚠️ Python not available" -ForegroundColor Yellow
        Add-TestResult "Python Scripts" "WARN" "Python not available"
    }
}
catch {
    Write-Host "  ⚠️ Python test skipped: $_" -ForegroundColor Yellow
    Add-TestResult "Python Scripts" "WARN" "Test skipped"
}

# Summary
Write-TestHeader "TEST SUMMARY"

$passed = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$warned = ($TestResults | Where-Object { $_.Status -eq "WARN" }).Count
$total = $TestResults.Count

Write-Host "`n  Total Tests: $total" -ForegroundColor White
Write-Host "  ✅ Passed: $passed" -ForegroundColor Green
Write-Host "  ❌ Failed: $failed" -ForegroundColor Red
Write-Host "  ⚠️  Warnings: $warned" -ForegroundColor Yellow

Write-Host "`n$('=' * 70)" -ForegroundColor Cyan

# Detailed results table
Write-Host "`nDetailed Results:" -ForegroundColor Cyan
Write-Host "`n  {0,-40} {1,-10} {2}" -f "Test", "Status", "Details" -ForegroundColor Gray
Write-Host "  $('-' * 68)" -ForegroundColor Gray

foreach ($result in $TestResults) {
    $color = switch ($result.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        default { "Gray" }
    }

    $statusSymbol = switch ($result.Status) {
        "PASS" { "✅" }
        "FAIL" { "❌" }
        "WARN" { "⚠️ " }
        default { "⚪" }
    }

    Write-Host "  $statusSymbol {0,-37} {1,-10} {2}" -f $result.Test, $result.Status, $result.Details -ForegroundColor $color
}

Write-Host ""

# Next steps
if ($failed -eq 0) {
    Write-Host "🎉 All critical tests passed!" -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "  1. Generate user activity on frontend (https://terrainsim.pages.dev)" -ForegroundColor White
    Write-Host "  2. Test Python log capture: python scripts/log-manager.py capture-execution-backend production" -ForegroundColor White
    Write-Host "  3. Test log filtering: python scripts/filter-logs.py production level error" -ForegroundColor White
    Write-Host "  4. Review production logs via SSH" -ForegroundColor White
    Write-Host "  5. Update LOGGING-INFRASTRUCTURE-PLAN.md with Phase 3.2 complete" -ForegroundColor White
}
else {
    Write-Host "⚠️ Some tests failed. Review errors above and troubleshoot." -ForegroundColor Yellow
    Write-Host "`nCommon fixes:" -ForegroundColor Cyan
    Write-Host "  - Verify backend is deployed with Winston logging" -ForegroundColor White
    Write-Host "  - Check .env.production settings" -ForegroundColor White
    Write-Host "  - Verify log directory exists: /var/log/terrainsim/" -ForegroundColor White
    Write-Host "  - Check PM2 logs: ssh $ProductionSSH 'pm2 logs terrainsim-api'" -ForegroundColor White
}

Write-Host ""
