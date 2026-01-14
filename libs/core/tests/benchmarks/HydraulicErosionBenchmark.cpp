#include <benchmark/benchmark.h>
#include "../include/HydraulicErosion.hpp"
#include "../include/Heightmap.hpp"
#include "../include/TerrainGenerators.hpp"

// Benchmark: Single erosion iteration (1000 droplets)
static void BM_HydraulicErosionSingleIteration(benchmark::State& state) {
    const int size = state.range(0);

    // Generate terrain
    Heightmap terrain = generateFBmNoise(size, size, 12345, 0.05f, 1.0f, 4, 0.5f, 2.0f);

    // Erosion parameters
    ErosionParams params;
    params.droplets = 1000;
    params.erosionRadius = 3;
    params.inertia = 0.3f;
    params.sedimentCapacityFactor = 3.0f;
    params.minSedimentCapacity = 0.01f;
    params.depositSpeed = 0.3f;
    params.erodeSpeed = 0.3f;
    params.evaporateSpeed = 0.01f;
    params.gravity = 4.0f;
    params.maxDropletLifetime = 30;
    params.initialWaterVolume = 1.0f;
    params.initialSpeed = 1.0f;

    HydraulicErosion erosion(terrain.width(), terrain.height(), params);

    for (auto _ : state) {
        Heightmap copy = terrain; // Copy for each iteration
        erosion.erode(copy);
        benchmark::DoNotOptimize(copy);
    }

    state.SetItemsProcessed(state.iterations() * params.droplets);
    state.counters["droplets_per_sec"] = benchmark::Counter(
        state.iterations() * params.droplets,
        benchmark::Counter::kIsRate
    );
}
BENCHMARK(BM_HydraulicErosionSingleIteration)->Arg(256)->Arg(512);

// Benchmark: Erosion with varying droplet counts
static void BM_HydraulicErosionDropletCount(benchmark::State& state) {
    const int size = 256;
    const int dropletCount = state.range(0);

    Heightmap terrain = generateFBmNoise(size, size, 12345, 0.05f, 1.0f, 4, 0.5f, 2.0f);

    ErosionParams params;
    params.droplets = dropletCount;
    params.erosionRadius = 3;
    params.inertia = 0.3f;
    params.sedimentCapacityFactor = 3.0f;
    params.minSedimentCapacity = 0.01f;
    params.depositSpeed = 0.3f;
    params.erodeSpeed = 0.3f;
    params.evaporateSpeed = 0.01f;
    params.gravity = 4.0f;
    params.maxDropletLifetime = 30;
    params.initialWaterVolume = 1.0f;
    params.initialSpeed = 1.0f;

    HydraulicErosion erosion(size, size, params);

    for (auto _ : state) {
        Heightmap copy = terrain;
        erosion.erode(copy);
        benchmark::DoNotOptimize(copy);
    }

    state.SetItemsProcessed(state.iterations() * dropletCount);
    state.SetComplexityN(dropletCount);
}
BENCHMARK(BM_HydraulicErosionDropletCount)
    ->Arg(1000)->Arg(5000)->Arg(10000)->Arg(50000)
    ->Complexity();

// Benchmark: Gradient calculation (critical operation)
static void BM_HydraulicErosionGradientCalculation(benchmark::State& state) {
    const int size = 256;
    Heightmap terrain = generateFBmNoise(size, size, 12345, 0.05f, 1.0f, 4, 0.5f, 2.0f);

    ErosionParams params;
    params.erosionRadius = 3;
    HydraulicErosion erosion(size, size, params);

    int x = size / 2;
    int y = size / 2;

    for (auto _ : state) {
        auto [gradX, gradY] = erosion.calculateGradient(terrain, x, y);
        benchmark::DoNotOptimize(gradX);
        benchmark::DoNotOptimize(gradY);

        // Move to next cell
        x = (x + 1) % (size - 2) + 1;
        if (x == 1) y = (y + 1) % (size - 2) + 1;
    }

    state.SetItemsProcessed(state.iterations());
}
BENCHMARK(BM_HydraulicErosionGradientCalculation);

// Benchmark: Single water particle simulation
static void BM_HydraulicErosionSingleParticle(benchmark::State& state) {
    const int size = 256;
    Heightmap terrain = generateFBmNoise(size, size, 12345, 0.05f, 1.0f, 4, 0.5f, 2.0f);

    ErosionParams params;
    params.droplets = 1;
    params.erosionRadius = 3;
    params.inertia = 0.3f;
    params.sedimentCapacityFactor = 3.0f;
    params.minSedimentCapacity = 0.01f;
    params.depositSpeed = 0.3f;
    params.erodeSpeed = 0.3f;
    params.evaporateSpeed = 0.01f;
    params.gravity = 4.0f;
    params.maxDropletLifetime = 30;
    params.initialWaterVolume = 1.0f;
    params.initialSpeed = 1.0f;

    HydraulicErosion erosion(size, size, params);

    for (auto _ : state) {
        Heightmap copy = terrain;
        erosion.erode(copy);
        benchmark::DoNotOptimize(copy);
    }

    state.SetItemsProcessed(state.iterations());
}
BENCHMARK(BM_HydraulicErosionSingleParticle);

// Benchmark: Full simulation (realistic scenario)
static void BM_HydraulicErosionFullSimulation(benchmark::State& state) {
    const int size = 256;

    // Generate initial terrain
    Heightmap terrain = generateFBmNoise(size, size, 12345, 0.05f, 1.0f, 4, 0.5f, 2.0f);

    // Realistic production parameters
    ErosionParams params;
    params.droplets = 50000;
    params.erosionRadius = 3;
    params.inertia = 0.3f;
    params.sedimentCapacityFactor = 3.0f;
    params.minSedimentCapacity = 0.01f;
    params.depositSpeed = 0.3f;
    params.erodeSpeed = 0.3f;
    params.evaporateSpeed = 0.01f;
    params.gravity = 4.0f;
    params.maxDropletLifetime = 30;
    params.initialWaterVolume = 1.0f;
    params.initialSpeed = 1.0f;

    HydraulicErosion erosion(size, size, params);

    for (auto _ : state) {
        Heightmap copy = terrain;
        erosion.erode(copy);
        benchmark::DoNotOptimize(copy);
    }

    const int64_t cells_processed = size * size * params.droplets;
    state.SetItemsProcessed(state.iterations() * params.droplets);
    state.counters["droplets_per_sec"] = benchmark::Counter(
        state.iterations() * params.droplets,
        benchmark::Counter::kIsRate
    );
    state.counters["total_cells"] = benchmark::Counter(cells_processed);
}
BENCHMARK(BM_HydraulicErosionFullSimulation)->Unit(benchmark::kMillisecond);

// Benchmark: Memory allocation overhead
static void BM_HydraulicErosionMemoryAllocation(benchmark::State& state) {
    const int size = state.range(0);

    ErosionParams params;
    params.droplets = 10000;
    params.erosionRadius = 3;

    for (auto _ : state) {
        HydraulicErosion erosion(size, size, params);
        benchmark::DoNotOptimize(erosion);
    }

    state.SetItemsProcessed(state.iterations());
}
BENCHMARK(BM_HydraulicErosionMemoryAllocation)->Arg(256)->Arg(512)->Arg(1024);
