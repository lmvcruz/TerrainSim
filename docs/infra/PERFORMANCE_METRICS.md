# Performance Metrics & Baseline Documentation

**Last Updated:** January 14, 2026
**System:** AWS EC2 t3.micro (1 vCPU, 1GB RAM, Ubuntu 22.04)
**Node Version:** v20.19.6
**PM2 Version:** v6.0.14

---

## Executive Summary

This document establishes performance baselines for the TerrainSim application. Metrics are measured on production infrastructure (api.lmvcruz.work) to represent real-world performance characteristics.

**Key Findings (To be populated after load testing):**
- Current bottleneck: *TBD after TEST-017 execution*
- Recommended optimization priority: *TBD after analysis*
- System capacity: *TBD* concurrent users

---

## 1. API Endpoint Performance

### 1.1 Health Check (`GET /health`)

**Purpose:** Simple health status endpoint for monitoring.

**Baseline Metrics:**
```
Response Time:
  - Min: TBD ms
  - Avg: TBD ms
  - Max: TBD ms
  - p50: TBD ms
  - p95: TBD ms
  - p99: TBD ms

Throughput:
  - Requests/sec: TBD
  - Concurrent users (sustained): TBD
  - Peak concurrent users: TBD

Error Rate:
  - HTTP 5xx: TBD%
  - Timeout rate: TBD%
```

**Test Command:**
```powershell
k6 run tests/load/health-check.js
```

**Expected Performance:**
- ✅ p95 < 200ms
- ✅ Error rate < 1%
- ✅ Sustain 50+ concurrent users

### 1.2 Terrain Generation (`POST /generate`)

**Purpose:** Generate procedural terrain using Perlin noise (256×256 grid).

**Parameters Tested:**
- Grid size: 256×256 (65,536 cells)
- Octaves: 4-6
- Frequency: 0.03-0.1
- Various seeds

**Baseline Metrics:**
```
Response Time (256×256, 4 octaves):
  - Min: TBD ms
  - Avg: TBD ms
  - Max: TBD ms
  - p50: TBD ms
  - p95: TBD ms
  - p99: TBD ms

Throughput:
  - Requests/sec: TBD
  - Concurrent users (sustained): TBD
  - Generations/minute: TBD

Error Rate:
  - HTTP 5xx: TBD%
  - Timeout rate: TBD%

Resource Usage:
  - CPU utilization: TBD%
  - Memory usage: TBD MB
  - Peak memory: TBD MB
```

**Test Command:**
```powershell
k6 run tests/load/terrain-generation.js
```

**Expected Performance:**
- ✅ p95 < 2000ms (2 seconds)
- ✅ Error rate < 5%
- ✅ Sustain 5-10 concurrent requests
- ⚠️ **Known limitation:** CPU-bound operation on single-core t3.micro

**Optimization Opportunities:**
1. Implement caching for identical parameters (PERF-001, Iteration 6)
2. Add response compression for large data payloads
3. Consider WASM offload to edge (WASM-003, Iteration 3.5 Block 5)

---

## 2. WebSocket Performance

### 2.1 Erosion Simulation (`/simulate` via WebSocket)

**Purpose:** Real-time hydraulic erosion simulation with frame streaming.

**Simulation Parameters Tested:**
- Grid size: 256×256
- Droplets: 5,000-50,000
- Erosion radius: 3
- Frame rate: Varies by droplet count

**Baseline Metrics:**
```
Connection Metrics:
  - Connection establishment: TBD ms (p95)
  - First frame latency: TBD ms (p95)
  - Average frame interval: TBD ms

Throughput:
  - Frames/second: TBD fps (backend generation)
  - Frames/second: TBD fps (client reception)
  - Concurrent simulations: TBD
  - Total frames delivered: TBD

Latency:
  - Server frame generation: TBD ms/frame
  - Network transmission: TBD ms/frame
  - End-to-end (generation → client): TBD ms

Error Rate:
  - Connection failures: TBD%
  - Disconnections: TBD%
  - Frame drops: TBD%

Resource Usage:
  - CPU per simulation: TBD%
  - Memory per simulation: TBD MB
  - Network bandwidth: TBD KB/sec
```

