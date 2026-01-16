#include <benchmark/benchmark.h>
#include "../../include/HydraulicErosion.hpp"
#include "../../include/Heightmap.hpp"
#include "../../include/TerrainGenerators.hpp"

using namespace terrain;

// Benchmark: Single erosion iteration (1000 droplets)
static void BM_HydraulicErosionSingleIteration(benchmark::State& state) {
    const int size = state.range(0);

    // Generate terrain
    Heightmap hm = generators::generateFbm(size, size, 12345, 4, 0.05f, 1.0f, 0.5f, 2.0f);

    HydraulicErosionParams params;
    params.erosionRadius = 3;
    params.inertia = 0.3f;
    params.sedimentCapacityFactor = 3.0f;
    params.minSedimentCapacity = 0.01f;
    params.depositSpeed = 0.3f;
    params.erodeSpeed = 0.3f;
    params.evaporateSpeed = 0.01f;
    params.gravity = 4.0f;
    params.maxIterations = 30;

    HydraulicErosion erosion(params);
    const int droplets = 1000;

    for (auto _ : state) {
        Heightmap copy = hm; // Copy for each iteration
        erosion.erode(copy, droplets);
        benchmark::DoNotOptimize(copy);
    }

    state.SetItemsProcessed(state.iterations() * droplets);
    state.counters["droplets_per_sec"] = benchmark::Counter(
        state.iterations() * droplets,
        benchmark::Counter::kIsRate
    );
}
BENCHMARK(BM_HydraulicErosionSingleIteration)->Arg(256)->Arg(512);

// Benchmark: Erosion with varying droplet counts
static void BM_HydraulicErosionDropletCount(benchmark::State& state) {
    const int size = 256;
    const int dropletCount = state.range(0);

    Heightmap terrain = generators::generateFbm(size, size, 12345, 4, 0.05f, 1.0f, 0.5f, 2.0f);

    HydraulicErosionParams params;
    params.erosionRadius = 3;
    params.inertia = 0.3f;
    params.sedimentCapacityFactor = 3.0f;
    params.minSedimentCapacity = 0.01f;
    params.depositSpeed = 0.3f;
    params.erodeSpeed = 0.3f;
    params.evaporateSpeed = 0.01f;
    params.gravity = 4.0f;
    params.maxIterations = 30;

    HydraulicErosion erosion(params);

    for (auto _ : state) {
        Heightmap copy = terrain;
        erosion.erode(copy, dropletCount);
        benchmark::DoNotOptimize(copy);
    }

    state.SetItemsProcessed(state.iterations() * dropletCount);
    state.SetComplexityN(dropletCount);
}
BENCHMARK(BM_HydraulicErosionDropletCount)
    ->Arg(1000)->Arg(5000)->Arg(10000)->Arg(50000)
    ->Complexity();

// Benchmark: Single water particle simulation
static void BM_HydraulicErosionSingleParticle(benchmark::State& state) {
    const int size = 256;
    Heightmap terrain = generators::generateFbm(size, size, 12345, 4, 0.05f, 1.0f, 0.5f, 2.0f);

    HydraulicErosionParams params;
    params.erosionRadius = 3;
    params.inertia = 0.3f;
    params.sedimentCapacityFactor = 3.0f;
    params.minSedimentCapacity = 0.01f;
    params.depositSpeed = 0.3f;
    params.erodeSpeed = 0.3f;
    params.evaporateSpeed = 0.01f;
    params.gravity = 4.0f;
    params.maxIterations = 30;

    HydraulicErosion erosion(params);
    const int droplets = 1;

    for (auto _ : state) {
        Heightmap copy = terrain;
        erosion.erode(copy, droplets);
        benchmark::DoNotOptimize(copy);
    }

    state.SetItemsProcessed(state.iterations());
}
BENCHMARK(BM_HydraulicErosionSingleParticle);

// Benchmark: Full simulation (realistic scenario)
static void BM_HydraulicErosionFullSimulation(benchmark::State& state) {
    const int size = 256;

    // Generate initial terrain
    Heightmap terrain = generators::generateFbm(size, size, 12345, 4, 0.05f, 1.0f, 0.5f, 2.0f);

    // Realistic production parameters
    HydraulicErosionParams params;
    params.erosionRadius = 3;
    params.inertia = 0.3f;
    params.sedimentCapacityFactor = 3.0f;
    params.minSedimentCapacity = 0.01f;
    params.depositSpeed = 0.3f;
    params.erodeSpeed = 0.3f;
    params.evaporateSpeed = 0.01f;
    params.gravity = 4.0f;
    params.maxIterations = 30;

    HydraulicErosion erosion(params);
    const int droplets = 50000;

    for (auto _ : state) {
        Heightmap copy = terrain;
        erosion.erode(copy, droplets);
        benchmark::DoNotOptimize(copy);
    }

    const int64_t cells_processed = size * size * droplets;
    state.SetItemsProcessed(state.iterations() * droplets);
    state.counters["droplets_per_sec"] = benchmark::Counter(
        state.iterations() * droplets,
        benchmark::Counter::kIsRate
    );
    state.counters["total_cells"] = benchmark::Counter(cells_processed);
}
BENCHMARK(BM_HydraulicErosionFullSimulation)->Unit(benchmark::kMillisecond);

// Benchmark: Memory allocation overhead
static void BM_HydraulicErosionMemoryAllocation(benchmark::State& state) {
    const int size = state.range(0);

    HydraulicErosionParams params;
    params.erosionRadius = 3;

    for (auto _ : state) {
        HydraulicErosion erosion(params);
        benchmark::DoNotOptimize(erosion);
    }

    state.SetItemsProcessed(state.iterations());
}
BENCHMARK(BM_HydraulicErosionMemoryAllocation)->Arg(256)->Arg(512)->Arg(1024);
