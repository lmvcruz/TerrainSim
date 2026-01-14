#include <benchmark/benchmark.h>
#include "../include/Heightmap.hpp"
#include <random>

// Benchmark: Heightmap creation
static void BM_HeightmapCreation(benchmark::State& state) {
    const int size = state.range(0);

    for (auto _ : state) {
        Heightmap hm(size, size);
        benchmark::DoNotOptimize(hm);
    }

    state.SetItemsProcessed(state.iterations());
    state.SetComplexityN(size * size);
}
BENCHMARK(BM_HeightmapCreation)->Arg(128)->Arg(256)->Arg(512)->Complexity();

// Benchmark: Heightmap random access
static void BM_HeightmapRandomAccess(benchmark::State& state) {
    const int size = state.range(0);
    Heightmap hm(size, size);

    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, size - 1);

    for (auto _ : state) {
        int x = dis(gen);
        int y = dis(gen);
        float value = hm.at(x, y);
        benchmark::DoNotOptimize(value);
    }

    state.SetItemsProcessed(state.iterations());
}
BENCHMARK(BM_HeightmapRandomAccess)->Arg(256)->Arg(512)->Arg(1024);

// Benchmark: Heightmap sequential write
static void BM_HeightmapSequentialWrite(benchmark::State& state) {
    const int size = state.range(0);

    for (auto _ : state) {
        Heightmap hm(size, size);
        for (int y = 0; y < size; ++y) {
            for (int x = 0; x < size; ++x) {
                hm.set(x, y, static_cast<float>(x + y) / (size * 2));
            }
        }
        benchmark::DoNotOptimize(hm);
    }

    state.SetItemsProcessed(state.iterations() * size * size);
    state.SetComplexityN(size * size);
}
BENCHMARK(BM_HeightmapSequentialWrite)->Arg(128)->Arg(256)->Arg(512)->Complexity();

// Benchmark: Heightmap copy operation
static void BM_HeightmapCopy(benchmark::State& state) {
    const int size = state.range(0);
    Heightmap source(size, size);

    // Fill with data
    for (int y = 0; y < size; ++y) {
        for (int x = 0; x < size; ++x) {
            source.set(x, y, static_cast<float>(x * y) / (size * size));
        }
    }

    for (auto _ : state) {
        Heightmap copy = source;
        benchmark::DoNotOptimize(copy);
    }

    state.SetBytesProcessed(state.iterations() * size * size * sizeof(float));
    state.SetComplexityN(size * size);
}
BENCHMARK(BM_HeightmapCopy)->Arg(256)->Arg(512)->Complexity();

// Benchmark: Heightmap neighbor access pattern (common in simulations)
static void BM_HeightmapNeighborAccess(benchmark::State& state) {
    const int size = state.range(0);
    Heightmap hm(size, size);

    // Fill with data
    for (int y = 0; y < size; ++y) {
        for (int x = 0; x < size; ++x) {
            hm.set(x, y, static_cast<float>(x + y));
        }
    }

    for (auto _ : state) {
        float sum = 0.0f;
        // Access all cells and their 4-neighbors
        for (int y = 1; y < size - 1; ++y) {
            for (int x = 1; x < size - 1; ++x) {
                sum += hm.at(x, y);
                sum += hm.at(x - 1, y);
                sum += hm.at(x + 1, y);
                sum += hm.at(x, y - 1);
                sum += hm.at(x, y + 1);
            }
        }
        benchmark::DoNotOptimize(sum);
    }

    state.SetItemsProcessed(state.iterations() * (size - 2) * (size - 2) * 5);
}
BENCHMARK(BM_HeightmapNeighborAccess)->Arg(256)->Arg(512);
