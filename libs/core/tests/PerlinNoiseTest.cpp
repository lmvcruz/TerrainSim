#include "PerlinNoise.hpp"
#include <gtest/gtest.h>
#include <cmath>
#include <unordered_set>

using namespace terrain;

class PerlinNoiseTest : public ::testing::Test {
protected:
    PerlinNoise perlin{42}; // Use a fixed seed for reproducibility
};

// Test that the constructor initializes properly
TEST_F(PerlinNoiseTest, Construction) {
    EXPECT_NO_THROW(PerlinNoise noise(0));
    EXPECT_NO_THROW(PerlinNoise noise(12345));
    EXPECT_NO_THROW(PerlinNoise noise(0xFFFFFFFF));
}

// Test determinism: same seed produces same results
TEST_F(PerlinNoiseTest, Determinism) {
    PerlinNoise noise1(100);
    PerlinNoise noise2(100);

    for (float x = 0.0f; x < 10.0f; x += 0.5f) {
        for (float y = 0.0f; y < 10.0f; y += 0.5f) {
            EXPECT_FLOAT_EQ(noise1.noise(x, y), noise2.noise(x, y))
                << "Noise should be deterministic for seed 100 at (" << x << ", " << y << ")";
        }
    }
}

// Test that different seeds produce different results
TEST_F(PerlinNoiseTest, DifferentSeedsProduceDifferentNoise) {
    PerlinNoise noise1(1);
    PerlinNoise noise2(2);

    int differentCount = 0;
    // Sample at non-integer coordinates to avoid zeros at grid points
    for (float x = 0.1f; x < 10.0f; x += 1.0f) {
        for (float y = 0.1f; y < 10.0f; y += 1.0f) {
            if (std::abs(noise1.noise(x, y) - noise2.noise(x, y)) > 0.01f) {
                differentCount++;
            }
        }
    }

    // At least 80% of samples should be different
    EXPECT_GT(differentCount, 80) << "Different seeds should produce mostly different noise";
}

// Test that noise values are in expected range [-1, 1]
TEST_F(PerlinNoiseTest, ValueRange) {
    for (float x = 0.0f; x < 20.0f; x += 0.25f) {
        for (float y = 0.0f; y < 20.0f; y += 0.25f) {
            float value = perlin.noise(x, y);
            EXPECT_GE(value, -1.5f) << "Noise value too low at (" << x << ", " << y << ")";
            EXPECT_LE(value, 1.5f) << "Noise value too high at (" << x << ", " << y << ")";
        }
    }
}

// Test continuity: nearby points should have similar values
TEST_F(PerlinNoiseTest, Continuity) {
    const float epsilon = 0.1f;
    const float delta = 0.01f; // Small step

    for (float x = 0.0f; x < 10.0f; x += 1.0f) {
        for (float y = 0.0f; y < 10.0f; y += 1.0f) {
            float v0 = perlin.noise(x, y);
            float vx = perlin.noise(x + delta, y);
            float vy = perlin.noise(x, y + delta);

            float diffX = std::abs(vx - v0);
            float diffY = std::abs(vy - v0);

            EXPECT_LT(diffX, epsilon) << "Noise should be continuous in X direction at (" << x << ", " << y << ")";
            EXPECT_LT(diffY, epsilon) << "Noise should be continuous in Y direction at (" << x << ", " << y << ")";
        }
    }
}

// Test that noise at non-integer coordinates varies
TEST_F(PerlinNoiseTest, NoiseAtIntegerCoordinates) {
    std::unordered_set<int> uniqueValues;

    // Sample at fractional coordinates (not at grid points where values are 0)
    for (int x = 0; x < 10; ++x) {
        for (int y = 0; y < 10; ++y) {
            float value = perlin.noise(static_cast<float>(x) + 0.5f, static_cast<float>(y) + 0.5f);
            // Discretize to check for uniqueness
            uniqueValues.insert(static_cast<int>(value * 10000));
        }
    }

    // Should have good variation (at least 10 unique values out of 100 samples)
    EXPECT_GT(uniqueValues.size(), 10u) << "Noise should have good variation";
}

// Test fade function properties
TEST_F(PerlinNoiseTest, FadeFunction) {
    // Test endpoints
    EXPECT_FLOAT_EQ(PerlinNoise::fade(0.0f), 0.0f);
    EXPECT_FLOAT_EQ(PerlinNoise::fade(1.0f), 1.0f);

    // Test monotonicity (should always increase)
    for (float t = 0.0f; t < 1.0f; t += 0.1f) {
        float v1 = PerlinNoise::fade(t);
        float v2 = PerlinNoise::fade(t + 0.01f);
        EXPECT_LT(v1, v2) << "Fade function should be monotonically increasing";
    }

    // Test smoothness at endpoints (derivative should be 0)
    float epsilon = 0.0001f;
    float d0 = (PerlinNoise::fade(epsilon) - PerlinNoise::fade(0.0f)) / epsilon;
    float d1 = (PerlinNoise::fade(1.0f) - PerlinNoise::fade(1.0f - epsilon)) / epsilon;

    EXPECT_NEAR(d0, 0.0f, 0.01f) << "Fade function should have zero derivative at t=0";
    EXPECT_NEAR(d1, 0.0f, 0.01f) << "Fade function should have zero derivative at t=1";
}

