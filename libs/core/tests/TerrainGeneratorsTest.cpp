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

// Test: generatePerlinNoise produces valid dimensions
TEST(TerrainGeneratorsTest, GeneratePerlinNoiseDimensions) {
    const size_t width = 128;
    const size_t height = 64;

    Heightmap heightmap = generatePerlinNoise(width, height);

    EXPECT_EQ(heightmap.width(), width);
    EXPECT_EQ(heightmap.height(), height);
    EXPECT_EQ(heightmap.size(), width * height);
}

// Test: generatePerlinNoise is deterministic (same seed produces same result)
TEST(TerrainGeneratorsTest, GeneratePerlinNoiseDeterminism) {
    const size_t width = 100;
    const size_t height = 100;
    const uint32_t seed = 12345;
    const float frequency = 0.05f;
    const float amplitude = 10.0f;

    Heightmap heightmap1 = generatePerlinNoise(width, height, seed, frequency, amplitude);
    Heightmap heightmap2 = generatePerlinNoise(width, height, seed, frequency, amplitude);

    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            EXPECT_FLOAT_EQ(heightmap1.at(x, y), heightmap2.at(x, y))
                << "Noise should be deterministic at (" << x << ", " << y << ")";
        }
    }
}

// Test: generatePerlinNoise different seeds produce different results
TEST(TerrainGeneratorsTest, GeneratePerlinNoiseDifferentSeeds) {
    const size_t width = 50;
    const size_t height = 50;

    Heightmap heightmap1 = generatePerlinNoise(width, height, 100);
    Heightmap heightmap2 = generatePerlinNoise(width, height, 200);

    int differentCount = 0;
    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            if (std::abs(heightmap1.at(x, y) - heightmap2.at(x, y)) > 0.01f) {
                differentCount++;
            }
        }
    }

    // At least 90% of values should be different
    EXPECT_GT(differentCount, static_cast<int>(width * height * 0.9f))
        << "Different seeds should produce mostly different terrain";
}

// Test: generatePerlinNoise values are scaled by amplitude
TEST(TerrainGeneratorsTest, GeneratePerlinNoiseAmplitude) {
    const size_t width = 100;
    const size_t height = 100;
    const float amplitude = 50.0f;

    Heightmap heightmap = generatePerlinNoise(width, height, 42, 0.05f, amplitude);

    // Values should generally be within [-amplitude, amplitude]
    // (allowing some margin for edge cases)
    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            float value = heightmap.at(x, y);
            EXPECT_GE(value, -amplitude * 1.5f);
            EXPECT_LE(value, amplitude * 1.5f);
        }
    }
}

// Test: generatePerlinNoise frequency affects detail level
TEST(TerrainGeneratorsTest, GeneratePerlinNoiseFrequency) {
    const size_t width = 100;
    const size_t height = 100;
    const uint32_t seed = 42;

    // Low frequency = large features (less variation between neighbors)
    Heightmap lowFreq = generatePerlinNoise(width, height, seed, 0.01f, 1.0f);

    // High frequency = small features (more variation between neighbors)
    Heightmap highFreq = generatePerlinNoise(width, height, seed, 0.1f, 1.0f);

    // Measure variation: sum of absolute differences between neighbors
    float lowFreqVariation = 0.0f;
    float highFreqVariation = 0.0f;

    for (size_t y = 0; y < height - 1; ++y) {
        for (size_t x = 0; x < width - 1; ++x) {
            lowFreqVariation += std::abs(lowFreq.at(x+1, y) - lowFreq.at(x, y));
            lowFreqVariation += std::abs(lowFreq.at(x, y+1) - lowFreq.at(x, y));

            highFreqVariation += std::abs(highFreq.at(x+1, y) - highFreq.at(x, y));
            highFreqVariation += std::abs(highFreq.at(x, y+1) - highFreq.at(x, y));
        }
    }

    // Higher frequency should have more variation
    EXPECT_GT(highFreqVariation, lowFreqVariation)
        << "Higher frequency should produce more detailed terrain";
}

