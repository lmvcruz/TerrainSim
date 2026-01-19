# Environment Validation Scripts

Comprehensive environment validation for the TerrainSim project. These scripts check all required dependencies, environment variables, file permissions, and running services before development or deployment.

## Quick Start

### Windows (PowerShell)
```powershell
.\scripts\validate-env.ps1
```

### Linux/macOS (Bash)
```bash
./scripts/validate-env.sh
```

### CI/CD Mode
```bash
# Bash
./scripts/validate-env.sh --ci

# PowerShell
.\scripts\validate-env.ps1 -CI
```

## What Gets Validated

### 1. Required Commands
Checks for essential development tools:
- ✅ **node** (version >= 20.x required)
- ✅ **pnpm** (package manager)
- ✅ **git** (version control)
- ⚠️ cmake (optional, for C++ compilation)
- ⚠️ python (optional, for scripts)
- ⚠️ docker (optional, for containerization)

**Windows Only:**
- Visual Studio Build Tools (required for C++ native addon compilation)

### 2. Node.js Version
Validates that Node.js version is 20.x or higher, as required by the project.

### 3. Environment Variables
Checks configuration variables:
- `NODE_ENV` (development/production)
- `PORT` (API server port, defaults to 3001)
- `VITE_API_URL` (from `apps/web/.env.development`)

### 4. File Permissions
Tests read/write access to critical directories:
- `apps/simulation-api/presets/` (terrain configuration storage)
- `docs/temp/` (temporary documentation files)
- `packages/terrain-engine/build/` (C++ native addon builds)

### 5. Dependencies
Verifies all dependencies are installed:
- Root `node_modules/` (workspace dependencies)
- `apps/web/node_modules/` (frontend dependencies)
- `apps/simulation-api/node_modules/` (backend dependencies)
- `pnpm-lock.yaml` (lockfile integrity)

### 6. C++ Native Addon
Checks if the terrain engine native addon is built:
- `packages/terrain-engine/build/Release/terrain_engine.node` (Release build)
- `packages/terrain-engine/build/Debug/terrain_engine.node` (Debug build)

**To build:** `cd packages/terrain-engine && pnpm build:native`

### 7. API Endpoints
Tests the simulation API server:
- Port check (default: 3001)
- Health endpoint: `GET http://localhost:3001/health`

**To start:** `cd apps/simulation-api && pnpm dev`

### 8. Frontend Dev Server
Checks the Vite development server:
- Port check (default: 5173)
- Server accessibility: `http://localhost:5173`

**To start:** `cd apps/web && pnpm dev`

### 9. Git Repository
Validates git repository status:
- Repository initialization
- Current branch
- Working tree state (clean/uncommitted changes)

## Exit Codes

| Code | Status | Description |
|------|--------|-------------|
| 0 | ✅ Success | All checks passed or warnings only |
| 1 | ❌ Failure | Critical errors found |

## Output Interpretation

### Success (No Issues)
```
=============================================================
                  ALL CHECKS PASSED

  Your environment is correctly configured!
=============================================================
```
**Exit code: 0** - Safe to proceed with development/deployment

### Warnings Only
```
=============================================================
              WARNINGS FOUND: 4

  Environment is functional but has warnings
=============================================================
```
**Exit code: 0** - Environment works, but some optional features unavailable

Common warnings:
- API not running (start with `pnpm dev`)
- C++ native addon not built (run `pnpm build:native`)
- Optional tools missing (cmake, docker)
- Uncommitted git changes

### Errors Found
```
=============================================================
              VALIDATION FAILED

  Errors: 2
  Warnings: 1

  Please fix errors before proceeding
=============================================================
```
**Exit code: 1** - Must fix errors before continuing

Common errors:
- Node.js version too old (upgrade to >= 20.x)
- Required commands missing (install node/pnpm/git)
- Dependencies not installed (run `pnpm install`)
- Insufficient file permissions

## Usage Examples

### Pre-development Check
Run before starting development to ensure environment is ready:
```bash
# Check environment
./scripts/validate-env.sh

# If all passed, start development
pnpm dev
```

### Pre-deployment Check
Validate production environment before deploying:
```bash
# Set production environment
export NODE_ENV=production
export PORT=3001

# Validate
./scripts/validate-env.sh --ci

# If passed, proceed with deployment
```

### CI/CD Integration
Add to GitHub Actions workflow:
```yaml
- name: Validate Environment
  run: ./scripts/validate-env.sh --ci

- name: Run Tests
  if: success()
  run: pnpm test
```

### Troubleshooting Failures
If validation fails:

1. **Check error messages** - Script provides actionable fixes
2. **Fix errors first** - Critical issues block development
3. **Address warnings** - Optional but recommended
4. **Re-run validation** - Confirm fixes worked

## Common Issues and Fixes

### Node.js version too old
```bash
# Install Node 20.x via nvm
nvm install 20
nvm use 20
```

### pnpm not found
```bash
# Install pnpm globally
npm install -g pnpm
```

### Dependencies not installed
```bash
# Install all workspace dependencies
pnpm install
```

### C++ native addon not built
```bash
# Build the terrain engine
cd packages/terrain-engine
pnpm build:native
```

### API not responding
```bash
# Start the API server
cd apps/simulation-api
pnpm dev
```

### Git working tree not clean
```bash
# Commit or stash changes
git add .
git commit -m "Your message"
# or
git stash
```

## Script Maintenance

### Adding New Checks
1. Add validation logic to both `validate-env.sh` and `validate-env.ps1`
2. Use appropriate helper functions (`error`, `warn`, `success`, `info`)
3. Update this README with new validation category
4. Test on both Windows and Linux

### Modifying Thresholds
- Node.js version requirement: Search for `NODE_MAJOR -ge 20`
- API port: Change `PORT` default from 3001
- Frontend port: Change `FRONTEND_PORT` from 5173

## Related Scripts

- [pre-deploy-scan.sh](./pre-deploy-scan.sh) - Security and quality scans
- [aggregate-logs.sh](./aggregate-logs.sh) - Log collection from all platforms
- [compare-benchmarks.py](./compare-benchmarks.py) - Performance regression detection

## See Also

- [Local Environment Guide](../docs/infra/LOCAL_ENVIRONMENT_GUIDE.md)
- [Testing Guide](../docs/infra/TESTING_GUIDE.md)
- [Repository Improvement Plan](../docs/plan/REPO_IMPROVEMENT_PLAN.md)