**Test Command:**
```powershell
k6 run tests/load/websocket-simulation.js
```

**Expected Performance:**
- ✅ Connection time < 500ms (p95)
- ✅ First frame < 1000ms (p95)
- ✅ Sustain 30+ fps frame generation (256×256)
- ✅ Sustain 3-5 concurrent simulations
- ⚠️ **Known limitation:** Frame delivery rate depends on network conditions

**Performance Characteristics:**

| Droplet Count | Expected Duration | Backend FPS | Client FPS (estimated) |
|---------------|-------------------|-------------|------------------------|
| 5,000         | ~5-10s            | 40-60 fps   | 35-50 fps              |
| 10,000        | ~10-20s           | 35-45 fps   | 30-40 fps              |
| 50,000        | ~50-90s           | 25-35 fps   | 20-30 fps              |

---

## 3. End-to-End Pipeline Performance

### 3.1 Complete Workflow

**Scenario:** Health check → Generate terrain → Run erosion simulation

**Pipeline Stages:**
1. **Health Check:** Verify API availability (~50-100ms)
2. **Terrain Generation:** 256×256 Perlin noise with 4 octaves (~500-1500ms)
3. **WebSocket Connection:** Establish connection (~100-300ms)
4. **Erosion Simulation:** 10,000 droplets (~15-25s)

**Baseline Metrics:**
```
End-to-End Latency:
  - Total workflow time: TBD seconds (p95)
  - Breakdown:
    - Health check: TBD ms
    - Terrain generation: TBD ms
    - WebSocket setup: TBD ms
    - Erosion simulation: TBD seconds
    - First visible result: TBD seconds

Bottleneck Analysis:
  - Primary bottleneck: TBD
  - Secondary bottleneck: TBD
  - Network latency contribution: TBD%
  - Computation contribution: TBD%
```

**Test Command:**
```powershell
k6 run tests/load/comprehensive-scenario.js
```

**Expected Performance:**
- ✅ Complete workflow < 35s (p95)
- ✅ Error rate < 10%
- ✅ Sustain 5-10 concurrent workflows

---

## 4. C++ Benchmark Results

### 4.1 Running Benchmarks

**Build with benchmarks:**
```powershell
cd libs/core/build
cmake -DBUILD_BENCHMARKS=ON ..
cmake --build . --config Release
./Release/terrain_core_benchmarks.exe
```

**Note:** Benchmarks are **not** run in CI automatically. Manual trigger only to avoid slowing down development workflow.

### 4.2 Heightmap Operations

**Operations Benchmarked:**
- Heightmap creation (128×128, 256×256, 512×512)
- Random access patterns
- Sequential write patterns
- Copy operations
- Neighbor access (4-connected)

**Baseline Results:**
```
Heightmap Creation (256×256):
  - Time: TBD μs
  - Throughput: TBD cells/sec

Random Access (256×256):
  - Time: TBD ns/operation
  - Throughput: TBD ops/sec

Sequential Write (256×256):
  - Time: TBD ms
  - Throughput: TBD cells/sec
  - Complexity: O(n²) confirmed

Neighbor Access (256×256):
  - Time: TBD ms (5 accesses per cell)
  - Cache hit rate: TBD%
```

### 4.3 Perlin Noise Generation

**Operations Benchmarked:**
- Single octave generation (128×128, 256×256, 512×512)
- fBm with 1, 2, 4, 6, 8 octaves
- Gradient generation overhead
- Single sample performance