// Test: generatePerlinNoise produces continuous (smooth) output
TEST(TerrainGeneratorsTest, GeneratePerlinNoiseContinuity) {
    const size_t width = 100;
    const size_t height = 100;

    Heightmap heightmap = generatePerlinNoise(width, height, 42, 0.05f, 10.0f);

    // Check that neighboring values don't have extreme jumps
    const float maxJump = 2.0f; // Reasonable threshold for smoothness

    for (size_t y = 0; y < height - 1; ++y) {
        for (size_t x = 0; x < width - 1; ++x) {
            float current = heightmap.at(x, y);
            float right = heightmap.at(x + 1, y);
            float down = heightmap.at(x, y + 1);

            EXPECT_LT(std::abs(right - current), maxJump)
                << "Terrain should be continuous (no large jumps) at (" << x << ", " << y << ")";
            EXPECT_LT(std::abs(down - current), maxJump)
                << "Terrain should be continuous (no large jumps) at (" << x << ", " << y << ")";
        }
    }
}

// Test: generatePerlinNoise default parameters work
TEST(TerrainGeneratorsTest, GeneratePerlinNoiseDefaultParameters) {
    EXPECT_NO_THROW({
        Heightmap heightmap = generatePerlinNoise(64, 64);
        EXPECT_EQ(heightmap.width(), 64);
        EXPECT_EQ(heightmap.height(), 64);
    });
}

// CORE-009: Additional determinism tests across different parameter combinations
TEST(TerrainGeneratorsTest, NoiseDeterminismAcrossMultipleParameters) {
    const size_t width = 64;
    const size_t height = 64;

    // Test with various parameter combinations
    std::vector<std::tuple<uint32_t, float, float>> paramSets = {
        {42, 0.1f, 5.0f},
        {12345, 0.05f, 10.0f},
        {99999, 0.01f, 1.0f}
    };

    for (const auto& params : paramSets) {
        uint32_t seed = std::get<0>(params);
        float freq = std::get<1>(params);
        float amp = std::get<2>(params);

        Heightmap h1 = generatePerlinNoise(width, height, seed, freq, amp);
        Heightmap h2 = generatePerlinNoise(width, height, seed, freq, amp);

        for (size_t y = 0; y < height; ++y) {
            for (size_t x = 0; x < width; ++x) {
                EXPECT_FLOAT_EQ(h1.at(x, y), h2.at(x, y))
                    << "Determinism failed for seed=" << seed
                    << " at (" << x << ", " << y << ")";
            }
        }
    }
}

// CORE-009: Test determinism with extreme parameter values
TEST(TerrainGeneratorsTest, NoiseDeterminismWithExtremeParameters) {
    const size_t width = 32;
    const size_t height = 32;

    // Very low frequency (large features)
    Heightmap low1 = generatePerlinNoise(width, height, 100, 0.001f, 1.0f);
    Heightmap low2 = generatePerlinNoise(width, height, 100, 0.001f, 1.0f);

    // Very high frequency (small features)
    Heightmap high1 = generatePerlinNoise(width, height, 100, 1.0f, 1.0f);
    Heightmap high2 = generatePerlinNoise(width, height, 100, 1.0f, 1.0f);

    // Very large amplitude
    Heightmap amp1 = generatePerlinNoise(width, height, 100, 0.05f, 1000.0f);
    Heightmap amp2 = generatePerlinNoise(width, height, 100, 0.05f, 1000.0f);

    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            EXPECT_FLOAT_EQ(low1.at(x, y), low2.at(x, y));
            EXPECT_FLOAT_EQ(high1.at(x, y), high2.at(x, y));
            EXPECT_FLOAT_EQ(amp1.at(x, y), amp2.at(x, y));
        }
    }
}

