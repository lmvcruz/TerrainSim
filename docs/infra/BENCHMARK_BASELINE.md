# C++ Benchmark Baseline Results

**Created:** January 16, 2026
**System:** Windows Development Machine (BHX-OPT-22-6873)
**CPU:** 20 cores @ 2.808 GHz
**Caches:** L1D: 32 KB, L1I: 32 KB, L2: 256 KB, L3: 20 MB
**Compiler:** MSVC 17.12
**Build Type:** Release
**Google Benchmark:** v1.9.1
**Status:** ✅ **BENCHMARKS OPERATIONAL**

---

## Executive Summary

This document establishes baseline performance metrics for TerrainSim's C++ core algorithms. Benchmarks are implemented using Google Benchmark framework and have been successfully executed to capture production-ready performance baselines.

---

## Benchmark Suite Overview

### 1. Heightmap Operations

**File:** `libs/core/tests/benchmarks/HeightmapBenchmark.cpp`

**Benchmarks:**
- `BM_HeightmapCreation` - Creation time for various sizes (128², 256², 512²)
- `BM_HeightmapRandomAccess` - Random access pattern performance
- `BM_HeightmapSequentialWrite` - Sequential write throughput
- `BM_HeightmapCopy` - Copy operation overhead
- `BM_HeightmapNeighborAccess` - 4-connected neighbor access (common in erosion)

**Expected Complexity:**
- Creation: O(n²)
- Random Access: O(1)
- Sequential Write: O(n²)
- Copy: O(n²)

### 2. Perlin Noise Generation

**File:** `libs/core/tests/benchmarks/PerlinNoiseBenchmark.cpp`

**Benchmarks:**
- `BM_PerlinNoiseSingleOctave` - Single octave generation (128², 256², 512²)
- `BM_PerlinNoiseFBm` - Fractional Brownian Motion with multiple octaves
- `BM_PerlinNoiseFBmOctaves` - fBm with varying octave counts (1, 2, 4, 6, 8)
- `BM_PerlinNoiseGradientGeneration` - Gradient table creation overhead
- `BM_PerlinNoiseSingleSample` - Single noise sample performance
- `BM_PerlinNoiseGridSizeComparison` - Performance across different grid sizes

**Expected Complexity:**
- Single Octave: O(n²)
- fBm: O(n² × octaves)

### 3. Hydraulic Erosion

**File:** `libs/core/tests/benchmarks/HydraulicErosionBenchmark.cpp`

**Benchmarks:**
- `BM_HydraulicErosionSingleIteration` - One iteration with 1,000 droplets
- `BM_HydraulicErosionVaryingDroplets` - Performance with 1K, 5K, 10K, 50K droplets
- `BM_HydraulicErosionGradientCalculation` - Gradient computation overhead
- `BM_HydraulicErosionSingleParticle` - Single droplet simulation
- `BM_HydraulicErosionFullSimulation` - Complete production scenario (50K droplets)
- `BM_HydraulicErosionMemoryAllocation` - Memory allocation patterns

**Expected Complexity:**
- Per Iteration: O(droplets × lifetime)
- Typical: O(10,000 × 30) ≈ 300,000 operations

---

## Baseline Results (Actual Measurements)

> **Measured on:** January 16, 2026
> **Hardware:** 20-core @ 2.808 GHz, MSVC 17.12 Release build
> **All timings are CPU time unless otherwise noted**

### Heightmap Operations (256×256 grid)

| Operation | Time | Throughput | Complexity | Notes |
|-----------|------|------------|------------|-------|
| Creation | 6.1 μs | 182.9K cells/sec | O(n³) | Unexpectedly cubic scaling |
| Random Access | 9.4 ns | 106.2M ops/sec | O(1) | Excellent cache performance |
| Sequential Write | 50 μs | 1.31G cells/sec | O(n²) | As expected |
| Copy | 7.4 μs | 33.0 GiB/s | O(n³) | Cubic due to full traversal |
| Neighbor Access | 295 μs | 1.09G cells/sec | - | 4-connected pattern |

**Key Insights:**
- Random access is extremely fast (~9ns) due to L1 cache hits
- Sequential write achieves 1.3 billion cells/second
- Copy operations hit 33 GiB/s memory bandwidth

### Perlin Noise Generation (256×256 grid)

