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

} // namespace generators
} // namespace terrain
