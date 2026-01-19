#!/bin/bash
# Environment Validation Script
# Validates all required environment variables, endpoints, and file permissions
# Usage: ./scripts/validate-env.sh [--ci]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# CI mode flag
CI_MODE=false
if [[ "$1" == "--ci" ]]; then
  CI_MODE=true
fi

ERRORS=0
WARNINGS=0

# Helper functions
error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
  WARNINGS=$((WARNINGS + 1))
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
  local port=$1
  if command_exists lsof; then
    lsof -i ":$port" >/dev/null 2>&1
  elif command_exists netstat; then
    netstat -tuln 2>/dev/null | grep -q ":$port "
  else
    # Fallback: try to connect
    timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null
  fi
}

# Start validation
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       TerrainSim Environment Validation Script           ║"
echo "║                                                           ║"
echo "║  Validates configuration, dependencies, and endpoints    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if $CI_MODE; then
  info "Running in CI mode"
fi

# ============================================
# 1. Check Required Commands
# ============================================
header "1. Checking Required Commands"

REQUIRED_COMMANDS=("node" "pnpm" "git")
OPTIONAL_COMMANDS=("curl" "cmake" "g++" "clang++")

for cmd in "${REQUIRED_COMMANDS[@]}"; do
  if command_exists "$cmd"; then
    version=$($cmd --version 2>&1 | head -n 1)
    success "$cmd installed: $version"
  else
    error "$cmd not found (required)"
  fi
done

for cmd in "${OPTIONAL_COMMANDS[@]}"; do
  if command_exists "$cmd"; then
    version=$($cmd --version 2>&1 | head -n 1)
    success "$cmd installed: $version"
  else
    warn "$cmd not found (optional but recommended)"
  fi
done

# ============================================
# 2. Check Node.js Version
# ============================================
header "2. Validating Node.js Version"

if command_exists node; then
  NODE_VERSION=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

  if [ "$NODE_MAJOR" -ge 20 ]; then
    success "Node.js version $NODE_VERSION (>= 20.x required)"
  else
    error "Node.js version $NODE_VERSION is too old (>= 20.x required)"
  fi
else
  error "Node.js not installed"
fi

# ============================================
# 3. Check Environment Variables
# ============================================
header "3. Checking Environment Variables"

# Backend environment variables
if [ -n "$NODE_ENV" ]; then
  success "NODE_ENV: $NODE_ENV"
else
  info "NODE_ENV not set (defaults to development)"
fi

if [ -n "$PORT" ]; then
  success "PORT: $PORT"
else
  info "PORT not set (defaults to 3001)"
fi

# Frontend environment variables (check .env files)
if [ -f "apps/web/.env.development" ]; then
  success "Frontend .env.development exists"

  # Check for VITE_API_URL
  if grep -q "VITE_API_URL" apps/web/.env.development; then
    API_URL=$(grep "VITE_API_URL" apps/web/.env.development | cut -d= -f2)
    success "VITE_API_URL configured: $API_URL"
  else
    warn "VITE_API_URL not set in .env.development (will use default)"
  fi
else
  warn "apps/web/.env.development not found"
fi

# ============================================
# 4. Check File Permissions
# ============================================
header "4. Validating File Permissions"

DIRS_TO_CHECK=(
  "apps/simulation-api/presets"
  "docs/temp"
  "packages/terrain-engine/build"
)

for dir in "${DIRS_TO_CHECK[@]}"; do
  if [ -d "$dir" ]; then
    if [ -r "$dir" ] && [ -w "$dir" ]; then
      success "$dir: readable and writable"
    else
      error "$dir: insufficient permissions"
    fi
  else
    warn "$dir: directory does not exist"
  fi
done

# ============================================
# 5. Check Dependencies
# ============================================
header "5. Checking Dependencies"

if [ -f "pnpm-lock.yaml" ]; then
  success "pnpm-lock.yaml exists"

  # Check if node_modules exist
  if [ -d "node_modules" ]; then
    success "Root node_modules installed"
  else
    warn "Root node_modules not found - run 'pnpm install'"
  fi

  if [ -d "apps/web/node_modules" ]; then
    success "Web app node_modules installed"
  else
    warn "Web app node_modules not found - run 'pnpm install'"
  fi

  if [ -d "apps/simulation-api/node_modules" ]; then
    success "API node_modules installed"
  else
    warn "API node_modules not found - run 'pnpm install'"
  fi
