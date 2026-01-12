#pragma once

namespace terrain {

/**
 * @brief Represents a water droplet used in hydraulic erosion simulation.
 *
 * A water particle traverses the terrain, picking up and depositing sediment
 * based on its velocity, the terrain slope, and its carrying capacity.
 */
class WaterParticle {
public:
    /**
     * @brief Construct a water particle at the specified position.
     * @param x X-coordinate (column index in heightmap)
     * @param y Y-coordinate (row index in heightmap)
     */
    WaterParticle(float x, float y);

    /**
     * @brief Get the current X position of the particle.
     * @return X-coordinate
     */
    float x() const { return m_x; }

    /**
     * @brief Get the current Y position of the particle.
     * @return Y-coordinate
     */
    float y() const { return m_y; }

    /**
     * @brief Get the X component of velocity.
     * @return Velocity in X direction
     */
    float velocityX() const { return m_velocityX; }

    /**
     * @brief Get the Y component of velocity.
     * @return Velocity in Y direction
     */
    float velocityY() const { return m_velocityY; }

    /**
     * @brief Get the current sediment carried by the particle.
     * @return Amount of sediment
     */
    float sediment() const { return m_sediment; }

    /**
     * @brief Get the water volume of the particle.
     * @return Water volume
     */
    float water() const { return m_water; }

    /**
     * @brief Set the particle's position.
     * @param x New X-coordinate
     * @param y New Y-coordinate
     */
    void setPosition(float x, float y) {
        m_x = x;
        m_y = y;
    }

    /**
     * @brief Set the particle's velocity.
     * @param vx Velocity in X direction
     * @param vy Velocity in Y direction
     */
    void setVelocity(float vx, float vy) {
        m_velocityX = vx;
        m_velocityY = vy;
    }

    /**
     * @brief Add sediment to the particle.
     * @param amount Amount of sediment to add (can be negative for deposition)
     */
    void addSediment(float amount) {
        m_sediment += amount;
    }

    /**
     * @brief Set the sediment amount directly.
     * @param amount New sediment amount
     */
    void setSediment(float amount) {
        m_sediment = amount;
    }

    /**
     * @brief Set the water volume.
     * @param volume New water volume
     */
    void setWater(float volume) {
        m_water = volume;
    }

    /**
     * @brief Check if the particle is still active (has water).
     * @return True if water volume is above threshold
     */
    bool isActive() const {
        return m_water > 0.01f;
    }

private:
    float m_x;           // Current X position
    float m_y;           // Current Y position
    float m_velocityX;   // Velocity in X direction
    float m_velocityY;   // Velocity in Y direction
    float m_sediment;    // Amount of sediment currently carried
    float m_water;       // Water volume (decreases over lifetime)
};

} // namespace terrain
