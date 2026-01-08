#include "TerrainGenerators.hpp"
#include <cmath>

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

} // namespace generators
} // namespace terrain