**Baseline Results:**
```
Single Octave (256×256):
  - Time: TBD ms
  - Throughput: TBD cells/sec
  - Complexity: O(n²) confirmed

fBm (256×256, 4 octaves):
  - Time: TBD ms
  - Throughput: TBD cells/sec
  - Octave scaling: Linear (O(octaves))

Gradient Generation:
  - Time: TBD μs
  - Cache size: 512×512 float vectors

Single Sample:
  - Time: TBD ns/sample
```

### 4.4 Hydraulic Erosion

**Operations Benchmarked:**
- Single iteration (1,000 droplets)
- Varying droplet counts (1K, 5K, 10K, 50K)
- Gradient calculation
- Single particle simulation
- Full production scenario (50,000 droplets)
- Memory allocation overhead

**Baseline Results:**
```
Single Iteration (256×256, 1000 droplets):
  - Time: TBD ms
  - Throughput: TBD droplets/sec

Droplet Scaling:
  - 1,000 droplets: TBD ms
  - 5,000 droplets: TBD ms
  - 10,000 droplets: TBD ms
  - 50,000 droplets: TBD ms
  - Complexity: Linear O(droplets)

Gradient Calculation:
  - Time: TBD ns/calculation
  - Percentage of total time: TBD%

Full Simulation (50,000 droplets):
  - Time: TBD seconds
  - FPS equivalent: TBD fps (if streaming)
  - Droplets/second: TBD

Memory Allocation (256×256):
  - Time: TBD μs
  - Heap size: TBD KB
```

---

## 5. Frontend Rendering Performance

### 5.1 Three.js/React Three Fiber

**Measured in Browser:**
- Open DevTools → Performance tab
- Start recording
- Generate terrain + run erosion
- Stop recording after 30 seconds

**Baseline Metrics:**
```
Rendering FPS (256×256 terrain):
  - Min: TBD fps
  - Avg: TBD fps
  - Max: TBD fps (vsync cap: 60 fps)

Frame Timing:
  - Frame time (avg): TBD ms
  - Frame time (p95): TBD ms
  - Long frames (>16ms): TBD%

GPU Utilization:
  - Average: TBD%
  - Peak: TBD%

Memory Usage:
  - Heap size: TBD MB
  - Texture memory: TBD MB
  - Geometry memory: TBD MB
```

**Test Procedure:**
1. Navigate to https://terrainsim.lmvcruz.work
2. Generate terrain (seed: 12345, 4 octaves)
3. Start erosion (10,000 droplets)
4. Monitor FPS counter in UI
5. Record lowest sustained FPS

**Expected Performance:**
- ✅ Sustained 30+ FPS during erosion
- ✅ Sustained 60 FPS when idle
- ⚠️ Performance depends on GPU (tested on [TBD GPU])

---

## 6. System Resource Usage

### 6.1 AWS EC2 t3.micro Limits

**Instance Specifications:**
- vCPU: 1 core (Intel Xeon, variable frequency)
- RAM: 1 GB
- Network: Up to 5 Gigabit
- Baseline CPU credits: 10% continuous

**Observed Usage (To be measured):**
```
Idle State:
  - CPU: TBD%
  - Memory: TBD MB (Node.js baseline)
  - Network: TBD KB/sec

Under Load (5 concurrent simulations):
  - CPU: TBD%
  - Memory: TBD MB
  - Memory peak: TBD MB
  - Network: TBD KB/sec
  - CPU credit balance: TBD (decreasing/stable)

Peak Load (10 concurrent simulations):
  - CPU: TBD% (throttling: yes/no)
  - Memory: TBD MB (swapping: yes/no)
  - OOM kills: TBD occurrences
  - Network saturation: TBD%
```

**Capacity Analysis:**
- **Recommended max concurrent users:** TBD
- **Recommended max concurrent simulations:** TBD
- **CPU bottleneck threshold:** TBD concurrent operations
- **Memory bottleneck threshold:** TBD MB allocated

---

## 7. Network Performance

### 7.1 Latency Breakdown

**Cloudflare CDN (Frontend):**
```
DNS Resolution: TBD ms
TLS Handshake: TBD ms
TTFB (Time to First Byte): TBD ms
Content Download: TBD ms
```

