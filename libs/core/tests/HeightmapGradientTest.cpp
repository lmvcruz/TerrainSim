#include <gtest/gtest.h>
#include "Heightmap.hpp"
#include <cmath>

using namespace terrain;

TEST(HeightmapGradientTest, GetHeightInterpolated_ExactGridPoints) {
    Heightmap hm(4, 4);

    // Set some test values
    hm.set(1, 1, 5.0f);
    hm.set(2, 1, 10.0f);
    hm.set(1, 2, 15.0f);
    hm.set(2, 2, 20.0f);

    // Test exact grid points
    EXPECT_FLOAT_EQ(hm.getHeightInterpolated(1.0f, 1.0f), 5.0f);
    EXPECT_FLOAT_EQ(hm.getHeightInterpolated(2.0f, 1.0f), 10.0f);
}

TEST(HeightmapGradientTest, GetHeightInterpolated_MidPoint) {
    Heightmap hm(4, 4);

    hm.set(1, 1, 0.0f);
    hm.set(2, 1, 10.0f);
    hm.set(1, 2, 0.0f);
    hm.set(2, 2, 10.0f);

    // Midpoint should be average
    EXPECT_FLOAT_EQ(hm.getHeightInterpolated(1.5f, 1.5f), 5.0f);
}

TEST(HeightmapGradientTest, GetHeightInterpolated_OutOfBounds) {
    Heightmap hm(4, 4);
    hm.fill(5.0f);

    // Out of bounds returns 0
    EXPECT_FLOAT_EQ(hm.getHeightInterpolated(-1.0f, 1.0f), 0.0f);
    EXPECT_FLOAT_EQ(hm.getHeightInterpolated(1.0f, -1.0f), 0.0f);
    EXPECT_FLOAT_EQ(hm.getHeightInterpolated(10.0f, 1.0f), 0.0f);
    EXPECT_FLOAT_EQ(hm.getHeightInterpolated(1.0f, 10.0f), 0.0f);
}

TEST(HeightmapGradientTest, GetGradient_FlatTerrain) {
    Heightmap hm(10, 10);
    hm.fill(5.0f);

    float gradX, gradY;
    bool result = hm.getGradient(5.0f, 5.0f, gradX, gradY);

    EXPECT_TRUE(result);
    EXPECT_FLOAT_EQ(gradX, 0.0f);
    EXPECT_FLOAT_EQ(gradY, 0.0f);
}

TEST(HeightmapGradientTest, GetGradient_SlopeInX) {
    Heightmap hm(10, 10);
    hm.fill(0.0f);

    // Create a slope in X direction
    for (size_t x = 0; x < 10; ++x) {
        for (size_t y = 0; y < 10; ++y) {
            hm.set(x, y, static_cast<float>(x) * 2.0f);
        }
    }

    float gradX, gradY;
    hm.getGradient(5.0f, 5.0f, gradX, gradY);

    // Gradient in X should be positive (slope increases with X)
    EXPECT_GT(gradX, 0.0f);
    EXPECT_FLOAT_EQ(gradY, 0.0f);
}

TEST(HeightmapGradientTest, GetGradient_SlopeInY) {
    Heightmap hm(10, 10);
    hm.fill(0.0f);

    // Create a slope in Y direction
    for (size_t x = 0; x < 10; ++x) {
        for (size_t y = 0; y < 10; ++y) {
            hm.set(x, y, static_cast<float>(y) * 3.0f);
        }
    }

    float gradX, gradY;
    hm.getGradient(5.0f, 5.0f, gradX, gradY);

    // Gradient in Y should be positive (slope increases with Y)
    EXPECT_FLOAT_EQ(gradX, 0.0f);
    EXPECT_GT(gradY, 0.0f);
}

TEST(HeightmapGradientTest, GetGradient_OutOfBounds) {
    Heightmap hm(10, 10);
    hm.fill(5.0f);

    float gradX, gradY;

    // Out of bounds should return false
    EXPECT_FALSE(hm.getGradient(-1.0f, 5.0f, gradX, gradY));
    EXPECT_FALSE(hm.getGradient(5.0f, -1.0f, gradX, gradY));
    EXPECT_FALSE(hm.getGradient(15.0f, 5.0f, gradX, gradY));
    EXPECT_FALSE(hm.getGradient(5.0f, 15.0f, gradX, gradY));
}

TEST(HeightmapGradientTest, GetNormal_FlatTerrain) {
    Heightmap hm(10, 10);
    hm.fill(5.0f);

    float nx, ny, nz;
    bool result = hm.getNormal(5, 5, nx, ny, nz);

    EXPECT_TRUE(result);
    // Flat terrain should have upward normal (0, 0, 1)
    EXPECT_NEAR(nx, 0.0f, 0.001f);
    EXPECT_NEAR(ny, 0.0f, 0.001f);
    EXPECT_NEAR(nz, 1.0f, 0.001f);
}

TEST(HeightmapGradientTest, GetNormal_Normalized) {
    Heightmap hm(10, 10);

    // Create varied terrain
    for (size_t x = 0; x < 10; ++x) {
        for (size_t y = 0; y < 10; ++y) {
            hm.set(x, y, static_cast<float>(x + y));
        }
    }

    float nx, ny, nz;
    hm.getNormal(5, 5, nx, ny, nz);

    // Normal should be unit length
    float length = std::sqrt(nx * nx + ny * ny + nz * nz);
    EXPECT_NEAR(length, 1.0f, 0.001f);
}

TEST(HeightmapGradientTest, GetNormal_OutOfBounds) {
    Heightmap hm(10, 10);
    hm.fill(5.0f);

    float nx, ny, nz;

    // Out of bounds should return false and default normal
    EXPECT_FALSE(hm.getNormal(15, 5, nx, ny, nz));
    EXPECT_FLOAT_EQ(nx, 0.0f);
    EXPECT_FLOAT_EQ(ny, 0.0f);
    EXPECT_FLOAT_EQ(nz, 1.0f);
}
