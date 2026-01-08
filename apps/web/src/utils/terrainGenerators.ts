/**
 * Generate a semi-sphere (hemisphere) heightmap.
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
 * @returns Float32Array with elevation values
 */
export function generateSemiSphere(
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number
): Float32Array {
  const heightmap = new Float32Array(width * height)
  const radiusSquared = radius * radius

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX
      const dy = y - centerY
      const distanceSquared = dx * dx + dy * dy

      const index = y * width + x

      if (distanceSquared <= radiusSquared) {
        // Inside the sphere: z = sqrt(r² - d²)
        const elevation = Math.sqrt(radiusSquared - distanceSquared)
        heightmap[index] = elevation
      } else {
        // Outside the sphere: flat at 0
        heightmap[index] = 0.0
      }
    }
  }

  return heightmap
}

/**
 * Generate a cone-shaped heightmap.
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
 * @returns Float32Array with elevation values
 */
export function generateCone(
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  peakHeight: number
): Float32Array {
  const heightmap = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX
      const dy = y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      const index = y * width + x

      if (distance <= radius) {
        // Inside the cone: linear slope from peak to 0
        const elevation = peakHeight * (1.0 - distance / radius)
        heightmap[index] = elevation
      } else {
        // Outside the cone: flat at 0
        heightmap[index] = 0.0
      }
    }
  }

  return heightmap
}

/**
 * Generate a flat heightmap with uniform elevation.
 *
 * @param width Number of columns (X-dimension)
 * @param height Number of rows (Y-dimension)
 * @param elevation Constant elevation value for all cells
 * @returns Float32Array with elevation values
 */
export function generateFlat(
  width: number,
  height: number,
  elevation: number = 0.0
): Float32Array {
  const heightmap = new Float32Array(width * height)
  heightmap.fill(elevation)
  return heightmap
}
