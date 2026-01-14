cmake_minimum_required(VERSION 3.14)
project(TerrainCore VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Options
option(BUILD_BENCHMARKS "Build benchmark tests" OFF)

# Define the library
add_library(terrain_core
    src/Heightmap.cpp
    src/TerrainGenerators.cpp
    src/PerlinNoise.cpp
    src/WaterParticle.cpp
    src/HydraulicErosion.cpp
    src/JobValidator.cpp
    src/JobExecutor.cpp
    src/ConfigParser.cpp
)
target_include_directories(terrain_core PUBLIC include)

# Add nlohmann/json dependency for ConfigParser
include(FetchContent)
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)
target_link_libraries(terrain_core PUBLIC nlohmann_json::nlohmann_json)

# Testing Setup
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/heads/main.zip
)
# For Windows compatibility
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

enable_testing()

add_executable(terrain_core_tests
    tests/TerrainTest.cpp
    tests/HeightmapTest.cpp
    tests/TerrainGeneratorsTest.cpp
    tests/PerlinNoiseTest.cpp
    tests/WaterParticleTest.cpp
    tests/HeightmapGradientTest.cpp
    tests/HydraulicErosionTest.cpp
    tests/JobValidatorTest.cpp
    tests/JobExecutorTest.cpp
    tests/ConfigParserTest.cpp
)
target_link_libraries(terrain_core_tests PRIVATE terrain_core gtest_main)

include(GoogleTest)
gtest_discover_tests(terrain_core_tests)

# Benchmark Setup (manual trigger only)
if(BUILD_BENCHMARKS)
    message(STATUS "Building benchmarks...")

    FetchContent_Declare(
        benchmark
        URL https://github.com/google/benchmark/archive/refs/tags/v1.9.1.zip
    )
    set(BENCHMARK_ENABLE_TESTING OFF CACHE BOOL "" FORCE)
    set(BENCHMARK_ENABLE_INSTALL OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(benchmark)

    add_executable(terrain_core_benchmarks
        tests/benchmarks/HeightmapBenchmark.cpp
        tests/benchmarks/PerlinNoiseBenchmark.cpp
        tests/benchmarks/HydraulicErosionBenchmark.cpp
    )
    target_link_libraries(terrain_core_benchmarks PRIVATE terrain_core benchmark::benchmark benchmark::benchmark_main)

    message(STATUS "Benchmarks configured. Run with: ./terrain_core_benchmarks")
endif()
