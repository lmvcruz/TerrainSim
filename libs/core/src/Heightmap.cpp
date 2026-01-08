#include "Heightmap.hpp"
#include <algorithm>

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

} // namespace terrain
