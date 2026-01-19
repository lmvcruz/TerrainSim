#!/bin/bash

# Pre-deployment Security and Quality Scanner
# Detects common issues before deployment to prevent production problems
# Usage: ./scripts/pre-deploy-scan.sh [--report-file output.txt]

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/.scanrc.json"
REPORT_FILE=""

# Counters
ERRORS=0
WARNINGS=0
INFO=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --report-file)
      REPORT_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Initialize report file
if [ -n "$REPORT_FILE" ]; then
  echo "# Pre-Deployment Scan Report" > "$REPORT_FILE"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
fi

log_error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  ERRORS=$((ERRORS + 1))
  if [ -n "$REPORT_FILE" ]; then
    echo "- ❌ ERROR: $1" >> "$REPORT_FILE"
  fi
}

log_warning() {
  echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
  WARNINGS=$((WARNINGS + 1))
  if [ -n "$REPORT_FILE" ]; then
    echo "- ⚠️  WARNING: $1" >> "$REPORT_FILE"
  fi
}

log_info() {
  echo -e "${BLUE}ℹ️  INFO: $1${NC}"
  INFO=$((INFO + 1))
  if [ -n "$REPORT_FILE" ]; then
    echo "- ℹ️  INFO: $1" >> "$REPORT_FILE"
  fi
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
  if [ -n "$REPORT_FILE" ]; then
    echo "- ✅ $1" >> "$REPORT_FILE"
  fi
}

echo "🔍 Pre-Deployment Security and Quality Scanner"
echo "============================================="
echo ""

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  log_error "Configuration file not found: $CONFIG_FILE"
  exit 1
fi

# 1. Check for hardcoded secrets
echo "🔐 Checking for hardcoded secrets..."
if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## Secret Detection" >> "$REPORT_FILE"
fi

SECRET_PATTERNS=(
  "API[_-]?KEY.*=.*['\"][a-zA-Z0-9]{20,}['\"]"
  "SECRET[_-]?KEY.*=.*['\"][a-zA-Z0-9]{20,}['\"]"
  "PASSWORD.*=.*['\"][^'\"]{8,}['\"]"
  "PRIVATE[_-]?KEY.*=.*['\"]-----BEGIN"
  "aws_access_key_id.*=.*[a-zA-Z0-9]{20}"
  "GITHUB_TOKEN.*=.*ghp_[a-zA-Z0-9]{36}"
)

SECRET_FOUND=false
for pattern in "${SECRET_PATTERNS[@]}"; do
  results=$(grep -rE "$pattern" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
    "$PROJECT_ROOT" 2>/dev/null || true)

  if [ -n "$results" ]; then
    SECRET_FOUND=true
    while IFS= read -r line; do
      log_error "Potential hardcoded secret: $line"
    done <<< "$results"
  fi
done

if [ "$SECRET_FOUND" = false ]; then
  log_success "No hardcoded secrets detected"
fi

# 2. Check for console.log in production code
echo ""
echo "📝 Checking for console.log in production code..."
if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## Console Log Detection" >> "$REPORT_FILE"
fi

CONSOLE_LOGS=$(grep -rn "console\\.log" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  --exclude="*.test.ts" --exclude="*.test.tsx" --exclude="*.spec.ts" \
  "$PROJECT_ROOT/apps/web/src" "$PROJECT_ROOT/apps/simulation-api/src" 2>/dev/null || true)

if [ -n "$CONSOLE_LOGS" ]; then
  COUNT=$(echo "$CONSOLE_LOGS" | wc -l)
  log_warning "Found $COUNT console.log statements in production code"
  echo "$CONSOLE_LOGS" | head -n 10 | while IFS= read -r line; do
    log_info "  $line"
  done
  if [ $COUNT -gt 10 ]; then
    log_info "  ... and $((COUNT - 10)) more"
  fi
else
  log_success "No console.log statements in production code"
fi

# 3. Check bundle sizes
echo ""
echo "📦 Checking bundle sizes..."
if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## Bundle Size Check" >> "$REPORT_FILE"
fi

MAX_SIZE_MB=5
MAX_SIZE_BYTES=$((MAX_SIZE_MB * 1024 * 1024))

BUNDLE_PATHS=(
  "apps/web/dist"
  "apps/simulation-api/dist"
)

for bundle_path in "${BUNDLE_PATHS[@]}"; do
  full_path="$PROJECT_ROOT/$bundle_path"
  if [ -d "$full_path" ]; then
    # Find all JS files larger than MAX_SIZE_MB
    large_files=$(find "$full_path" -name "*.js" -type f -size +${MAX_SIZE_MB}M 2>/dev/null || true)

    if [ -n "$large_files" ]; then
      while IFS= read -r file; do
        size=$(du -h "$file" | cut -f1)
        log_warning "Large bundle file: $file (${size})"
      done <<< "$large_files"
    else
      log_success "All bundles in $bundle_path are under ${MAX_SIZE_MB}MB"
    fi
  else
    log_info "Bundle directory not found: $bundle_path (run build first)"
  fi