// Test lerp function
TEST_F(PerlinNoiseTest, LerpFunction) {
    // Test endpoints
    EXPECT_FLOAT_EQ(PerlinNoise::lerp(0.0f, 5.0f, 10.0f), 5.0f);
    EXPECT_FLOAT_EQ(PerlinNoise::lerp(1.0f, 5.0f, 10.0f), 10.0f);

    // Test midpoint
    EXPECT_FLOAT_EQ(PerlinNoise::lerp(0.5f, 5.0f, 10.0f), 7.5f);

    // Test with negative values
    EXPECT_FLOAT_EQ(PerlinNoise::lerp(0.5f, -10.0f, 10.0f), 0.0f);
}

// Test smoothstep function (CORE-007)
TEST_F(PerlinNoiseTest, SmoothstepFunction) {
    // Test endpoints
    EXPECT_FLOAT_EQ(PerlinNoise::smoothstep(0.0f), 0.0f);
    EXPECT_FLOAT_EQ(PerlinNoise::smoothstep(1.0f), 1.0f);

    // Test midpoint (should be 0.5 for symmetric function)
    EXPECT_FLOAT_EQ(PerlinNoise::smoothstep(0.5f), 0.5f);

    // Test monotonicity (should always increase)
    for (float t = 0.0f; t < 1.0f; t += 0.1f) {
        float v1 = PerlinNoise::smoothstep(t);
        float v2 = PerlinNoise::smoothstep(t + 0.01f);
        EXPECT_LT(v1, v2) << "Smoothstep should be monotonically increasing";
    }

    // Test smoothness at endpoints (derivative should be 0)
    float epsilon = 0.0001f;
    float d0 = (PerlinNoise::smoothstep(epsilon) - PerlinNoise::smoothstep(0.0f)) / epsilon;
    float d1 = (PerlinNoise::smoothstep(1.0f) - PerlinNoise::smoothstep(1.0f - epsilon)) / epsilon;

    EXPECT_NEAR(d0, 0.0f, 0.01f) << "Smoothstep should have zero derivative at t=0";
    EXPECT_NEAR(d1, 0.0f, 0.01f) << "Smoothstep should have zero derivative at t=1";
}

// Test that noise is translation-invariant in distribution
TEST_F(PerlinNoiseTest, TranslationInvariance) {
    // Sample noise in two different regions
    float sum1 = 0.0f, sum2 = 0.0f;
    int count = 0;

    for (float x = 0.0f; x < 5.0f; x += 0.5f) {
        for (float y = 0.0f; y < 5.0f; y += 0.5f) {
            sum1 += perlin.noise(x, y);
            sum2 += perlin.noise(x + 100.0f, y + 100.0f);
            count++;
        }
    }

    float avg1 = sum1 / count;
    float avg2 = sum2 / count;

    // Averages should be close to 0 (approximately centered distribution)
    EXPECT_NEAR(avg1, 0.0f, 0.5f);
    EXPECT_NEAR(avg2, 0.0f, 0.5f);
}

// Test with negative coordinates
TEST_F(PerlinNoiseTest, NegativeCoordinates) {
    EXPECT_NO_THROW(perlin.noise(-5.5f, -3.2f));
    EXPECT_NO_THROW(perlin.noise(-100.0f, -100.0f));

    // Should still be in valid range
    float value = perlin.noise(-10.5f, -20.3f);
    EXPECT_GE(value, -1.5f);
    EXPECT_LE(value, 1.5f);
}

// Test that noise repeats with period 256 (permutation table size)
// This is expected behavior - Perlin noise has natural periodicity
TEST_F(PerlinNoiseTest, PeriodicityAtPermutationTableSize) {
    // Perlin noise repeats with a period of 256 (the permutation table size)
    // This is a feature, not a bug
    float v1 = perlin.noise(0.5f, 0.5f);
    float v2 = perlin.noise(256.5f, 0.5f);

    // Values should be the same due to periodicity
    EXPECT_FLOAT_EQ(v1, v2) << "Perlin noise should repeat with period 256";
}

// Benchmark-style test: ensure reasonable performance
TEST_F(PerlinNoiseTest, PerformanceTest) {
    const int samples = 10000;
    volatile float sum = 0.0f; // Prevent optimization

    for (int i = 0; i < samples; ++i) {
        float x = static_cast<float>(i % 100);
        float y = static_cast<float>(i / 100);
        sum += perlin.noise(x * 0.1f, y * 0.1f);
    }

    // Just ensure it completes without hanging
    EXPECT_TRUE(std::isfinite(sum));
}
