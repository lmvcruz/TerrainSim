# Environment Validation Script (PowerShell)
# Validates all required environment variables, endpoints, and file permissions
# Usage: .\scripts\validate-env.ps1 [-CI]

param(
    [switch]$CI = $false
)

$ErrorActionPreference = 'Continue'
$script:Errors = 0
$script:Warnings = 0

# Helper functions
function Write-Error-Message {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
    $script:Errors++
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "WARNING: $Message" -ForegroundColor Yellow
    $script:Warnings++
}

function Write-Success {
    param([string]$Message)
    Write-Host "SUCCESS: $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor Cyan
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return ($null -ne $connections)
}

# Start validation
Write-Host "=============================================================" -ForegroundColor Green
Write-Host "       TerrainSim Environment Validation Script            " -ForegroundColor Green
Write-Host "                                                            " -ForegroundColor Green
Write-Host "  Validates configuration, dependencies, and endpoints     " -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
Write-Host ""

if ($CI) {
    Write-Info "Running in CI mode"
}

# ============================================
# 1. Check Required Commands
# ============================================
Write-Header "1. Checking Required Commands"

$RequiredCommands = @("node", "pnpm", "git")
$OptionalCommands = @("cmake", "python", "docker")

foreach ($cmd in $RequiredCommands) {
    if (Test-Command $cmd) {
        try {
            $version = & $cmd --version 2>&1 | Select-Object -First 1
            Write-Success "$cmd installed: $version"
        } catch {
            Write-Success "$cmd installed"
        }
    } else {
        Write-Error-Message "$cmd not found (required)"
    }
}

foreach ($cmd in $OptionalCommands) {
    if (Test-Command $cmd) {
        try {
            $version = & $cmd --version 2>&1 | Select-Object -First 1
            Write-Success "$cmd installed: $version"
        } catch {
            Write-Success "$cmd installed"
        }
    } else {
        Write-Warning-Message "$cmd not found (optional but recommended)"
    }
}

# Check for Visual Studio Build Tools (for C++ compilation)
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vsWhere) {
    $vsInstances = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($vsInstances) {
        Write-Success "Visual Studio Build Tools found"
    } else {
        Write-Warning-Message "Visual Studio Build Tools not found (required for C++ compilation)"
    }
} else {
    Write-Warning-Message "Visual Studio Build Tools not detected"
}

# ============================================
# 2. Check Node.js Version
# ============================================
Write-Header "2. Validating Node.js Version"

if (Test-Command node) {
    $nodeVersion = (node -v).TrimStart('v')
    $nodeMajor = [int]($nodeVersion -split '\.')[0]

    if ($nodeMajor -ge 20) {
        Write-Success "Node.js version $nodeVersion (>= 20.x required)"
    } else {
        Write-Error-Message "Node.js version $nodeVersion is too old (>= 20.x required)"
    }
} else {
    Write-Error-Message "Node.js not installed"
}

# ============================================
# 3. Check Environment Variables
# ============================================
Write-Header "3. Checking Environment Variables"

# Backend environment variables
if ($env:NODE_ENV) {
    Write-Success "NODE_ENV: $env:NODE_ENV"
} else {
    Write-Info "NODE_ENV not set (defaults to development)"
}

if ($env:PORT) {
    Write-Success "PORT: $env:PORT"
} else {
    Write-Info "PORT not set (defaults to 3001)"
}

# Frontend environment variables (check .env files)
$envFile = "apps\web\.env.development"
if (Test-Path $envFile) {
    Write-Success "Frontend .env.development exists"

    # Check for VITE_API_URL
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'VITE_API_URL=(.+)') {
        $apiUrl = $matches[1].Trim()
        Write-Success "VITE_API_URL configured: $apiUrl"
    } else {
        Write-Warning-Message "VITE_API_URL not set in .env.development (will use default)"
    }
} else {
    Write-Warning-Message "$envFile not found"
}

# ============================================
# 4. Check File Permissions
# ============================================
Write-Header "4. Validating File Permissions"

$DirsToCheck = @(
    "apps\simulation-api\presets",
    "docs\temp",
    "packages\terrain-engine\build"
)

foreach ($dir in $DirsToCheck) {
    if (Test-Path $dir) {
        try {
            # Test write access
            $testFile = Join-Path $dir ".test-write-access"
            [System.IO.File]::WriteAllText($testFile, "test")
            Remove-Item $testFile -Force
            Write-Success "$dir : readable and writable"
        } catch {
            Write-Error-Message "$dir : insufficient permissions"
        }
    } else {
        Write-Warning-Message "$dir : directory does not exist"
    }
}

# ============================================
# 5. Check Dependencies
# ============================================
Write-Header "5. Checking Dependencies"

