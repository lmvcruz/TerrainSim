# Load Testing Suite

This directory contains k6 load testing scripts for the TerrainSim API.

## Prerequisites

Install k6 on your system:

**Windows (Chocolatey):**
```powershell
choco install k6
```

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scenarios

### 1. CI Scenario (`ci-scenario.js`)
**Purpose:** Quick smoke test for continuous integration
**Duration:** ~3 minutes
**Max Users:** 5 concurrent users

Validates basic functionality and performance thresholds:
- Health endpoint responsiveness (< 200ms p95)
- Terrain generation performance (< 2s p95)
- Overall system stability (< 5% error rate)

**Usage:**
```bash
# Run against production
k6 run ci-scenario.js

# Run against local dev server
k6 run ci-scenario.js -e API_URL=http://localhost:3001

# Run with custom duration multiplier
k6 run ci-scenario.js -e DURATION_MULTIPLIER=2.0
```

### 2. Health Check Baseline (`health-check.js`)
Tests the `/health` endpoint with 10 concurrent users.

**Thresholds:**
- 95% of requests < 200ms
- Less than 1% failure rate

**Run:**
```powershell
k6 run tests/load/health-check.js
```

### 3. Terrain Generation (`terrain-generation.js`)
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

### 4. Stress Test (`stress-test.js`)
**Purpose:** Identify system limits and breaking points
**Duration:** ~10 minutes
**Max Users:** 50 concurrent users

Progressively increases load to find:
- Maximum sustainable throughput
- Performance degradation patterns
- System breaking point
- Resource exhaustion behavior

**Usage:**
```bash
k6 run stress-test.js

# With results export
k6 run stress-test.js --out json=stress-results.json
```

### 5. Spike Test (`spike-test.js`)
**Purpose:** Evaluate behavior during sudden traffic spikes
**Duration:** ~5 minutes
**Pattern:** Baseline → Spike → Recovery

Tests:
- Auto-scaling response time
- System stability under rapid load changes
- Recovery time after spike
- Graceful degradation

**Usage:**
```bash
k6 run spike-test.js

# Monitor in real-time with cloud output
k6 run spike-test.js --out cloud
```

### 6. WebSocket Simulation (`websocket-simulation.js`)
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

### 7. Comprehensive Scenario (`comprehensive-scenario.js`)
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

## Running Tests Locally

### Basic Execution
```bash
# From project root
k6 run tests/load/ci-scenario.js

# From tests/load directory
cd tests/load
k6 run ci-scenario.js
```

### Advanced Options

**Custom API URL:**
```bash
k6 run ci-scenario.js -e API_URL=http://localhost:3001
```

**Export Results:**
```bash
# JSON output
k6 run ci-scenario.js --out json=results.json

# CSV output
k6 run ci-scenario.js --out csv=results.csv

# Multiple outputs
k6 run ci-scenario.js --out json=results.json --out csv=results.csv
```

## Configuration

Override API URLs via environment variables:

```powershell
# Production (default)
k6 run tests/load/health-check.js

# Local development
$env:API_URL="http://localhost:3001"; $env:WS_URL="ws://localhost:3001"; k6 run tests/load/health-check.js
```

## Interpreting Results

### Key Metrics

| Metric | Description | Good Value |
|--------|-------------|------------|
| `http_req_duration` | Request latency | P95 < 1000ms |
| `http_req_failed` | Failed request rate | < 5% |
| `http_reqs` | Total requests & RPS | Consistent throughput |
| `checks` | Validation success rate | > 95% |
| `iterations` | Completed VU iterations | Smooth progress |
| `vus` | Virtual users | As configured |

### Reading k6 Output

```
✓ checks.........................: 98.50%
✗ errors........................: 1.50%
  http_req_duration..............: avg=245ms med=198ms p(95)=856ms
    ✓ health....................: p(95)=124ms
    ✓ generate..................: p(95)=1456ms
  http_req_failed...............: 1.20%
  http_reqs......................: 2847 (23.45/s)
  vus............................: 5 (max=5)
```

**What this means:**
- 98.5% of checks passed ✅
- 1.5% error rate ✅ (under 5% threshold)
- Average response: 245ms ✅
- P95 latency: 856ms ✅ (under 1000ms threshold)
- 23.45 requests/second sustained
- 1.2% request failure rate ✅

## Performance Regression Detection

The CI scenario automatically establishes and maintains a performance baseline:

1. **First Run:** Establishes baseline (P95 latency, RPS)
2. **Subsequent Runs:** Compares against baseline
3. **Regression Alert:** Fails if:
   - P95 latency increases > 10%
   - RPS decreases > 10%

**Baseline File:** `.github/performance-baseline.json`

```json
{
  "p95_latency": 856.42,
  "rps": 23.45,
  "updated_at": "2024-01-15T10:30:00Z",
  "scenario": "ci-scenario",
  "commit_sha": "abc123def456"
}
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
```

## CI/CD Integration

Load tests are integrated into GitHub Actions with manual triggers.

### Running via GitHub Actions

1. Navigate to **Actions** tab in GitHub
2. Select **Load Testing** workflow
3. Click **Run workflow**
4. Configure options:
   - **Scenario:** Choose test scenario (ci-scenario, stress-test, spike-test)
   - **API URL:** Target API endpoint
   - **Duration Multiplier:** Scale test duration
5. Click **Run workflow**

Results are automatically:
- Displayed in workflow summary
- Compared against performance baseline
- Stored as artifacts (30-day retention)
- Used to detect performance regressions

See [.github/workflows/load-test.yml](../../.github/workflows/load-test.yml) for the workflow configuration.

## Best Practices

### Test Execution

1. **Start Small:** Always run CI scenario first
2. **Validate Locally:** Test against local API before production
3. **Monitor Resources:** Watch CPU/memory during tests
4. **Warm Up API:** Run a quick test first to warm caches
5. **Off-Peak Testing:** Run stress/spike tests during low-traffic periods

### Result Analysis

1. **Check Thresholds First:** Did the test pass/fail?
2. **Review Error Rates:** Investigate failures
3. **Analyze Trends:** Compare with previous runs
4. **Correlate Metrics:** CPU/memory vs. response time
5. **Document Findings:** Keep a performance journal

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/running-large-tests/)
- [Performance Thresholds](../../docs/performance-thresholds.md)
- [k6 Cloud (optional)](https://k6.io/cloud/)
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