done

# 4. Check for broken imports
echo ""
echo "🔗 Checking for broken imports..."
if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## Broken Import Detection" >> "$REPORT_FILE"
fi

# Use TypeScript compiler to check imports
if command -v pnpm &> /dev/null; then
  log_info "Running TypeScript type check..."

  cd "$PROJECT_ROOT"

  # Check frontend
  if pnpm --filter web run type-check 2>&1 | grep -E "error TS|Cannot find module" > /tmp/ts-errors-web.txt; then
    log_warning "TypeScript errors found in frontend:"
    cat /tmp/ts-errors-web.txt | head -n 5 | while IFS= read -r line; do
      log_info "  $line"
    done
  else
    log_success "No broken imports in frontend"
  fi

  # Check backend
  if pnpm --filter simulation-api run type-check 2>&1 | grep -E "error TS|Cannot find module" > /tmp/ts-errors-api.txt; then
    log_warning "TypeScript errors found in backend:"
    cat /tmp/ts-errors-api.txt | head -n 5 | while IFS= read -r line; do
      log_info "  $line"
    done
  else
    log_success "No broken imports in backend"
  fi

  rm -f /tmp/ts-errors-web.txt /tmp/ts-errors-api.txt
else
  log_warning "pnpm not found, skipping import validation"
fi

# 5. Check for error boundaries in React components
echo ""
echo "🛡️  Checking for error boundaries..."
if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## Error Boundary Check" >> "$REPORT_FILE"
fi

# Look for ErrorBoundary usage
ERROR_BOUNDARY_COUNT=$(grep -r "ErrorBoundary" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  "$PROJECT_ROOT/apps/web/src" 2>/dev/null | wc -l || echo "0")

if [ "$ERROR_BOUNDARY_COUNT" -eq 0 ]; then
  log_warning "No ErrorBoundary components found - consider adding error boundaries to catch React errors"
else
  log_success "Found $ERROR_BOUNDARY_COUNT ErrorBoundary usages"
fi

# 6. Check environment variables
echo ""
echo "🔧 Checking environment variables..."
if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## Environment Variable Check" >> "$REPORT_FILE"
fi

# Extract env vars used in code
USED_ENV_VARS=$(grep -roh "process\.env\.[A-Z_]*" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  "$PROJECT_ROOT/apps" 2>/dev/null | sort -u | sed 's/process\.env\.//' || true)

if [ -n "$USED_ENV_VARS" ]; then
  log_info "Environment variables used in code:"
  echo "$USED_ENV_VARS" | while IFS= read -r var; do
    if [ -n "$var" ]; then
      # Check if documented
      if grep -q "$var" "$PROJECT_ROOT/docs/infra/LOCAL_ENVIRONMENT_GUIDE.md" 2>/dev/null; then
        log_success "  $var (documented)"
      else
        log_warning "  $var (not documented in LOCAL_ENVIRONMENT_GUIDE.md)"
      fi
    fi
  done
fi

# 7. Check for TODO/FIXME comments
echo ""
echo "📋 Checking for TODO/FIXME comments..."
if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## TODO/FIXME Comments" >> "$REPORT_FILE"
fi

TODO_COUNT=$(grep -rn "TODO\|FIXME" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  "$PROJECT_ROOT/apps" 2>/dev/null | wc -l || echo "0")

if [ "$TODO_COUNT" -gt 0 ]; then
  log_info "Found $TODO_COUNT TODO/FIXME comments (review before deployment)"
else
  log_success "No TODO/FIXME comments found"
fi

# 8. Check for unused dependencies
echo ""
echo "📦 Checking for unused dependencies..."
if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## Unused Dependencies" >> "$REPORT_FILE"
fi

if command -v pnpm &> /dev/null; then
  # This is a quick check - for full audit use CLEAN-001 process
  log_info "Run 'pnpm list --depth 0' in each workspace to verify dependencies"
  log_info "See docs/temp/DEPENDENCY_AUDIT_*.md for detailed audit results"
else
  log_warning "pnpm not found, skipping dependency check"
fi

# Summary
echo ""
echo "============================================="
echo "📊 Scan Summary"
echo "============================================="
echo -e "${RED}Errors:   $ERRORS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${BLUE}Info:     $INFO${NC}"
echo ""

if [ -n "$REPORT_FILE" ]; then
  echo "" >> "$REPORT_FILE"
  echo "## Summary" >> "$REPORT_FILE"
  echo "- Errors: $ERRORS" >> "$REPORT_FILE"
  echo "- Warnings: $WARNINGS" >> "$REPORT_FILE"
  echo "- Info: $INFO" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo "Report saved to: $REPORT_FILE"
fi

# Exit with error if critical issues found
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ Scan failed with $ERRORS error(s)${NC}"
  exit 1
elif [ $WARNINGS -gt 10 ]; then
  echo -e "${YELLOW}⚠️  Scan passed with $WARNINGS warning(s) - review before deployment${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Scan passed - ready for deployment${NC}"
  exit 0
fi
