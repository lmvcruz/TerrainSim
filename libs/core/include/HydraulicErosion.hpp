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
    int erosionRadius = 3;           // Radius around particle affected by erosion/deposition
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
     *
     * Particles are spawned at random positions across the heightmap.
     */
    void erode(Heightmap& heightmap, int numParticles);

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

    HydraulicErosionParams m_params;
};

} // namespace terrain
