#include "PerlinNoise.hpp"
#include <algorithm>
#include <random>
#include <numeric>
#include <cmath>

namespace terrain {

PerlinNoise::PerlinNoise(uint32_t seed) {
    initPermutation(seed);
}

void PerlinNoise::initPermutation(uint32_t seed) {
    // Initialize with values 0-255
    std::array<uint8_t, 256> permutation;
    std::iota(permutation.begin(), permutation.end(), 0);

    // Shuffle using the seed
    std::mt19937 rng(seed);
    std::shuffle(permutation.begin(), permutation.end(), rng);

    // Duplicate the permutation to avoid modulo operations
    for (size_t i = 0; i < 256; ++i) {
        p[i] = permutation[i];
        p[i + 256] = permutation[i];
    }
}

uint8_t PerlinNoise::hash(int32_t ix, int32_t iy) const {
    // Wrap coordinates to [0, 255] range and hash
    return p[p[(ix & 255)] + (iy & 255)];
}

float PerlinNoise::fade(float t) {
    // Improved fade function: 6t^5 - 15t^4 + 10t^3
    // This has zero first and second derivatives at t=0 and t=1
    return t * t * t * (t * (t * 6.0f - 15.0f) + 10.0f);
}

float PerlinNoise::lerp(float t, float a, float b) {
    return a + t * (b - a);
}

float PerlinNoise::smoothstep(float t) {
    // Smooth Hermite interpolation: 3t² - 2t³
    // This has zero first derivative at t=0 and t=1
    return t * t * (3.0f - 2.0f * t);
}

float PerlinNoise::grad(int32_t ix, int32_t iy, float dx, float dy) const {
    // Get a pseudorandom hash value for this grid point
    uint8_t h = hash(ix, iy) & 15; // Use lower 4 bits to select from 16 gradients

    // Use the hash to select a gradient vector from a predefined set
    // This implementation uses 8 gradients: 4 cardinal + 4 diagonal directions
    // Gradients are unit vectors pointing in different directions
    switch (h & 7) {
        case 0: return  dx + dy;   // ( 1,  1)
        case 1: return  dx - dy;   // ( 1, -1)
        case 2: return -dx + dy;   // (-1,  1)
        case 3: return -dx - dy;   // (-1, -1)
        case 4: return  dx;        // ( 1,  0)
        case 5: return -dx;        // (-1,  0)
        case 6: return  dy;        // ( 0,  1)
        case 7: return -dy;        // ( 0, -1)
        default: return 0.0f;      // Should never reach here
    }
}

float PerlinNoise::noise(float x, float y) const {
    // Find the integer grid cell containing the point
    int32_t ix0 = static_cast<int32_t>(std::floor(x));
    int32_t iy0 = static_cast<int32_t>(std::floor(y));
    int32_t ix1 = ix0 + 1;
    int32_t iy1 = iy0 + 1;

    // Calculate the fractional part (position within the cell)
    float fx = x - static_cast<float>(ix0);
    float fy = y - static_cast<float>(iy0);

    // Apply fade curves to the fractional parts
    float u = fade(fx);
    float v = fade(fy);

    // Calculate gradients at the four corners of the cell
    float g00 = grad(ix0, iy0, fx,     fy);
    float g10 = grad(ix1, iy0, fx - 1, fy);
    float g01 = grad(ix0, iy1, fx,     fy - 1);
    float g11 = grad(ix1, iy1, fx - 1, fy - 1);

    // Bilinear interpolation of the gradient values
    float x1 = lerp(u, g00, g10);
    float x2 = lerp(u, g01, g11);
    float result = lerp(v, x1, x2);

    return result;
}

} // namespace terrain