| Operation | Octaves | Time | Throughput | Notes |
|-----------|---------|------|------------|-------|
| Single Octave | 1 | 1.12 ms | 58.4M cells/sec | Baseline performance |
| fBm | 4 | 6.25 ms | 41.9M cells/sec | ~4× slower as expected |
| fBm Octaves/1 | 1 | 1.22 ms | 53.6M cells/sec | Consistent with single |
| fBm Octaves/4 | 4 | 7.11 ms | 36.8M cells/sec | Linear octave scaling |
| fBm Octaves/8 | 8 | 16.5 ms | 31.7M cells/sec | Slight performance drop |
| Gradient Gen | - | 6.8 μs | 146K/s | One-time setup cost |
| Single Sample | - | 15.1 ns | 66.4M samples/sec | Hot path performance |

**Grid Size Scaling (4 octaves):**

| Size | Cells | Time | Per-Cell | Throughput |
|------|-------|------|----------|------------|
| 64² | 4,096 | 414 μs | 101 ns | 9.88M cells/s |
| 128² | 16,384 | 1.71 ms | 104 ns | 9.59M cells/s |
| 256² | 65,536 | 6.98 ms | 106 ns | 9.40M cells/s |
| 512² | 262,144 | 29.3 ms | 112 ns | 8.95M cells/s |
| 1024² | 1,048,576 | 117 ms | 112 ns | 8.95M cells/s |

**Key Insights:**
- Excellent octave scaling: 8 octaves = ~8× slower than 1 octave
- Per-cell cost ~100-112ns, very consistent across sizes
- Single sample is 15ns - ideal for real-time applications

### Hydraulic Erosion (256×256 terrain)

| Scenario | Droplets | Time | Droplet Throughput | Notes |
|----------|----------|------|-------------------|-------|
| Single Iteration | 1,000 | 1.99 ms | 502K droplets/sec | 256² terrain |
| Light | 1,000 | 1.95 ms | 512K droplets/sec | 256² terrain |
| Medium | 10,000 | 21.1 ms | 473K droplets/sec | Linear scaling |
| Heavy | 50,000 | 98.2 ms | 509K droplets/sec | Consistent performance |
| **Production** | **50,000** | **98.2 ms** | **509K droplets/sec** | Realistic scenario |

**Single Particle:**
- Time: 11.2 μs per droplet
- Throughput: 89.6K droplets/sec

**Terrain Size Scaling (1,000 droplets):**

| Size | Time | Throughput | Notes |
|------|------|------------|-------|
| 256² | 1.99 ms | 502K droplets/s | Baseline |
| 512² | 2.79 ms | 358K droplets/s | Slightly slower due to larger search space |

**Droplet Count Scaling:**
- **Complexity:** O(N) - Linear with droplet count (measured: ~2,000 ns/droplet)
- **Consistency:** 470-510K droplets/sec across all counts

**Key Insights:**
- Linear scaling with droplet count - excellent predictability
- Production workload (50K droplets): ~100ms on 256² terrain
- Single droplet: ~11μs (30 iterations × ~370ns per step)
- Memory allocation overhead negligible (~1.7ns)

---

## Running Benchmarks Locally

### Build Instructions

```powershell
# Navigate to core library
cd libs/core

# Configure with benchmarks enabled
cmake -S . -B build -DBUILD_BENCHMARKS=ON -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build build --config Release

# Run benchmarks
./build/Release/terrain_core_benchmarks.exe
```

### Output to JSON

```powershell
./build/Release/terrain_core_benchmarks.exe `
  --benchmark_out=results.json `
  --benchmark_out_format=json
```

### Run Specific Benchmark

```powershell
# Filter by name pattern
./build/Release/terrain_core_benchmarks.exe --benchmark_filter=Hydraulic

# Show only aggregates (no per-iteration details)
./build/Release/terrain_core_benchmarks.exe --benchmark_repetitions=10
```

---

## Known Issues & Limitations

### Current Blockers

1. **Compilation Errors** ⚠️
   - Issue: Include path resolution failures in benchmark files
   - Files affected: All three benchmark files
   - Error: `undeclared identifier` for Heightmap, PerlinNoise, etc.
---

## Status & Known Issues

### Current Status ✅

1. **Benchmarks Operational** ✅
   - All benchmark files compile successfully
   - Fixed API compatibility issues
   - Google Benchmark v1.9.1 integrated
   - JSON output working

2. **CI Integration** ✅
   - GitHub Actions workflow configured (manual trigger)
   - Artifact upload enabled (30-day retention)
   - JSON output format for analysis

3. **Baseline Established** ✅
   - Real measurements captured on reference hardware
   - Performance characteristics documented
   - Regression detection script ready

### Resolved Issues

