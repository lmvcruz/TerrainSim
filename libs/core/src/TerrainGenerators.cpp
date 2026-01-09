#include "TerrainGenerators.hpp"
#include "PerlinNoise.hpp"
#include <cmath>
#include <stdexcept>
#include <string>

namespace terrain {
namespace generators {

Heightmap createFlat(size_t width, size_t height, float elevation) {
    Heightmap heightmap(width, height);
    heightmap.fill(elevation);
    return heightmap;
}

Heightmap createSemiSphere(size_t width, size_t height, float centerX, float centerY, float radius) {
    Heightmap heightmap(width, height);

    const float radiusSquared = radius * radius;

    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            const float dx = static_cast<float>(x) - centerX;
            const float dy = static_cast<float>(y) - centerY;
            const float distanceSquared = dx * dx + dy * dy;

            if (distanceSquared <= radiusSquared) {
                // Inside the sphere: z = sqrt(r² - d²)
                const float elevation = std::sqrt(radiusSquared - distanceSquared);
                heightmap.set(x, y, elevation);
            } else {
                // Outside the sphere: flat at 0
                heightmap.set(x, y, 0.0f);
            }
        }
    }

    return heightmap;
}

Heightmap createCone(size_t width, size_t height, float centerX, float centerY, float radius, float peakHeight) {
    Heightmap heightmap(width, height);

    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            const float dx = static_cast<float>(x) - centerX;
            const float dy = static_cast<float>(y) - centerY;
            const float distance = std::sqrt(dx * dx + dy * dy);

            if (distance <= radius) {
                // Inside the cone: linear slope from peak to 0
                const float elevation = peakHeight * (1.0f - distance / radius);
                heightmap.set(x, y, elevation);
            } else {
                // Outside the cone: flat at 0
                heightmap.set(x, y, 0.0f);
            }
        }
    }

    return heightmap;
}

Heightmap generatePerlinNoise(size_t width, size_t height, uint32_t seed,
                               float frequency, float amplitude) {
    // CORE-011: Parameter validation
    if (width == 0 || height == 0) {
        throw std::invalid_argument("Width and height must be greater than 0");
    }
    if (frequency <= 0.0f) {
        throw std::invalid_argument("Frequency must be greater than 0");
    }
    if (!std::isfinite(frequency)) {
        throw std::invalid_argument("Frequency must be a finite number");
    }
    if (!std::isfinite(amplitude)) {
        throw std::invalid_argument("Amplitude must be a finite number");
    }

    Heightmap heightmap(width, height);
    PerlinNoise perlin(seed);

    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            // Scale coordinates by frequency to control feature size
            const float nx = static_cast<float>(x) * frequency;
            const float ny = static_cast<float>(y) * frequency;

            // Generate noise value and scale by amplitude
            const float noiseValue = perlin.noise(nx, ny);
            const float elevation = noiseValue * amplitude;

            heightmap.set(x, y, elevation);
        }
    }

    return heightmap;
}

Heightmap generateFbm(size_t width, size_t height, uint32_t seed,
                      int octaves, float frequency, float amplitude,
                      float persistence, float lacunarity) {
    // CORE-011: Parameter validation
    if (width == 0 || height == 0) {
        throw std::invalid_argument("Width and height must be greater than 0");
    }
    if (octaves < 1) {
        throw std::invalid_argument("Octaves must be at least 1");
    }
    if (octaves > 16) {
        throw std::invalid_argument("Octaves must not exceed 16 (performance limit)");
    }
    if (frequency <= 0.0f) {
        throw std::invalid_argument("Frequency must be greater than 0");
    }
    if (amplitude <= 0.0f) {
        throw std::invalid_argument("Amplitude must be greater than 0");
    }
    if (persistence <= 0.0f) {
        throw std::invalid_argument("Persistence must be greater than 0");
    }
    if (lacunarity <= 0.0f) {
        throw std::invalid_argument("Lacunarity must be greater than 0");
    }
    if (!std::isfinite(frequency) || !std::isfinite(amplitude) ||
        !std::isfinite(persistence) || !std::isfinite(lacunarity)) {
        throw std::invalid_argument("All parameters must be finite numbers");
    }

    Heightmap heightmap(width, height);
    PerlinNoise perlin(seed);

    // CORE-010: Fractional Brownian Motion implementation
    for (size_t y = 0; y < height; ++y) {
        for (size_t x = 0; x < width; ++x) {
            float totalValue = 0.0f;
            float currentAmplitude = amplitude;
            float currentFrequency = frequency;
            float maxValue = 0.0f; // For normalization

            // Layer multiple octaves of noise
            for (int octave = 0; octave < octaves; ++octave) {
                const float nx = static_cast<float>(x) * currentFrequency;
                const float ny = static_cast<float>(y) * currentFrequency;

                const float noiseValue = perlin.noise(nx, ny);
                totalValue += noiseValue * currentAmplitude;
                maxValue += currentAmplitude;

                // Update frequency and amplitude for next octave
                currentFrequency *= lacunarity;
                currentAmplitude *= persistence;
            }

            // Normalize to approximately [-amplitude, amplitude] range
            const float normalizedValue = totalValue / maxValue * amplitude;
            heightmap.set(x, y, normalizedValue);
        }
    }

    return heightmap;
}

} // namespace generators
} // namespace terrain
