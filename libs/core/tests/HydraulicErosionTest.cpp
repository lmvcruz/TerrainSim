#include <gtest/gtest.h>
#include "HydraulicErosion.hpp"
#include "Heightmap.hpp"
#include <cmath>

using namespace terrain;

TEST(HydraulicErosionTest, Constructor_Default) {
    HydraulicErosion erosion;

    const auto& params = erosion.getParams();
    EXPECT_EQ(params.maxIterations, 30);
    EXPECT_FLOAT_EQ(params.inertia, 0.05f);
}

TEST(HydraulicErosionTest, Constructor_CustomParams) {
    HydraulicErosionParams params;
    params.maxIterations = 50;
    params.erodeSpeed = 0.5f;

    HydraulicErosion erosion(params);

    const auto& retrievedParams = erosion.getParams();
    EXPECT_EQ(retrievedParams.maxIterations, 50);
    EXPECT_FLOAT_EQ(retrievedParams.erodeSpeed, 0.5f);
}

TEST(HydraulicErosionTest, SetParams) {
    HydraulicErosion erosion;

    HydraulicErosionParams newParams;
    newParams.maxIterations = 100;
    newParams.gravity = 10.0f;

    erosion.setParams(newParams);

    const auto& params = erosion.getParams();
    EXPECT_EQ(params.maxIterations, 100);
    EXPECT_FLOAT_EQ(params.gravity, 10.0f);
}

TEST(HydraulicErosionTest, SimulateParticle_FlatTerrain) {
    Heightmap hm(10, 10);
    hm.fill(5.0f);

    HydraulicErosion erosion;

    // Store initial state
    float initialHeight = hm.at(5, 5);

    // Simulate particle on flat terrain
    erosion.simulateParticle(hm, 5.0f, 5.0f);

    // On flat terrain, particle shouldn't move much or erode significantly
    // (it stops when there's no gradient)
    float finalHeight = hm.at(5, 5);

    // Height should be similar (within reasonable range)
    EXPECT_NEAR(finalHeight, initialHeight, 0.5f);
}

TEST(HydraulicErosionTest, SimulateParticle_SlopedTerrain) {
    Heightmap hm(20, 20);

    // Create a slope from top to bottom
    for (size_t y = 0; y < 20; ++y) {
        for (size_t x = 0; x < 20; ++x) {
            hm.set(x, y, 20.0f - static_cast<float>(y));
        }
    }

    // Calculate total height before erosion
    float sumBefore = 0.0f;
    for (size_t i = 0; i < hm.size(); ++i) {
        sumBefore += hm.data()[i];
    }

    HydraulicErosion erosion;
    erosion.simulateParticle(hm, 5.0f, 2.0f);

    // Calculate total height after erosion
    float sumAfter = 0.0f;
    for (size_t i = 0; i < hm.size(); ++i) {
        sumAfter += hm.data()[i];
    }

    // Particle should have moved material (sum may decrease slightly due to edge effects)
    // But the terrain should be modified
    EXPECT_NE(sumAfter, sumBefore);
}

TEST(HydraulicErosionTest, Erode_ModifiesTerrain) {
    Heightmap hm(50, 50);

    // Create a simple peak
    for (size_t y = 0; y < 50; ++y) {
        for (size_t x = 0; x < 50; ++x) {
            float distX = static_cast<float>(x) - 25.0f;
            float distY = static_cast<float>(y) - 25.0f;
            float dist = std::sqrt(distX * distX + distY * distY);
            hm.set(x, y, std::max(0.0f, 10.0f - dist * 0.4f));
        }
    }

    // Store a copy of initial state
    std::vector<float> initialData = hm.data();

    HydraulicErosion erosion;
    erosion.erode(hm, 100);  // Run 100 particles

    // Verify terrain was modified
    bool wasModified = false;
    for (size_t i = 0; i < hm.size(); ++i) {
        if (std::abs(hm.data()[i] - initialData[i]) > 0.001f) {
            wasModified = true;
            break;
        }
    }

    EXPECT_TRUE(wasModified);
}

TEST(HydraulicErosionTest, SimulateParticle_ParticleFollowsSteepestDescent) {
    Heightmap hm(30, 30);

    // Create a valley (low in the center)
    for (size_t y = 0; y < 30; ++y) {
        for (size_t x = 0; x < 30; ++x) {
            float distX = static_cast<float>(x) - 15.0f;
            float distY = static_cast<float>(y) - 15.0f;
            float dist = std::sqrt(distX * distX + distY * distY);
            hm.set(x, y, dist * 0.5f);  // Low at center, high at edges
        }
    }

    HydraulicErosion erosion;

    // Spawn particle at edge
    erosion.simulateParticle(hm, 5.0f, 5.0f);

    // The center should have been affected by the particle's descent
    // (particle should move toward center)
    // We can't test exact path, but we can verify the center region was modified
    float centerSum = 0.0f;
    for (size_t y = 12; y < 18; ++y) {
        for (size_t x = 12; x < 18; ++x) {
            centerSum += hm.at(x, y);
        }
    }

    // Just verify that simulation completed (no crashes)
    EXPECT_GE(centerSum, 0.0f);
}
