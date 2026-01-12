#pragma once

#include <vector>
#include <cstddef>

namespace terrain {

/**
 * @brief Heightmap represents a 2D grid of elevation values stored in Row-Major Order.
 *
 * The heightmap uses a flattened 1D array for optimal cache locality during traversal.
 * All values are stored as 32-bit floating point numbers representing elevation.
 *
 * Coordinate system:
 * - Origin (0,0) is at the top-left corner
 * - X-axis increases to the right
 * - Y-axis increases downward
 *
 * Row-Major Order means: index = y * width + x
 */
class Heightmap {
public:
    /**
     * @brief Construct a heightmap with the specified dimensions.
     * @param width Number of columns (X-dimension)
     * @param height Number of rows (Y-dimension)
     */
    Heightmap(size_t width, size_t height);

    /**
     * @brief Get the width (number of columns) of the heightmap.
     * @return Width in grid cells
     */
    size_t width() const { return m_width; }

    /**
     * @brief Get the height (number of rows) of the heightmap.
     * @return Height in grid cells
     */
    size_t height() const { return m_height; }

    /**
     * @brief Get the total number of cells in the heightmap.
     * @return Total cell count (width × height)
     */
    size_t size() const { return m_data.size(); }

    /**
     * @brief Get the elevation value at the specified coordinates.
     * @param x Column index (0 to width-1)
     * @param y Row index (0 to height-1)
     * @return Elevation value at (x, y)
     * @note No bounds checking in release builds for performance
     */
    float at(size_t x, size_t y) const {
        return m_data[y * m_width + x];
    }

    /**
     * @brief Set the elevation value at the specified coordinates.
     * @param x Column index (0 to width-1)
     * @param y Row index (0 to height-1)
     * @param value New elevation value
     * @note No bounds checking in release builds for performance
     */
    void set(size_t x, size_t y, float value) {
        m_data[y * m_width + x] = value;
    }

    /**
     * @brief Get read-only access to the raw data array.
     * @return Const reference to the underlying data vector
     */
    const std::vector<float>& data() const { return m_data; }

    /**
     * @brief Get mutable access to the raw data array.
     * @return Reference to the underlying data vector
     */
    std::vector<float>& data() { return m_data; }

    /**
     * @brief Fill the entire heightmap with a constant value.
     * @param value The elevation value to set for all cells
     */
    void fill(float value);

    /**
     * @brief Calculate the gradient (slope) at a specific position using bilinear interpolation.
     * @param x X-coordinate (can be fractional for interpolation)
     * @param y Y-coordinate (can be fractional for interpolation)
     * @param outGradX Output: gradient in X direction
     * @param outGradY Output: gradient in Y direction
     * @return True if the position is within bounds, false otherwise
     *
     * Uses central differences for interior points and forward/backward differences at boundaries.
     */
    bool getGradient(float x, float y, float& outGradX, float& outGradY) const;

    /**
     * @brief Get the interpolated height at a fractional position.
     * @param x X-coordinate (can be fractional)
     * @param y Y-coordinate (can be fractional)
     * @return Interpolated height value
     *
     * Uses bilinear interpolation for fractional coordinates.
     * Returns 0.0 if position is out of bounds.
     */
    float getHeightInterpolated(float x, float y) const;

    /**
     * @brief Calculate the normal vector at a specific position.
     * @param x X-coordinate (integer grid position)
     * @param y Y-coordinate (integer grid position)
     * @param outNormalX Output: normal vector X component
     * @param outNormalY Output: normal vector Y component
     * @param outNormalZ Output: normal vector Z component
     * @return True if the position is within bounds, false otherwise
     *
     * The normal is computed using cross product of tangent vectors.
     */
    bool getNormal(size_t x, size_t y, float& outNormalX, float& outNormalY, float& outNormalZ) const;

private:
    size_t m_width;
    size_t m_height;
    std::vector<float> m_data;  // Row-Major Order: index = y * width + x
};

} // namespace terrain
