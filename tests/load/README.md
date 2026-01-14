# Load Testing with k6

This directory contains k6 load testing scripts for the TerrainSim API.

## Prerequisites

Install k6:
```powershell
# Windows
winget install k6 --source winget

# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scenarios

### 1. Health Check Baseline (`health-check.js`)
Tests the `/health` endpoint with 10 concurrent users.

**Thresholds:**
- 95% of requests < 200ms
- Less than 1% failure rate

**Run:**
```powershell
k6 run tests/load/health-check.js
```

### 2. Terrain Generation (`terrain-generation.js`)
Tests the `/generate` endpoint with various noise parameters.

**Stages:**
- 5 concurrent users for 2 minutes
- Spike to 10 users
- Sustain 10 users for 1 minute

**Thresholds:**
- 95% of requests < 2s
- Less than 5% failure rate

**Run:**
```powershell
k6 run tests/load/terrain-generation.js
```

### 3. WebSocket Simulation (`websocket-simulation.js`)
Tests real-time erosion simulation via WebSocket.

**Stages:**
- 3 concurrent simulations
- Spike to 5 simulations

**Thresholds:**
- Connection time < 500ms (95%)
- First frame latency < 1s (95%)
- Less than 10% error rate

**Run:**
```powershell
k6 run tests/load/websocket-simulation.js
```

### 4. Comprehensive Scenario (`comprehensive-scenario.js`)
Tests complete workflow: health check → generate → simulate.

**Stages:**
- 5 concurrent users
- Spike to 10 users

**Thresholds:**
- End-to-end workflow < 35s (95%)
- Less than 10% error rate

**Run:**
```powershell
k6 run tests/load/comprehensive-scenario.js
```

## Configuration

Override API URLs via environment variables:

```powershell
# Production (default)
k6 run tests/load/health-check.js

# Local development
$env:API_URL="http://localhost:3001"; $env:WS_URL="ws://localhost:3001"; k6 run tests/load/health-check.js
```

## Output

k6 provides detailed metrics:

- **http_req_duration**: Request duration (min, avg, max, p90, p95)
- **http_req_failed**: Percentage of failed requests
- **iterations**: Number of completed test iterations
- **vus**: Virtual users (concurrent connections)
- **Custom metrics**: Specific to each test (e.g., terrain_generation_duration, ws_frames_received)

## HTML Reports

Generate HTML report:
```powershell
k6 run --out json=test-results.json tests/load/comprehensive-scenario.js
k6 report test-results.json
```

## CI Integration

Add to `.github/workflows/performance-test.yml` (manual trigger):

```yaml
name: Performance Testing

on:
  workflow_dispatch:
    inputs:
      scenario:
        description: 'Test scenario to run'
        required: true
        default: 'comprehensive-scenario'
        type: choice
        options:
          - health-check
          - terrain-generation
          - websocket-simulation
          - comprehensive-scenario

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run k6 test
        run: k6 run tests/load/${{ github.event.inputs.scenario }}.js
        env:
          API_URL: https://api.lmvcruz.work
          WS_URL: wss://api.lmvcruz.work
```

## Interpreting Results

**Good performance indicators:**
- ✅ p95 http_req_duration < thresholds
- ✅ http_req_failed < 1-5%
- ✅ No timeout errors
- ✅ Consistent frame delivery (WebSocket tests)

**Warning signs:**
- ⚠️ Increasing response times during sustained load
- ⚠️ Memory leaks (check PM2 logs)
- ⚠️ WebSocket disconnections
- ⚠️ HTTP 5xx errors

## Next Steps

After establishing baseline performance (TEST-007), use these tests to:
1. Validate optimizations don't cause regressions
2. Identify bottlenecks under load
3. Stress test before production deployments
4. Benchmark new features

## Related Documentation

- [docs/infra/PERFORMANCE_METRICS.md](../../docs/infra/PERFORMANCE_METRICS.md) - Performance baseline documentation
- [docs/infra/BACKEND_CICD_SETUP.md](../../docs/infra/BACKEND_CICD_SETUP.md) - Deployment workflow
- [docs/infra/MONITORING_SETUP.md](../../docs/infra/MONITORING_SETUP.md) - UptimeRobot monitoring
