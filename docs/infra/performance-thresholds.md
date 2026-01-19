# Performance Testing & Thresholds

## Overview

This document defines the performance requirements, testing methodology, and threshold values for the TerrainSim API. These thresholds ensure the system maintains acceptable performance under various load conditions.

## Performance Thresholds

### Response Time (Latency)

| Endpoint | P50 Target | P95 Target | P99 Target | Max Acceptable |
|----------|-----------|-----------|-----------|----------------|
| `/health` | < 50ms | < 200ms | < 300ms | 500ms |
| `/generate` | < 500ms | < 2000ms | < 3000ms | 5000ms |
| **Overall** | < 300ms | < 1000ms | < 2000ms | 3000ms |

### Throughput

| Metric | Minimum | Target | Notes |
|--------|---------|--------|-------|
| Requests Per Second (RPS) | 10 | 50 | Sustained load |
| Concurrent Users | 5 | 20 | Simultaneous active users |
| Generate Operations/min | 100 | 300 | Terrain generation capacity |

### Reliability

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Error Rate | < 5% | Percentage of failed requests |
| Success Rate | > 95% | Percentage of successful requests |
| Timeout Rate | < 1% | Requests exceeding max acceptable time |
| Server Error Rate | < 0.5% | 5xx status codes |

### Resource Utilization

| Resource | Warning | Critical | Notes |
|----------|---------|----------|-------|
| CPU Usage | 70% | 85% | Per container/instance |
| Memory Usage | 75% | 90% | Per container/instance |
| Response Queue | 100 | 500 | Pending requests |

## Load Test Scenarios

### 1. CI Scenario (ci-scenario.js)

**Purpose:** Quick smoke test for continuous integration
**Duration:** ~3 minutes
**Load Profile:**
- Ramp up: 30s to 3 users
- Sustained: 1m30s at 5 users
- Ramp down: 30s to 3 users, then 30s to 0

**Endpoints Tested:**
- `/health` - Health check validation
- `/generate` - Terrain generation with varied parameters

**Success Criteria:**
- P95 latency < 1000ms (all requests)
- P95 latency < 200ms (health endpoint)
- P95 latency < 2000ms (generate endpoint)
- Error rate < 5%
- Success rate > 90% (generate), > 95% (health)

### 2. Stress Test (stress-test.js)

**Purpose:** Identify system limits and breaking points
**Duration:** ~10 minutes
**Load Profile:**
- Progressive load increase from 1 to 50 users
- Sustained high load at 50 users for 3 minutes
- Gradual ramp down

**Success Criteria:**
- System remains responsive under high load
- Graceful degradation (no crashes)
- Error rate < 10% during peak
- Recovery after load reduction

### 3. Spike Test (spike-test.js)

**Purpose:** Evaluate behavior during sudden traffic spikes
**Duration:** ~5 minutes
**Load Profile:**
- Baseline: 5 users
- Sudden spike: 50 users for 1 minute
- Return to baseline

**Success Criteria:**
- System handles spike without crashing
- Recovery time < 30 seconds
- No lingering degradation after spike
- Error rate < 15% during spike

## Performance Regression Detection

### Baseline Establishment

A performance baseline is automatically established and updated after successful CI scenario runs. The baseline includes:
- P95 latency
- Requests per second (RPS)
- Timestamp and commit SHA

### Regression Criteria

A performance regression is flagged when:
- **P95 latency increases by > 10%** compared to baseline
- **RPS decreases by > 10%** compared to baseline

### Regression Response

When a regression is detected:
1. GitHub Actions workflow fails
2. Performance comparison is displayed in workflow summary
3. Team is notified via GitHub notifications
4. PR should not be merged until regression is resolved

## Running Load Tests

### Local Testing

```bash
# Install k6
# Windows (via Chocolatey):
choco install k6

# Mac (via Homebrew):
brew install k6

# Linux:
sudo apt-get install k6

# Run CI scenario
k6 run tests/load/ci-scenario.js

# Run against local API
k6 run tests/load/ci-scenario.js -e API_URL=http://localhost:3001

# Run stress test
k6 run tests/load/stress-test.js

# Run spike test
k6 run tests/load/spike-test.js
```

### CI/CD Integration

Load tests are triggered manually via GitHub Actions:

1. Go to **Actions** → **Load Testing**
2. Click **Run workflow**
3. Select scenario and API URL
4. Review results in workflow summary

**Available Scenarios:**
- `ci-scenario` - Quick validation (recommended for PR testing)
- `stress-test` - Extended stress test (use for release validation)
- `spike-test` - Traffic spike simulation

## Interpreting Results

### k6 Output Metrics

| Metric | Description | Ideal Value |
|--------|-------------|-------------|
| `http_req_duration` | Request latency | < thresholds |
| `http_req_failed` | Failed request rate | < 5% |
| `http_reqs` | Total requests | Higher is better |
| `iterations` | Completed test iterations | Smooth progress |
| `vus` | Virtual users | As configured |

### Key Performance Indicators (KPIs)

1. **P95 Latency:** 95% of requests complete within this time
2. **Error Rate:** Percentage of requests that failed
3. **RPS:** Sustainable request throughput
4. **Success Rate:** Percentage of requests returning 2xx status

### Red Flags

⚠️ **Immediate attention required if:**
- Error rate > 10%
- P95 latency > 2x threshold
- Memory/CPU consistently at critical levels
- Increasing response times during sustained load
- Server crashes or restarts during testing

## Performance Optimization Guidelines

### API Layer
- Implement request caching for repeated terrain generations
- Use connection pooling for database/external services
- Enable compression for large responses
- Optimize JSON serialization

### Computational Layer
- Parallelize terrain generation algorithms
- Implement result caching for common parameters
- Optimize noise generation algorithms
- Consider GPU acceleration for large terrains

### Infrastructure
- Implement auto-scaling based on CPU/memory
- Use CDN for static assets
- Enable rate limiting to prevent abuse
- Set up monitoring and alerting

## Monitoring & Alerting

### Production Monitoring

Monitor these metrics in production:
- Average response time (5-minute windows)
- P95/P99 latency trends
- Error rate and error types
- RPS and active connections
- Resource utilization (CPU, memory, disk I/O)

### Alert Thresholds

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Latency | P95 > 2000ms for 5min | Warning |
| Critical Latency | P95 > 3000ms for 2min | Critical |
| High Error Rate | Error rate > 5% for 3min | Warning |
| Critical Error Rate | Error rate > 10% for 1min | Critical |
| Resource Exhaustion | CPU/Memory > 85% for 5min | Warning |

## Baseline Performance (Reference)

*Last updated: Initial setup*

| Metric | Value | Date | Commit |
|--------|-------|------|--------|
| P95 Latency | TBD | - | - |
| RPS | TBD | - | - |
| Max Concurrent Users | TBD | - | - |

**Note:** Baseline values will be automatically updated after the first successful CI load test run.

## References

- [k6 Documentation](https://k6.io/docs/)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/running-large-tests/)
- [Performance Testing Guide](https://k6.io/docs/test-types/introduction/)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-01-XX | Initial performance thresholds defined | - |
