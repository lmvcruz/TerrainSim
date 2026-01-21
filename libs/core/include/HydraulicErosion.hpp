#pragma once

#include "Heightmap.hpp"
#include "WaterParticle.hpp"
#include <vector>

namespace terrain {

/**
 * @brief Parameters for hydraulic erosion simulation.
 */
struct HydraulicErosionParams {
    int maxIterations = 30;          // Maximum particle lifetime in iterations
    float inertia = 0.05f;           // How much the particle retains its direction (0-1)
    float sedimentCapacityFactor = 4.0f;  // Multiplier for sediment capacity
    float minSedimentCapacity = 0.01f;    // Minimum sediment capacity
    float erodeSpeed = 0.3f;         // Rate at which sediment is picked up
    float depositSpeed = 0.3f;       // Rate at which sediment is deposited
    float evaporateSpeed = 0.01f;    // Rate at which water evaporates
    float gravity = 4.0f;            // Gravity acceleration
    float maxDropletSpeed = 10.0f;   // Maximum speed a droplet can reach
    int erosionRadius = 1;           // Radius around particle affected by erosion/deposition (1=natural valleys, 3+=smoothing)
};

/**
 * @brief Hydraulic erosion simulator using particle-based water simulation.
 *
 * Simulates water droplets flowing across terrain, eroding material from
 * high-slope areas and depositing it in low-slope areas.
 */
class HydraulicErosion {
public:
    /**
     * @brief Construct a hydraulic erosion simulator with default parameters.
     */
    HydraulicErosion();

    /**
     * @brief Construct a hydraulic erosion simulator with custom parameters.
     * @param params Erosion simulation parameters
     */
    explicit HydraulicErosion(const HydraulicErosionParams& params);

    /**
     * @brief Simulate a single water particle on the heightmap.
     * @param heightmap The terrain heightmap to erode (will be modified)
     * @param startX Starting X position (0 to width-1)
     * @param startY Starting Y position (0 to height-1)
     *
     * The particle will traverse the terrain following the steepest descent,
     * eroding and depositing sediment along its path.
     */
    void simulateParticle(Heightmap& heightmap, float startX, float startY);

    /**
     * @brief Run erosion simulation with multiple particles.
     * @param heightmap The terrain heightmap to erode (will be modified)
     * @param numParticles Number of water particles to simulate
     * @param absoluteMaxHeight Optional absolute max height from Frame 0 (prevents progressive frame compounding)
     *
     * Particles are spawned at random positions across the heightmap.
     */
    void erode(Heightmap& heightmap, int numParticles, float absoluteMaxHeight = std::numeric_limits<float>::max());

    /**
     * @brief Set the initial maximum height (for progressive frame fix).
     * @param maxHeight The absolute maximum height from the original terrain
     */
    void setInitialMaxHeight(float maxHeight) { m_initialMaxHeight = maxHeight; }

    /**
     * @brief Get the current erosion parameters.
     * @return Reference to the parameters struct
     */
    const HydraulicErosionParams& getParams() const { return m_params; }

    /**
     * @brief Set new erosion parameters.
     * @param params New parameters to use
     */
    void setParams(const HydraulicErosionParams& params) { m_params = params; }

private:
    /**
     * @brief Calculate the sediment capacity of a droplet.
     * @param speed Current speed of the droplet
     * @param slope Terrain slope at current position
     * @param water Water volume of the droplet
     * @return Maximum sediment the droplet can carry
     */
    float calculateSedimentCapacity(float speed, float slope, float water) const;

    /**
     * @brief Apply erosion or deposition across a radius around a point.
     * @param heightmap The terrain heightmap to modify
     * @param posX X position (can be fractional)
     * @param posY Y position (can be fractional)
     * @param amount Height change to apply (negative = erosion, positive = deposition)
     *
     * Distributes the height change across cells within erosionRadius using
     * a distance-weighted kernel for smooth, natural-looking results.
     */
    void applyHeightChange(Heightmap& heightmap, float posX, float posY, float amount);

    HydraulicErosionParams m_params;
    float m_initialMaxHeight;  // Track initial max elevation to prevent deposition creating spikes
    Heightmap m_initialHeightmap;  // Copy of Frame 0 terrain for checking original heights
    bool m_hasInitialHeightmap;  // Whether initial heightmap has been saved
};

} // namespace terrain