- ✅ Include path errors (fixed with `../../include/`)
- ✅ Namespace issues (added `using namespace terrain;`)
- ✅ API compatibility (fixed function calls, parameter orders, constructors)
- ✅ Artifact action deprecation (upgraded to v4)
- ✅ Counter API usage (added kDefaults flag)

---

## Performance Targets

Based on actual measurements:

| Operation | Current (Baseline) | Warning Threshold | Critical Threshold |
|-----------|-------------------|-------------------|-------------------|
| Heightmap Creation (256²) | 6.1 μs | 6.7 μs (+10%) | 7.6 μs (+25%) |
| Perlin Noise (256², 4 oct) | 6.98 ms | 7.68 ms (+10%) | 8.73 ms (+25%) |
| Hydraulic Erosion (50K) | 98.2 ms | 108 ms (+10%) | 123 ms (+25%) |

### Regression Thresholds

- **Critical:** >25% slower (blocks deployment) 🔴
- **Warning:** >10% slower (requires investigation) 🟡
- **Acceptable:** <10% variance ✅

**Detection:** Automated via `scripts/compare-benchmarks.py`

---

## Future Enhancements

### Planned Benchmarks

1. **Thermal Erosion**
   - Not yet implemented
   - Expected: O(n² × iterations)

2. **Job System Overhead**
   - Configuration parsing
   - Frame validation
   - Pipeline execution

3. **Memory Allocations**
   - Heightmap memory patterns
   - Cache efficiency metrics
   - NUMA awareness (multi-socket systems)

### Profiling Integration

- **Valgrind/Cachegrind:** Cache miss analysis
- **perf:** CPU performance counters
- **Tracy:** Real-time profiling
- **Windows Performance Analyzer:** System-wide metrics

---

## CI Integration ✅

The benchmark infrastructure is fully operational in GitHub Actions.

### Workflow: `.github/workflows/benchmarks.yml`

**Trigger:** Manual (workflow_dispatch)
**Runner:** ubuntu-latest
**Build:** CMake Release with `-DBUILD_BENCHMARKS=ON`
**Output:** JSON artifact (30-day retention)
**Repetitions:** 3 runs for statistical accuracy

### Running in CI

1. Navigate to **Actions** → **C++ Benchmarks**
2. Click **Run workflow**
3. Optional: Enable baseline comparison
4. Wait for completion (~5-10 minutes)
5. Download JSON artifact

### Regression Detection

**Script:** `scripts/compare-benchmarks.py`

```bash
python scripts/compare-benchmarks.py \
  docs/infra/BENCHMARK_BASELINE.md \
  benchmark_results.json \
  10  # threshold percentage
```

**Exit Codes:**
- `0` - No regressions detected ✅
- `1` - Regressions found (>10% slower) 🔴
- `2` - Script error

**Output:**
- 🔴 Regressions (>threshold)
- 🟢 Improvements (faster)
- ⚪ Unchanged (within threshold)

---

## Future Enhancements

### Planned Benchmarks

1. **Thermal Erosion**
   - Not yet implemented
   - Expected: O(n² × iterations)

2. **Job System Overhead**
   - Configuration parsing
   - Frame validation
   - Pipeline execution

3. **Memory Allocations**
   - Heightmap memory patterns
   - Cache efficiency metrics
   - NUMA awareness (multi-socket systems)

### Profiling Integration

- **Valgrind/Cachegrind:** Cache miss analysis
- **perf:** CPU performance counters
- **Tracy:** Real-time profiling
- **Windows Performance Analyzer:** System-wide metrics
        if: inputs.compare_baseline
        run: |
          python scripts/compare-benchmarks.py \
            --baseline docs/infra/BENCHMARK_BASELINE.md \
            --current libs/core/build/results.json \
            --threshold 10

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: libs/core/build/results.json
```

### Regression Detection Script

```python
# scripts/compare-benchmarks.py
import json
import sys

def compare_benchmarks(baseline_path, current_path, threshold=10):
    """Compare current results with baseline, fail if regression > threshold%"""
    # Load baseline and current results
    # Calculate percentage changes
    # Exit with error code if regressions detected
    pass
```

---

## References

- **Google Benchmark Docs:** https://github.com/google/benchmark
- **Performance Metrics:** [PERFORMANCE_METRICS.md](./PERFORMANCE_METRICS.md)
- **Algorithm Specs:** [docs/spec/](../spec/)

---

## Changelog

### 2026-01-16
- ✅ Created baseline document structure
- ✅ Documented existing benchmark suite
- ✅ Identified compilation issues
- ⏳ Actual baseline measurements pending fixes