// CORE-011: Test parameter validation for generatePerlinNoise
TEST(TerrainGeneratorsTest, PerlinNoiseParameterValidation) {
    // Invalid dimensions
    EXPECT_THROW(generatePerlinNoise(0, 100), std::invalid_argument);
    EXPECT_THROW(generatePerlinNoise(100, 0), std::invalid_argument);

    // Invalid frequency
    EXPECT_THROW(generatePerlinNoise(64, 64, 0, 0.0f, 1.0f), std::invalid_argument);
    EXPECT_THROW(generatePerlinNoise(64, 64, 0, -0.1f, 1.0f), std::invalid_argument);
    EXPECT_THROW(generatePerlinNoise(64, 64, 0, INFINITY, 1.0f), std::invalid_argument);
    EXPECT_THROW(generatePerlinNoise(64, 64, 0, NAN, 1.0f), std::invalid_argument);

    // Invalid amplitude (NaN/Inf)
    EXPECT_THROW(generatePerlinNoise(64, 64, 0, 0.05f, INFINITY), std::invalid_argument);
    EXPECT_THROW(generatePerlinNoise(64, 64, 0, 0.05f, NAN), std::invalid_argument);

    // Valid edge cases should work
    EXPECT_NO_THROW(generatePerlinNoise(1, 1, 0, 0.001f, 0.0f)); // Zero amplitude is ok
    EXPECT_NO_THROW(generatePerlinNoise(1, 1, 0, 0.001f, -10.0f)); // Negative amplitude is ok
}

// CORE-010: Test fBm basic functionality
TEST(TerrainGeneratorsTest, GenerateFbmDimensions) {
    const size_t width = 128;
    const size_t height = 64;

    Heightmap heightmap = generateFbm(width, height);

    EXPECT_EQ(heightmap.width(), width);
    EXPECT_EQ(heightmap.height(), height);
    EXPECT_EQ(heightmap.size(), width * height);
}

// CORE-010: Test fBm determinism
TEST(TerrainGeneratorsTest, GenerateFbmDeterminism) {
    const size_t width = 64;
    const size_t height = 64;
    const uint32_t seed = 42;
    const int octaves = 5;
    const float frequency = 0.05f;
    const float amplitude = 10.0f;

    Heightmap h1 = generateFbm(width, height, seed, octaves, frequency, amplitude);
    Heightmap h2 = generateFbm(width, height, seed, octaves, frequency, amplitude);

    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            EXPECT_FLOAT_EQ(h1.at(x, y), h2.at(x, y))
                << "fBm should be deterministic at (" << x << ", " << y << ")";
        }
    }
}

// CORE-010: Test that more octaves add detail
TEST(TerrainGeneratorsTest, GenerateFbmOctavesAddDetail) {
    const size_t width = 100;
    const size_t height = 100;
    const uint32_t seed = 42;

    // Generate with different octave counts
    Heightmap singleOctave = generateFbm(width, height, seed, 1);
    Heightmap multiOctave = generateFbm(width, height, seed, 6);

    // Measure local variation (sum of differences between neighbors)
    float singleVariation = 0.0f;
    float multiVariation = 0.0f;

    for (size_t y = 0; y < height - 1; ++y) {
        for (size_t x = 0; x < width - 1; ++x) {
            singleVariation += std::abs(singleOctave.at(x+1, y) - singleOctave.at(x, y));
            singleVariation += std::abs(singleOctave.at(x, y+1) - singleOctave.at(x, y));

            multiVariation += std::abs(multiOctave.at(x+1, y) - multiOctave.at(x, y));
            multiVariation += std::abs(multiOctave.at(x, y+1) - multiOctave.at(x, y));
        }
    }

    // More octaves should produce more detail (higher variation)
    EXPECT_GT(multiVariation, singleVariation)
        << "Multiple octaves should add more detail than single octave";
}

// CORE-010: Test persistence effect
TEST(TerrainGeneratorsTest, GenerateFbmPersistenceEffect) {
    const size_t width = 64;
    const size_t height = 64;
    const uint32_t seed = 42;

    // Low persistence = rapid amplitude decay (smoother)
    Heightmap lowPersist = generateFbm(width, height, seed, 4, 0.05f, 10.0f, 0.2f, 2.0f);

    // High persistence = slow amplitude decay (rougher)
    Heightmap highPersist = generateFbm(width, height, seed, 4, 0.05f, 10.0f, 0.8f, 2.0f);

    // Measure roughness
    float lowRoughness = 0.0f;
    float highRoughness = 0.0f;

    for (size_t y = 0; y < height - 1; ++y) {
        for (size_t x = 0; x < width - 1; ++x) {
            lowRoughness += std::abs(lowPersist.at(x+1, y) - lowPersist.at(x, y));
            highRoughness += std::abs(highPersist.at(x+1, y) - highPersist.at(x, y));
        }
    }

    // Higher persistence should produce rougher terrain
    EXPECT_GT(highRoughness, lowRoughness)
        << "Higher persistence should produce rougher terrain";
}

