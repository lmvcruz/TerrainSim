#include <benchmark/benchmark.h>
#include "../../include/PerlinNoise.hpp"
#include "../../include/Heightmap.hpp"
#include "../../include/TerrainGenerators.hpp"

using namespace terrain;

// Benchmark: Single Perlin noise octave generation
static void BM_PerlinNoiseSingleOctave(benchmark::State& state) {
    const int size = state.range(0);
    const int seed = 12345;
    const float frequency = 0.05f;
    const float amplitude = 1.0f;

    for (auto _ : state) {
        Heightmap hm = generatePerlinNoise(size, size, seed, frequency, amplitude);
        benchmark::DoNotOptimize(hm);
    }

    state.SetItemsProcessed(state.iterations() * size * size);
    state.SetComplexityN(size * size);
}
BENCHMARK(BM_PerlinNoiseSingleOctave)->Arg(128)->Arg(256)->Arg(512)->Complexity();

// Benchmark: Fractional Brownian Motion (fBm) with multiple octaves
static void BM_PerlinNoiseFBm(benchmark::State& state) {
    const int size = state.range(0);
    const int seed = 12345;
    const float frequency = 0.05f;
    const float amplitude = 1.0f;
    const int octaves = 4;
    const float persistence = 0.5f;
    const float lacunarity = 2.0f;

    for (auto _ : state) {
        Heightmap hm = generateFBmNoise(size, size, seed, frequency, amplitude, octaves, persistence, lacunarity);
        benchmark::DoNotOptimize(hm);
    }

    state.SetItemsProcessed(state.iterations() * size * size * octaves);
    state.SetLabel("octaves=" + std::to_string(octaves));
}
BENCHMARK(BM_PerlinNoiseFBm)->Arg(256)->Arg(512);

// Benchmark: fBm with varying octave counts
static void BM_PerlinNoiseFBmOctaves(benchmark::State& state) {
    const int size = 256;
    const int seed = 12345;
    const float frequency = 0.05f;
    const float amplitude = 1.0f;
    const int octaves = state.range(0);
    const float persistence = 0.5f;
    const float lacunarity = 2.0f;

    for (auto _ : state) {
        Heightmap hm = generateFBmNoise(size, size, seed, frequency, amplitude, octaves, persistence, lacunarity);
        benchmark::DoNotOptimize(hm);
    }

    state.SetItemsProcessed(state.iterations() * size * size * octaves);
    state.SetComplexityN(octaves);
}
BENCHMARK(BM_PerlinNoiseFBmOctaves)
    ->Arg(1)->Arg(2)->Arg(4)->Arg(6)->Arg(8)
    ->Complexity();

// Benchmark: PerlinNoise class gradient generation
static void BM_PerlinNoiseGradientGeneration(benchmark::State& state) {
    const int seed = 12345;

    for (auto _ : state) {
        PerlinNoise pn(seed);
        benchmark::DoNotOptimize(pn);
    }

    state.SetItemsProcessed(state.iterations());
}
BENCHMARK(BM_PerlinNoiseGradientGeneration);

// Benchmark: PerlinNoise single sample
static void BM_PerlinNoiseSingleSample(benchmark::State& state) {
    PerlinNoise pn(12345);
    float x = 0.0f;
    float y = 0.0f;
    const float increment = 0.01f;

    for (auto _ : state) {
        float value = pn.noise(x, y);
        benchmark::DoNotOptimize(value);
        x += increment;
        y += increment;
    }

    state.SetItemsProcessed(state.iterations());
}
BENCHMARK(BM_PerlinNoiseSingleSample);

// Benchmark: Comparison - different grid sizes
static void BM_PerlinNoiseGridSizeComparison(benchmark::State& state) {
    const int size = state.range(0);
    const int seed = 12345;
    const float frequency = 0.05f;
    const float amplitude = 1.0f;
    const int octaves = 4;
    const float persistence = 0.5f;
    const float lacunarity = 2.0f;

    for (auto _ : state) {
        Heightmap hm = generateFBmNoise(size, size, seed, frequency, amplitude, octaves, persistence, lacunarity);
        benchmark::DoNotOptimize(hm);
    }

    const int64_t cells = size * size;
    state.SetItemsProcessed(state.iterations() * cells);
    state.counters["cells"] = benchmark::Counter(cells, benchmark::Counter::kDefIs, benchmark::Counter::kIs1024);
    state.counters["cells_per_sec"] = benchmark::Counter(state.iterations() * cells, benchmark::Counter::kIsRate);
}
BENCHMARK(BM_PerlinNoiseGridSizeComparison)->Arg(64)->Arg(128)->Arg(256)->Arg(512)->Arg(1024);
