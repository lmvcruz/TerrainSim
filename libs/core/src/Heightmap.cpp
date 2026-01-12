#include "Heightmap.hpp"
#include <algorithm>
#include <cmath>

namespace terrain {

Heightmap::Heightmap(size_t width, size_t height)
    : m_width(width)
    , m_height(height)
    , m_data(width * height, 0.0f)
{
}

void Heightmap::fill(float value) {
    std::fill(m_data.begin(), m_data.end(), value);
}

float Heightmap::getHeightInterpolated(float x, float y) const {
    // Bounds check
    if (x < 0.0f || y < 0.0f || x >= static_cast<float>(m_width - 1) || y >= static_cast<float>(m_height - 1)) {
        return 0.0f;
    }

    // Get the four surrounding grid points
    size_t x0 = static_cast<size_t>(std::floor(x));
    size_t y0 = static_cast<size_t>(std::floor(y));
    size_t x1 = x0 + 1;
    size_t y1 = y0 + 1;

    // Get fractional parts
    float fx = x - static_cast<float>(x0);
    float fy = y - static_cast<float>(y0);

    // Bilinear interpolation
    float h00 = at(x0, y0);
    float h10 = at(x1, y0);
    float h01 = at(x0, y1);
    float h11 = at(x1, y1);

    float h0 = h00 * (1.0f - fx) + h10 * fx;
    float h1 = h01 * (1.0f - fx) + h11 * fx;

    return h0 * (1.0f - fy) + h1 * fy;
}

bool Heightmap::getGradient(float x, float y, float& outGradX, float& outGradY) const {
    // Bounds check - need at least one cell margin
    if (x < 0.0f || y < 0.0f || x >= static_cast<float>(m_width - 1) || y >= static_cast<float>(m_height - 1)) {
        outGradX = 0.0f;
        outGradY = 0.0f;
        return false;
    }

    // Get integer grid position
    size_t ix = static_cast<size_t>(std::floor(x));
    size_t iy = static_cast<size_t>(std::floor(y));

    // Calculate gradient using central differences
    // For X direction: (height at x+1 - height at x-1) / 2
    // For Y direction: (height at y+1 - height at y-1) / 2

    float heightLeft = (ix > 0) ? at(ix - 1, iy) : at(ix, iy);
    float heightRight = (ix < m_width - 1) ? at(ix + 1, iy) : at(ix, iy);
    float heightUp = (iy > 0) ? at(ix, iy - 1) : at(ix, iy);
    float heightDown = (iy < m_height - 1) ? at(ix, iy + 1) : at(ix, iy);

    outGradX = (heightRight - heightLeft) * 0.5f;
    outGradY = (heightDown - heightUp) * 0.5f;

    return true;
}

bool Heightmap::getNormal(size_t x, size_t y, float& outNormalX, float& outNormalY, float& outNormalZ) const {
    // Bounds check
    if (x >= m_width || y >= m_height) {
        outNormalX = 0.0f;
        outNormalY = 0.0f;
        outNormalZ = 1.0f;
        return false;
    }

    // Calculate gradients
    float gradX, gradY;
    getGradient(static_cast<float>(x), static_cast<float>(y), gradX, gradY);

    // Tangent vectors in 3D space
    // T1 = (1, 0, gradX) - tangent along X direction
    // T2 = (0, 1, gradY) - tangent along Y direction

    // Normal = T1 × T2 = (-gradX, -gradY, 1)
    outNormalX = -gradX;
    outNormalY = -gradY;
    outNormalZ = 1.0f;

    // Normalize the normal vector
    float length = std::sqrt(outNormalX * outNormalX + outNormalY * outNormalY + outNormalZ * outNormalZ);
    if (length > 0.0001f) {
        outNormalX /= length;
        outNormalY /= length;
        outNormalZ /= length;
    }

    return true;
}

} // namespace terrain