// CORE-010: Test lacunarity effect
TEST(TerrainGeneratorsTest, GenerateFbmLacunarityEffect) {
    const size_t width = 64;
    const size_t height = 64;
    const uint32_t seed = 42;

    // Different lacunarity values affect frequency scaling between octaves
    Heightmap lac2 = generateFbm(width, height, seed, 4, 0.02f, 10.0f, 0.5f, 2.0f);
    Heightmap lac3 = generateFbm(width, height, seed, 4, 0.02f, 10.0f, 0.5f, 3.0f);

    // Results should be different
    int differentCount = 0;
    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            if (std::abs(lac2.at(x, y) - lac3.at(x, y)) > 0.1f) {
                differentCount++;
            }
        }
    }

    // Most values should differ
    EXPECT_GT(differentCount, static_cast<int>(width * height * 0.8f))
        << "Different lacunarity should produce different terrain";
}

// CORE-011: Test fBm parameter validation
TEST(TerrainGeneratorsTest, FbmParameterValidation) {
    // Invalid dimensions
    EXPECT_THROW(generateFbm(0, 100), std::invalid_argument);
    EXPECT_THROW(generateFbm(100, 0), std::invalid_argument);

    // Invalid octaves
    EXPECT_THROW(generateFbm(64, 64, 0, 0), std::invalid_argument);
    EXPECT_THROW(generateFbm(64, 64, 0, -1), std::invalid_argument);
    EXPECT_THROW(generateFbm(64, 64, 0, 17), std::invalid_argument); // Max is 16

    // Invalid frequency
    EXPECT_THROW(generateFbm(64, 64, 0, 4, 0.0f), std::invalid_argument);
    EXPECT_THROW(generateFbm(64, 64, 0, 4, -0.1f), std::invalid_argument);
    EXPECT_THROW(generateFbm(64, 64, 0, 4, INFINITY), std::invalid_argument);

    // Invalid amplitude
    EXPECT_THROW(generateFbm(64, 64, 0, 4, 0.05f, 0.0f), std::invalid_argument);
    EXPECT_THROW(generateFbm(64, 64, 0, 4, 0.05f, -1.0f), std::invalid_argument);
    EXPECT_THROW(generateFbm(64, 64, 0, 4, 0.05f, NAN), std::invalid_argument);

    // Invalid persistence
    EXPECT_THROW(generateFbm(64, 64, 0, 4, 0.05f, 1.0f, 0.0f), std::invalid_argument);
    EXPECT_THROW(generateFbm(64, 64, 0, 4, 0.05f, 1.0f, -0.5f), std::invalid_argument);

    // Invalid lacunarity
    EXPECT_THROW(generateFbm(64, 64, 0, 4, 0.05f, 1.0f, 0.5f, 0.0f), std::invalid_argument);
    EXPECT_THROW(generateFbm(64, 64, 0, 4, 0.05f, 1.0f, 0.5f, -2.0f), std::invalid_argument);

    // Valid edge cases
    EXPECT_NO_THROW(generateFbm(1, 1, 0, 1, 0.001f, 0.001f, 0.001f, 0.001f));
    EXPECT_NO_THROW(generateFbm(64, 64, 0, 16, 1.0f, 100.0f, 0.99f, 10.0f)); // Max octaves
}

// CORE-010: Test fBm default parameters
TEST(TerrainGeneratorsTest, GenerateFbmDefaultParameters) {
    EXPECT_NO_THROW({
        Heightmap heightmap = generateFbm(64, 64);
        EXPECT_EQ(heightmap.width(), 64);
        EXPECT_EQ(heightmap.height(), 64);
    });
}
