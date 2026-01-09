#pragma once

#include "Heightmap.hpp"

namespace terrain {
namespace generators {

/**
 * @brief Create a flat heightmap with all values set to a constant elevation.
 * @param width Number of columns (X-dimension)
 * @param height Number of rows (Y-dimension)
 * @param elevation Constant elevation value for all cells
 * @return A Heightmap object with uniform elevation
 */
Heightmap createFlat(size_t width, size_t height, float elevation = 0.0f);

/**
 * @brief Create a heightmap with a semi-sphere (hemisphere) shape.
 *
 * Creates a 3D hemisphere shape centered at the specified coordinates.
 * Points outside the radius are set to 0.0, while points inside form
 * a smooth hemispherical surface using the equation: z = sqrt(r² - d²)
 * where d is the distance from the center.
 *
 * @param width Number of columns (X-dimension)
 * @param height Number of rows (Y-dimension)
 * @param centerX X-coordinate of the hemisphere center
 * @param centerY Y-coordinate of the hemisphere center
 * @param radius Radius of the hemisphere in grid cells
 * @return A Heightmap object with a hemisphere shape
 */
Heightmap createSemiSphere(size_t width, size_t height, float centerX, float centerY, float radius);

/**
 * @brief Create a heightmap with a cone shape.
 *
 * Creates a 3D cone shape centered at the specified coordinates.
 * Points outside the radius are set to 0.0, while points inside form
 * a linear slope from the peak height at the center to 0 at the radius.
 *
 * @param width Number of columns (X-dimension)
 * @param height Number of rows (Y-dimension)
 * @param centerX X-coordinate of the cone center
 * @param centerY Y-coordinate of the cone center
 * @param radius Radius of the cone base in grid cells
 * @param peakHeight Height at the cone peak (center)
 * @return A Heightmap object with a cone shape
 */
Heightmap createCone(size_t width, size_t height, float centerX, float centerY, float radius, float peakHeight);

/**
 * @brief Generate a heightmap using Perlin noise.
 *
 * Creates a procedurally generated terrain using gradient-based Perlin noise.
 * The noise function generates smooth, continuous variations that are useful
 * for creating natural-looking terrain features.
 *
 * @param width Number of columns (X-dimension)
 * @param height Number of rows (Y-dimension)
 * @param seed Random seed for reproducible noise generation
 * @param frequency Controls the scale of terrain features (higher = more detail)
 * @param amplitude Controls the height variation (higher = more dramatic terrain)
 * @return A Heightmap object filled with Perlin noise values
 */
Heightmap generatePerlinNoise(size_t width, size_t height, uint32_t seed = 0,
                               float frequency = 0.05f, float amplitude = 1.0f);

/**
 * @brief Generate a heightmap using Fractional Brownian Motion (fBm).
 *
 * Creates terrain with multiple octaves of Perlin noise layered together.
 * Each octave has increasing frequency and decreasing amplitude, creating
 * natural-looking terrain with details at multiple scales.
 *
 * fBm formula: sum(amplitude * noise(frequency * position) for each octave)
 * - frequency *= lacunarity (typically 2.0)
 * - amplitude *= persistence (typically 0.5)
 *
 * @param width Number of columns (X-dimension)
 * @param height Number of rows (Y-dimension)
 * @param seed Random seed for reproducible noise generation
 * @param octaves Number of noise layers to combine (must be >= 1, typically 4-8)
 * @param frequency Base frequency for first octave (must be > 0)
 * @param amplitude Base amplitude for first octave (must be > 0)
 * @param persistence Amplitude multiplier per octave (must be > 0, typically 0.5)
 * @param lacunarity Frequency multiplier per octave (must be > 0, typically 2.0)
 * @return A Heightmap object filled with fBm noise values
 * @throws std::invalid_argument if parameters are out of valid range
 */
Heightmap generateFbm(size_t width, size_t height, uint32_t seed = 0,
                      int octaves = 4, float frequency = 0.05f, float amplitude = 1.0f,
                      float persistence = 0.5f, float lacunarity = 2.0f);

} // namespace generators
} // namespace terrain