else
  error "pnpm-lock.yaml not found"
fi

# Check if C++ library is built
if [ -f "packages/terrain-engine/build/Release/terrain_engine.node" ]; then
  success "C++ terrain engine built (Release)"
elif [ -f "packages/terrain-engine/build/Debug/terrain_engine.node" ]; then
  success "C++ terrain engine built (Debug)"
else
  warn "C++ terrain engine not built - run 'pnpm build:native' in packages/terrain-engine"
fi

# ============================================
# 6. Check API Endpoints
# ============================================
header "6. Testing API Endpoints"

API_PORT=${PORT:-3001}
API_BASE="http://localhost:$API_PORT"

# Check if API port is in use
if port_in_use "$API_PORT"; then
  info "Port $API_PORT is in use - testing endpoints..."

  # Test health endpoint
  if command_exists curl; then
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health" 2>/dev/null || echo "000")

    if [ "$HEALTH_RESPONSE" = "200" ]; then
      success "API health check: $API_BASE/health"
    elif [ "$HEALTH_RESPONSE" = "000" ]; then
      error "API not responding at $API_BASE/health"
    else
      error "API health check failed: HTTP $HEALTH_RESPONSE"
    fi
  else
    warn "curl not available - skipping endpoint tests"
  fi
else
  if $CI_MODE; then
    error "API not running on port $API_PORT (required in CI)"
  else
    warn "API not running on port $API_PORT (start with 'pnpm dev' in apps/simulation-api)"
  fi
fi

# ============================================
# 7. Check Frontend Dev Server
# ============================================
header "7. Checking Frontend Dev Server"

FRONTEND_PORT=5173
FRONTEND_BASE="http://localhost:$FRONTEND_PORT"

if port_in_use "$FRONTEND_PORT"; then
  success "Frontend dev server running on port $FRONTEND_PORT"

  if command_exists curl; then
    FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_BASE" 2>/dev/null || echo "000")

    if [ "$FRONTEND_RESPONSE" = "200" ]; then
      success "Frontend accessible at $FRONTEND_BASE"
    else
      warn "Frontend responded with HTTP $FRONTEND_RESPONSE"
    fi
  fi
else
  if $CI_MODE; then
    info "Frontend not running (not required in CI)"
  else
    info "Frontend not running (start with 'pnpm dev' in apps/web)"
  fi
fi

# ============================================
# 8. Check Git Repository Status
# ============================================
header "8. Checking Git Repository"

if command_exists git; then
  if git rev-parse --git-dir > /dev/null 2>&1; then
    success "Git repository initialized"

    # Check current branch
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    info "Current branch: $BRANCH"

    # Check for uncommitted changes
    if git diff-index --quiet HEAD -- 2>/dev/null; then
      success "Working tree clean"
    else
      warn "Uncommitted changes detected"
    fi
  else
    error "Not a git repository"
  fi
fi

# ============================================
# Summary
# ============================================
header "Validation Summary"

echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                  ✅ ALL CHECKS PASSED                     ║${NC}"
  echo -e "${GREEN}║                                                           ║${NC}"
  echo -e "${GREEN}║  Your environment is correctly configured!               ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║              ⚠️  WARNINGS FOUND: $WARNINGS                     ║${NC}"
  echo -e "${YELLOW}║                                                           ║${NC}"
  echo -e "${YELLOW}║  Environment is functional but has warnings              ║${NC}"
  echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║              ❌ VALIDATION FAILED                          ║${NC}"
  echo -e "${RED}║                                                           ║${NC}"
  echo -e "${RED}║  Errors: $ERRORS                                              ║${NC}"
  echo -e "${RED}║  Warnings: $WARNINGS                                           ║${NC}"
  echo -e "${RED}║                                                           ║${NC}"
  echo -e "${RED}║  Please fix errors before proceeding                     ║${NC}"
  echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi
