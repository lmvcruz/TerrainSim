#pragma once

#include <array>
#include <cstdint>

namespace terrain {

/**
 * @brief Perlin Noise generator with gradient-based noise generation.
 *
 * Implements the classic Perlin noise algorithm with a permutation table
 * for pseudorandom gradient generation. The algorithm generates smooth,
 * continuous noise that's useful for procedural terrain generation.
 *
 * Key features:
 * - Deterministic: Same seed produces the same noise pattern
 * - Smooth: C2 continuous (second derivative continuous)
 * - Non-periodic: No obvious repeating patterns
 * - Range: Output values are approximately in [-1, 1]
 */
class PerlinNoise {
public:
    /**
     * @brief Construct a PerlinNoise generator with a specific seed.
     * @param seed Random seed for reproducible noise generation
     */
    explicit PerlinNoise(uint32_t seed = 0);

    /**
     * @brief Generate 2D Perlin noise at the given coordinates.
     *
     * @param x X coordinate in noise space
     * @param y Y coordinate in noise space
     * @return Noise value approximately in range [-1, 1]
     */
    float noise(float x, float y) const;

    /**
     * @brief Get a pseudorandom gradient vector for a given grid coordinate.
     *
     * Uses the permutation table to generate a consistent gradient direction
     * for each grid point. The gradient is one of 8 cardinal/diagonal directions
     * to ensure good distribution and smooth interpolation.
     *
     * @param ix Integer X coordinate in the permutation grid
     * @param iy Integer Y coordinate in the permutation grid
     * @param dx Delta X from grid point (in range [0, 1])
     * @param dy Delta Y from grid point (in range [0, 1])
     * @return Dot product of gradient vector with (dx, dy)
     */
    float grad(int32_t ix, int32_t iy, float dx, float dy) const;

    /**
     * @brief Fade function for smooth interpolation (6t^5 - 15t^4 + 10t^3).
     *
     * This is Ken Perlin's improved fade function that has zero first and
     * second derivatives at t=0 and t=1, ensuring C2 continuity.
     *
     * @param t Input value in range [0, 1]
     * @return Smoothed value in range [0, 1]
     */
    static float fade(float t);

    /**
     * @brief Linear interpolation between two values.
     *
     * @param t Interpolation factor in range [0, 1]
     * @param a Start value (returned when t=0)
     * @param b End value (returned when t=1)
     * @return Interpolated value
     */
    static float lerp(float t, float a, float b);

private:
    /**
     * @brief Permutation table for pseudorandom gradient selection.
     *
     * A 256-element table that's used twice (total 512 elements) to avoid
     * modulo operations. The table is initialized with a shuffled sequence
     * of 0-255 based on the seed.
     */
    std::array<uint8_t, 512> p;

    /**
     * @brief Initialize the permutation table with a given seed.
     * @param seed Random seed for shuffling the permutation table
     */
    void initPermutation(uint32_t seed);

    /**
     * @brief Hash function to get a gradient index from grid coordinates.
     * @param ix Integer X coordinate
     * @param iy Integer Y coordinate
     * @return Hash value in range [0, 255]
     */
    uint8_t hash(int32_t ix, int32_t iy) const;
};

} // namespace terrain
