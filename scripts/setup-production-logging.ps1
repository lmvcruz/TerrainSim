#!/usr/bin/env pwsh
# Setup production logging infrastructure
# This script creates the log directory and configures .env on production

$ErrorActionPreference = "Continue"
$Server = "ubuntu@54.242.131.12"
$KeyPath = "C:\Users\l-cruz\.ssh\terrainsim-key.pem"

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  Setting up Production Logging Infrastructure" -ForegroundColor Cyan
Write-Host "======================================================================`n" -ForegroundColor Cyan

# Step 1: Create log directory
Write-Host "[1/5] Creating log directory on production..." -ForegroundColor Yellow
$createDirCmd = "sudo mkdir -p /var/log/terrainsim && sudo chown ubuntu:ubuntu /var/log/terrainsim && sudo chmod 755 /var/log/terrainsim && ls -lhd /var/log/terrainsim"

try {
    $result = ssh -i $KeyPath $Server $createDirCmd 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Log directory created successfully" -ForegroundColor Green
        Write-Host "  $result" -ForegroundColor Gray
    }
    else {
        Write-Host "  ❌ Failed to create directory" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        Write-Host "`nPlease run manually:" -ForegroundColor Yellow
        Write-Host "  ssh -i $KeyPath $Server '$createDirCmd'" -ForegroundColor Cyan
        exit 1
    }
}
catch {
    Write-Host "  ❌ SSH connection failed: $_" -ForegroundColor Red
    Write-Host "`nPlease ensure SSH access is configured:" -ForegroundColor Yellow
    Write-Host "  ssh -i $KeyPath $Server" -ForegroundColor Cyan
    exit 1
}

# Step 2: Check current .env settings
Write-Host "`n[2/5] Checking current .env configuration..." -ForegroundColor Yellow
$checkEnvCmd = "cd /var/www/terrainsim && cat .env | grep -E 'LOG_LEVEL|LOG_DIR|ENABLE_FILE_LOGGING|ENABLE_CONSOLE_LOGGING'"

try {
    $envCheck = ssh -i $KeyPath $Server $checkEnvCmd 2>&1
    if ($LASTEXITCODE -eq 0 -and $envCheck -match "LOG_DIR") {
        Write-Host "  ✅ Log configuration already exists" -ForegroundColor Green
        Write-Host "  Current settings:" -ForegroundColor Gray
        Write-Host "  $envCheck" -ForegroundColor Gray
        $needsUpdate = $false
    }
    else {
        Write-Host "  ⚠️  Log configuration missing or incomplete" -ForegroundColor Yellow
        $needsUpdate = $true
    }
}
catch {
    Write-Host "  ⚠️  Could not check .env file" -ForegroundColor Yellow
    $needsUpdate = $true
}

# Step 3: Add log configuration if needed
if ($needsUpdate) {
    Write-Host "`n[3/5] Adding log configuration to .env..." -ForegroundColor Yellow
    $addConfigCmd = @"
cd /var/www/terrainsim &&
echo '' >> .env &&
echo '# Logging Configuration' >> .env &&
echo 'LOG_LEVEL=info' >> .env &&
echo 'LOG_DIR=/var/log/terrainsim' >> .env &&
echo 'ENABLE_FILE_LOGGING=true' >> .env &&
echo 'ENABLE_CONSOLE_LOGGING=true' >> .env
"@

    try {
        ssh -i $KeyPath $Server $addConfigCmd
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Log configuration added to .env" -ForegroundColor Green
        }
        else {
            Write-Host "  ❌ Failed to update .env" -ForegroundColor Red
            Write-Host "`nPlease add manually:" -ForegroundColor Yellow
            Write-Host "  ssh -i $KeyPath $Server" -ForegroundColor Cyan
            Write-Host "  cd /var/www/terrainsim" -ForegroundColor Cyan
            Write-Host "  nano .env" -ForegroundColor Cyan
            Write-Host "  # Add these lines:" -ForegroundColor Cyan
            Write-Host "  LOG_LEVEL=info" -ForegroundColor Cyan
            Write-Host "  LOG_DIR=/var/log/terrainsim" -ForegroundColor Cyan
            Write-Host "  ENABLE_FILE_LOGGING=true" -ForegroundColor Cyan
            Write-Host "  ENABLE_CONSOLE_LOGGING=true" -ForegroundColor Cyan
            exit 1
        }
    }
    catch {
        Write-Host "  ❌ Failed to update .env: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "`n[3/5] Skipping .env update (already configured)" -ForegroundColor Cyan
}

# Step 4: Verify configuration
Write-Host "`n[4/5] Verifying configuration..." -ForegroundColor Yellow
$verifyCmd = "cd /var/www/terrainsim && tail -10 .env"

try {
    $verify = ssh -i $KeyPath $Server $verifyCmd 2>&1
    Write-Host "  ✅ Current .env contents (last 10 lines):" -ForegroundColor Green
    Write-Host "  $verify" -ForegroundColor Gray
}
catch {
    Write-Host "  ⚠️  Could not verify .env" -ForegroundColor Yellow
}

# Step 5: Summary
Write-Host "`n[5/5] Setup Summary" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

$finalCheck = ssh -i $KeyPath $Server "ls -lhd /var/log/terrainsim && cd /var/www/terrainsim && grep -E 'LOG_DIR|LOG_LEVEL' .env" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Production logging infrastructure is ready!" -ForegroundColor Green
    Write-Host "`n  Configuration:" -ForegroundColor Cyan
    Write-Host "  $finalCheck" -ForegroundColor Gray

    Write-Host "`n  Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Deploy backend via GitHub Actions" -ForegroundColor White
    Write-Host "  2. Run automated tests: .\scripts\test-production.ps1" -ForegroundColor White
    Write-Host "  3. Verify logs: ssh -i $KeyPath $Server 'tail -f /var/log/terrainsim/app-*.log'" -ForegroundColor White
}
else {
    Write-Host "  ⚠️  Setup may be incomplete" -ForegroundColor Yellow
    Write-Host "  Please verify manually with:" -ForegroundColor Yellow
    Write-Host "  ssh -i $KeyPath $Server 'ls -lh /var/log/terrainsim/'" -ForegroundColor Cyan
}

Write-Host "`n======================================================================`n" -ForegroundColor Cyan