if (Test-Path "pnpm-lock.yaml") {
    Write-Success "pnpm-lock.yaml exists"

    # Check if node_modules exist
    if (Test-Path "node_modules") {
        Write-Success "Root node_modules installed"
    } else {
        Write-Warning-Message "Root node_modules not found - run 'pnpm install'"
    }

    if (Test-Path "apps\web\node_modules") {
        Write-Success "Web app node_modules installed"
    } else {
        Write-Warning-Message "Web app node_modules not found - run 'pnpm install'"
    }

    if (Test-Path "apps\simulation-api\node_modules") {
        Write-Success "API node_modules installed"
    } else {
        Write-Warning-Message "API node_modules not found - run 'pnpm install'"
    }
} else {
    Write-Error-Message "pnpm-lock.yaml not found"
}

# Check if C++ library is built
$nativeRelease = "packages\terrain-engine\build\Release\terrain_engine.node"
$nativeDebug = "packages\terrain-engine\build\Debug\terrain_engine.node"

if (Test-Path $nativeRelease) {
    Write-Success "C++ terrain engine built (Release)"
} elseif (Test-Path $nativeDebug) {
    Write-Success "C++ terrain engine built (Debug)"
} else {
    Write-Warning-Message "C++ terrain engine not built - run 'pnpm build:native' in packages\terrain-engine"
}

# ============================================
# 6. Check API Endpoints
# ============================================
Write-Header "6. Testing API Endpoints"

$ApiPort = if ($env:PORT) { [int]$env:PORT } else { 3001 }
$ApiBase = "http://localhost:$ApiPort"

# Check if API port is in use
if (Test-Port $ApiPort) {
    Write-Info "Port $ApiPort is in use - testing endpoints..."

    # Test health endpoint
    try {
        $response = Invoke-WebRequest -Uri "$ApiBase/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "API health check: $ApiBase/health"
        } else {
            Write-Error-Message "API health check failed: HTTP $($response.StatusCode)"
        }
    } catch {
        Write-Error-Message "API not responding at $ApiBase/health"
    }
} else {
    if ($CI) {
        Write-Error-Message "API not running on port $ApiPort (required in CI)"
    } else {
        Write-Warning-Message "API not running on port $ApiPort (start with 'pnpm dev' in apps\simulation-api)"
    }
}

# ============================================
# 7. Check Frontend Dev Server
# ============================================
Write-Header "7. Checking Frontend Dev Server"

$FrontendPort = 5173
$FrontendBase = "http://localhost:$FrontendPort"

if (Test-Port $FrontendPort) {
    Write-Success "Frontend dev server running on port $FrontendPort"

    try {
        $response = Invoke-WebRequest -Uri $FrontendBase -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend accessible at $FrontendBase"
        } else {
            Write-Warning-Message "Frontend responded with HTTP $($response.StatusCode)"
        }
    } catch {
        Write-Warning-Message "Frontend not responding at $FrontendBase"
    }
} else {
    if ($CI) {
        Write-Info "Frontend not running (not required in CI)"
    } else {
        Write-Info "Frontend not running (start with 'pnpm dev' in apps\web)"
    }
}

# ============================================
# 8. Check Git Repository Status
# ============================================
Write-Header "8. Checking Git Repository"

if (Test-Command git) {
    try {
        $gitDir = git rev-parse --git-dir 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Git repository initialized"

            # Check current branch
            $branch = git rev-parse --abbrev-ref HEAD 2>&1
            Write-Info "Current branch: $branch"

            # Check for uncommitted changes
            git diff-index --quiet HEAD -- 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Working tree clean"
            } else {
                Write-Warning-Message "Uncommitted changes detected"
            }
        } else {
            Write-Error-Message "Not a git repository"
        }
    } catch {
        Write-Error-Message "Git repository check failed"
    }
}

# ============================================
# Summary
# ============================================
Write-Header "Validation Summary"

Write-Host ""
if ($script:Errors -eq 0 -and $script:Warnings -eq 0) {
    Write-Host "=============================================================" -ForegroundColor Green
    Write-Host "                  ALL CHECKS PASSED                        " -ForegroundColor Green
    Write-Host "                                                           " -ForegroundColor Green
    Write-Host "  Your environment is correctly configured!               " -ForegroundColor Green
    Write-Host "=============================================================" -ForegroundColor Green
    exit 0
} elseif ($script:Errors -eq 0) {
    Write-Host "=============================================================" -ForegroundColor Yellow
    Write-Host "              WARNINGS FOUND: $($script:Warnings)           " -ForegroundColor Yellow
    Write-Host "                                                           " -ForegroundColor Yellow
    Write-Host "  Environment is functional but has warnings              " -ForegroundColor Yellow
    Write-Host "=============================================================" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "=============================================================" -ForegroundColor Red
    Write-Host "              VALIDATION FAILED                            " -ForegroundColor Red
    Write-Host "                                                           " -ForegroundColor Red
    Write-Host "  Errors: $($script:Errors)                               " -ForegroundColor Red
    Write-Host "  Warnings: $($script:Warnings)                           " -ForegroundColor Red
    Write-Host "                                                           " -ForegroundColor Red
    Write-Host "  Please fix errors before proceeding                     " -ForegroundColor Red
    Write-Host "=============================================================" -ForegroundColor Red
    exit 1
}