**AWS EC2 Direct (Backend API):**
```
DNS Resolution: TBD ms
TLS Handshake: TBD ms
TTFB: TBD ms
API Response: TBD ms
```

**WebSocket Connection:**
```
Connection establishment: TBD ms
Upgrade handshake: TBD ms
First message: TBD ms
Ping/pong latency: TBD ms
```

### 7.2 Bandwidth Usage

```
API Request Size:
  - /health: TBD bytes
  - /generate request: TBD bytes
  - /generate response: TBD KB (256×256 Float32Array)

WebSocket Frame Size:
  - terrain-frame event: TBD KB
  - Frames per simulation: TBD frames
  - Total data per simulation: TBD MB

Compression:
  - gzip enabled: Yes (nginx)
  - Compression ratio: TBD% reduction
```

---

## 8. Bottleneck Analysis

### 8.1 Current Bottlenecks (Prioritized)

**To be determined after TEST-017 execution:**

1. **[Primary Bottleneck]:** TBD
   - **Evidence:** TBD
   - **Impact:** TBD
   - **Mitigation:** TBD

2. **[Secondary Bottleneck]:** TBD
   - **Evidence:** TBD
   - **Impact:** TBD
   - **Mitigation:** TBD

3. **[Tertiary Bottleneck]:** TBD
   - **Evidence:** TBD
   - **Impact:** TBD
   - **Mitigation:** TBD

### 8.2 Optimization Priorities

**Based on bottleneck analysis, prioritize:**

1. **Short-term (Current iteration):**
   - [TBD] - Expected improvement: TBD%
   - [TBD] - Expected improvement: TBD%

2. **Medium-term (Iteration 5):**
   - [TBD] - Expected improvement: TBD%
   - [TBD] - Expected improvement: TBD%

3. **Long-term (Iteration 6+):**
   - [TBD] - Expected improvement: TBD%
   - [TBD] - Expected improvement: TBD%

---

## 9. Comparison with Targets

### 9.1 Success Criteria (from Iteration 3)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Terrain generation FPS | 30+ fps | TBD fps | TBD |
| 256×256 grid performance | 30+ fps | TBD fps | TBD |
| WebSocket frame delivery | 25+ fps | TBD fps | TBD |
| Concurrent simulations | 3-5 | TBD | TBD |
| API response time (p95) | < 2s | TBD ms | TBD |
| Error rate | < 5% | TBD% | TBD |

### 9.2 Iteration 5 Goals

**From Iteration 5 Success Criteria:**
- ✅ 1024×1024 grid at 15+ FPS: TBD
- ✅ Linear scaling with thread count: TBD (planned for OpenMP implementation)
- ✅ No benchmark regressions: TBD (establish baseline first)

---

## 10. Test Execution Instructions

### 10.1 Load Testing (k6)

**Run all scenarios sequentially:**
```powershell
# 1. Health check baseline
k6 run tests/load/health-check.js > results/health-check.txt

# 2. Terrain generation
k6 run tests/load/terrain-generation.js > results/terrain-generation.txt

# 3. WebSocket simulation
k6 run tests/load/websocket-simulation.js > results/websocket-simulation.txt

# 4. Comprehensive scenario
k6 run tests/load/comprehensive-scenario.js > results/comprehensive.txt
```

**Generate HTML reports:**
```powershell
k6 run --out json=results/health-check.json tests/load/health-check.js
k6 report results/health-check.json --output results/health-check-report.html
```

### 10.2 C++ Benchmarks

**Build and run:**
```powershell
cd libs/core/build
cmake -DBUILD_BENCHMARKS=ON ..
cmake --build . --config Release
./Release/terrain_core_benchmarks.exe --benchmark_out=results/benchmarks.json --benchmark_out_format=json
```

**Run specific benchmark:**
```powershell
./Release/terrain_core_benchmarks.exe --benchmark_filter=BM_HydraulicErosionFullSimulation
```

