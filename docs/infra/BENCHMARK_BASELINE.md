# C++ Benchmark Baseline Results

**Created:** January 16, 2026
**System:** Windows Development Machine
**Compiler:** MSVC 17.12
**Build Type:** Release
**Status:** ⚠️ **BENCHMARKS CURRENTLY DISABLED DUE TO COMPILATION ISSUES**

---

## Executive Summary

This document establishes baseline performance metrics for TerrainSim's C++ core algorithms. Benchmarks are implemented using Google Benchmark framework but currently have compilation issues that need to be resolved before establishing accurate baseline metrics.

**Current Status:**
- ✅ Google Benchmark framework integrated (v1.9.1)
- ✅ Benchmark tests written for all core algorithms
- ❌ Compilation issues with include paths (needs fixing)
- ⏳ Baseline metrics pending successful build

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

## Baseline Results (Placeholder)

> **Note:** These are estimated/expected values based on algorithm complexity analysis.
> Actual measurements pending resolution of compilation issues.

### Heightmap Operations (256×256 grid)

| Operation | Time | Throughput | Complexity |
|-----------|------|------------|------------|
| Creation | ~50 μs | 1.3M cells/sec | O(n²) |
| Random Access | ~5 ns | 200M ops/sec | O(1) |
| Sequential Write | ~40 μs | 1.6M cells/sec | O(n²) |
| Copy | ~45 μs | 1.4M cells/sec | O(n²) |
| Neighbor Access | ~150 μs | 435K cells/sec | O(n²) |

### Perlin Noise Generation (256×256 grid)

| Operation | Octaves | Time | Throughput |
|-----------|---------|------|------------|
| Single Octave | 1 | ~1.2 ms | 54K cells/sec |
| fBm | 4 | ~4.8 ms | 13.6K cells/sec |
| fBm | 8 | ~9.6 ms | 6.8K cells/sec |
| Gradient Gen | - | ~15 μs | - |
| Single Sample | - | ~30 ns | 33M samples/sec |

**Scaling:** Linear with octave count (O(octaves))

### Hydraulic Erosion (256×256 terrain)

| Scenario | Droplets | Iterations | Time | Throughput |
|----------|----------|------------|------|------------|
| Light | 1,000 | 1 | ~35 ms | 28K droplets/sec |
| Medium | 10,000 | 1 | ~350 ms | 28K droplets/sec |
| Production | 50,000 | 1 | ~1.75 sec | 28K droplets/sec |

**Performance Characteristics:**
- Linear scaling with droplet count
- Each droplet: ~30-40 height map accesses (lifetime ≈ 30 steps)
- Memory: ~1 KB per 1,000 droplets

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
   - Needs: CMakeLists.txt review or include path fixes

2. **No CI Integration** 📋
   - Benchmarks not run in GitHub Actions
   - No automated regression detection
   - Manual execution only

3. **No Baseline Data** 📊
   - Cannot establish real baseline until compilation fixed
   - Current values are estimates
   - Need real hardware measurements

### Technical Debt

- [ ] Fix include paths in benchmark files
- [ ] Add benchmarks to CI workflow (manual trigger)
- [ ] Create regression detection script
- [ ] Establish real baseline on reference hardware
- [ ] Add memory profiling benchmarks
- [ ] Add multi-threaded benchmarks (future)

---

## Performance Targets

Based on production requirements:

| Operation | Current Target | Stretch Goal | Notes |
|-----------|----------------|--------------|-------|
| Heightmap Creation (256²) | <100 μs | <50 μs | Memory allocation overhead |
| Perlin Noise (256², 4 oct) | <10 ms | <5 ms | GPU offload candidate |
| Hydraulic Erosion (50K) | <3 sec | <1.5 sec | Most expensive operation |

### Regression Thresholds

- **Critical:** >25% slower (blocks deployment)
- **Warning:** >10% slower (requires investigation)
- **Acceptable:** <10% variance

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

## CI Integration (Planned)

### GitHub Actions Workflow

```yaml
name: Benchmark Performance

on:
  workflow_dispatch:
    inputs:
      compare_baseline:
        description: 'Compare with baseline'
        required: false
        default: true

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Benchmarks
        run: |
          cd libs/core
          cmake -S . -B build -DBUILD_BENCHMARKS=ON -DCMAKE_BUILD_TYPE=Release
          cmake --build build --config Release

      - name: Run Benchmarks
        run: |
          cd libs/core/build
          ./terrain_core_benchmarks --benchmark_out=results.json

      - name: Check for Regressions
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
