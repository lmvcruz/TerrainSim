#include <gtest/gtest.h>
#include "TerrainGenerators.hpp"
#include <cmath>

using namespace terrain;
using namespace terrain::generators;

// Test: createFlat produces uniform elevation
TEST(TerrainGeneratorsTest, CreateFlatProducesUniformElevation) {
    const size_t width = 100;
    const size_t height = 100;
    const float elevation = 42.5f;

    Heightmap heightmap = createFlat(width, height, elevation);

    EXPECT_EQ(heightmap.width(), width);
    EXPECT_EQ(heightmap.height(), height);

    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            EXPECT_FLOAT_EQ(heightmap.at(x, y), elevation);
        }
    }
}

// Test: createFlat defaults to 0.0 elevation
TEST(TerrainGeneratorsTest, CreateFlatDefaultsToZero) {
    Heightmap heightmap = createFlat(50, 50);

    for (size_t y = 0; y < 50; ++y) {
        for (size_t x = 0; x < 50; ++x) {
            EXPECT_FLOAT_EQ(heightmap.at(x, y), 0.0f);
        }
    }
}

// Test: createSemiSphere center point has correct height
TEST(TerrainGeneratorsTest, CreateSemiSphereCenterPointHeight) {
    const size_t width = 256;
    const size_t height = 256;
    const float centerX = 128.0f;
    const float centerY = 128.0f;
    const float radius = 100.0f;

    Heightmap heightmap = createSemiSphere(width, height, centerX, centerY, radius);

    // At the center, distance = 0, so elevation = sqrt(r² - 0) = r
    EXPECT_FLOAT_EQ(heightmap.at(128, 128), radius);
}

// Test: createSemiSphere outside radius is zero
TEST(TerrainGeneratorsTest, CreateSemiSphereOutsideRadiusIsZero) {
    const size_t width = 256;
    const size_t height = 256;
    const float centerX = 128.0f;
    const float centerY = 128.0f;
    const float radius = 50.0f;

    Heightmap heightmap = createSemiSphere(width, height, centerX, centerY, radius);

    // Point far outside the radius
    EXPECT_FLOAT_EQ(heightmap.at(0, 0), 0.0f);
    EXPECT_FLOAT_EQ(heightmap.at(255, 255), 0.0f);
}

// Test: createSemiSphere at radius edge is zero
TEST(TerrainGeneratorsTest, CreateSemiSphereAtRadiusEdge) {
    const size_t width = 256;
    const size_t height = 256;
    const float centerX = 128.0f;
    const float centerY = 128.0f;
    const float radius = 50.0f;

    Heightmap heightmap = createSemiSphere(width, height, centerX, centerY, radius);

    // Point exactly at radius should be very close to zero
    // x = 178, y = 128 -> distance = 50
    const float valueAtEdge = heightmap.at(178, 128);
    EXPECT_NEAR(valueAtEdge, 0.0f, 0.01f);
}

// Test: createSemiSphere halfway to center
TEST(TerrainGeneratorsTest, CreateSemiSphereHalfwayPoint) {
    const size_t width = 256;
    const size_t height = 256;
    const float centerX = 128.0f;
    const float centerY = 128.0f;
    const float radius = 100.0f;

    Heightmap heightmap = createSemiSphere(width, height, centerX, centerY, radius);

    // Point at distance = 50 (halfway)
    // x = 178, y = 128 -> dx = 50, dy = 0, distance = 50
    // elevation = sqrt(100² - 50²) = sqrt(10000 - 2500) = sqrt(7500) ≈ 86.6
    const float expected = std::sqrt(radius * radius - 50.0f * 50.0f);
    const float actual = heightmap.at(178, 128);
    EXPECT_FLOAT_EQ(actual, expected);
}

// Test: createCone center point has peak height
TEST(TerrainGeneratorsTest, CreateConeCenterPointHeight) {
    const size_t width = 100;
    const size_t height = 100;
    const float centerX = 50.0f;
    const float centerY = 50.0f;
    const float radius = 40.0f;
    const float peakHeight = 100.0f;

    Heightmap heightmap = createCone(width, height, centerX, centerY, radius, peakHeight);

    // At the center, distance = 0, so elevation = peakHeight
    EXPECT_FLOAT_EQ(heightmap.at(50, 50), peakHeight);
}

// Test: createCone outside radius is zero
TEST(TerrainGeneratorsTest, CreateConeOutsideRadiusIsZero) {
    const size_t width = 100;
    const size_t height = 100;
    const float centerX = 50.0f;
    const float centerY = 50.0f;
    const float radius = 20.0f;
    const float peakHeight = 100.0f;

    Heightmap heightmap = createCone(width, height, centerX, centerY, radius, peakHeight);

    // Point far outside the radius
    EXPECT_FLOAT_EQ(heightmap.at(0, 0), 0.0f);
    EXPECT_FLOAT_EQ(heightmap.at(99, 99), 0.0f);
}

// Test: createCone at radius edge is zero
TEST(TerrainGeneratorsTest, CreateConeAtRadiusEdge) {
    const size_t width = 100;
    const size_t height = 100;
    const float centerX = 50.0f;
    const float centerY = 50.0f;
    const float radius = 30.0f;
    const float peakHeight = 100.0f;

    Heightmap heightmap = createCone(width, height, centerX, centerY, radius, peakHeight);

    // Point at distance = radius should be close to zero
    // x = 80, y = 50 -> distance = 30
    const float valueAtEdge = heightmap.at(80, 50);
    EXPECT_NEAR(valueAtEdge, 0.0f, 0.01f);
}

// Test: createCone linear slope
TEST(TerrainGeneratorsTest, CreateConeLinearSlope) {
    const size_t width = 100;
    const size_t height = 100;
    const float centerX = 50.0f;
    const float centerY = 50.0f;
    const float radius = 40.0f;
    const float peakHeight = 80.0f;

    Heightmap heightmap = createCone(width, height, centerX, centerY, radius, peakHeight);

    // Point at distance = 20 (halfway to radius)
    // x = 70, y = 50 -> dx = 20, dy = 0, distance = 20
    // elevation = 80 * (1 - 20/40) = 80 * 0.5 = 40
    const float distance = 20.0f;
    const float expected = peakHeight * (1.0f - distance / radius);
    const float actual = heightmap.at(70, 50);
    EXPECT_NEAR(actual, expected, 0.1f);
}

// Test: createSemiSphere dimensions match request
TEST(TerrainGeneratorsTest, CreateSemiSphereDimensions) {
    const size_t width = 150;
    const size_t height = 200;

    Heightmap heightmap = createSemiSphere(width, height, 75.0f, 100.0f, 50.0f);

    EXPECT_EQ(heightmap.width(), width);
    EXPECT_EQ(heightmap.height(), height);
    EXPECT_EQ(heightmap.size(), width * height);
}

// Test: createCone dimensions match request
TEST(TerrainGeneratorsTest, CreateConeDimensions) {
    const size_t width = 80;
    const size_t height = 120;

    Heightmap heightmap = createCone(width, height, 40.0f, 60.0f, 30.0f, 50.0f);

    EXPECT_EQ(heightmap.width(), width);
    EXPECT_EQ(heightmap.height(), height);
    EXPECT_EQ(heightmap.size(), width * height);
}