### 10.3 Frontend Performance

**Manual testing:**
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Navigate to https://terrainsim.lmvcruz.work
5. Generate terrain + run erosion
6. Stop recording after 30s
7. Export as JSON
8. Save to `results/frontend-performance.json`

**Automated testing (Playwright):**
```powershell
pnpm --filter @terrain/web run test:e2e
# FPS data captured in test output
```

---

## 11. Monitoring Integration

### 11.1 UptimeRobot Alerts

**Current monitoring (from Block 2):**
- Health check: Every 5 minutes
- Alert threshold: 2 consecutive failures
- Email: lmvcruz@gmail.com

**Performance thresholds to add:**
- Response time > 2s (warning)
- Response time > 5s (critical)
- Error rate > 5% (warning)
- Error rate > 10% (critical)

### 11.2 PM2 Metrics

**View real-time metrics:**
```powershell
ssh terrainsim "pm2 monit"
```

**Log analysis:**
```powershell
ssh terrainsim "pm2 logs terrainsim-api --lines 1000 | grep 'duration\|latency\|error'"
```

### 11.3 Cloudflare Analytics

**Access:** https://dash.cloudflare.com/[account-id]/pages/view/terrainsim

**Key metrics:**
- Requests per day
- Bandwidth usage
- Cache hit ratio
- Geographic distribution
- 95th percentile response time

---

## 12. Next Steps

### 12.1 Immediate Actions

1. **Execute TEST-017:** Run all k6 load tests
2. **Execute CORE-021/022:** Run C++ benchmarks
3. **Populate Metrics:** Fill in all "TBD" values in this document
4. **Analyze Bottlenecks:** Identify primary performance constraints
5. **Update Optimization Roadmap:** Prioritize improvements based on data

### 12.2 Future Performance Work

**Iteration 5 (Performance Optimization & Parallel Execution):**
- OpenMP parallelization for multi-core scaling
- SIMD optimizations for math-heavy operations
- LOD system for high-resolution grids
- Memory pool optimization

**Iteration 6+ (Deferred from Block 4):**
- API response caching (PERF-001)
- CDN asset optimization (PERF-002)
- Advanced WebSocket performance profiling (PERF-003)

---

## 13. Appendix

### 13.1 Hardware Specifications

**Test Environment:**
- Server: AWS EC2 t3.micro
- Region: us-east-1
- OS: Ubuntu 22.04 LTS
- Kernel: [TBD]
- CPU: Intel Xeon (variable frequency, 1 vCPU)
- RAM: 1 GB
- Storage: 30 GB gp3 SSD

**Client Environment (for frontend testing):**
- CPU: [TBD]
- GPU: [TBD]
- RAM: [TBD]
- Browser: Chrome [TBD]
- Network: [TBD Mbps]

### 13.2 Software Versions

```
Backend:
  - Node.js: v20.19.6
  - PM2: v6.0.14
  - Socket.io: v4.8.3
  - C++ Standard: C++20
  - CMake: [TBD]
  - g++: [TBD]

Frontend:
  - React: [TBD]
  - Three.js: [TBD]
  - React Three Fiber: [TBD]
  - Vite: [TBD]

Tools:
  - k6: v1.5.0
  - Google Benchmark: v1.9.1
  - GoogleTest: [TBD]
```

### 13.3 Glossary

- **p50/p95/p99:** Percentiles - 50%/95%/99% of requests completed within this time
- **TTFB:** Time To First Byte - server response latency
- **FPS:** Frames Per Second - rendering/streaming rate
- **VU:** Virtual User - simulated concurrent user in k6
- **RPS:** Requests Per Second - throughput metric
- **OOM:** Out Of Memory - system killed process due to memory exhaustion

---

**Document Version:** 1.0
**Status:** Baseline established (metrics to be populated after TEST-017)
**Next Review:** After Iteration 5 performance optimizations
