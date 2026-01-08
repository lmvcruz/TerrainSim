cmake_minimum_required(VERSION 3.14)
project(TerrainCore VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Define the library
add_library(terrain_core INTERFACE)
target_include_directories(terrain_core INTERFACE include)

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

add_executable(terrain_core_tests tests/TerrainTest.cpp)
target_link_libraries(terrain_core_tests PRIVATE terrain_core gtest_main)

include(GoogleTest)
gtest_discover_tests(terrain_core_tests)
