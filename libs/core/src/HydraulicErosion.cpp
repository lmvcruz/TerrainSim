#include "HydraulicErosion.hpp"
#include <cmath>
#include <random>
#include <algorithm>

namespace terrain {

HydraulicErosion::HydraulicErosion()
    : m_params()
{
}

HydraulicErosion::HydraulicErosion(const HydraulicErosionParams& params)
    : m_params(params)
{
}

float HydraulicErosion::calculateSedimentCapacity(float speed, float slope, float water) const {
    return std::max(slope * speed * water * m_params.sedimentCapacityFactor, m_params.minSedimentCapacity);
}

void HydraulicErosion::simulateParticle(Heightmap& heightmap, float startX, float startY) {
    WaterParticle particle(startX, startY);

    float dirX = 0.0f;
    float dirY = 0.0f;

    for (int iter = 0; iter < m_params.maxIterations && particle.isActive(); ++iter) {
        float posX = particle.x();
        float posY = particle.y();

        // Get integer grid position
        int gridX = static_cast<int>(posX);
        int gridY = static_cast<int>(posY);

        // Bounds check
        if (gridX < 0 || gridX >= static_cast<int>(heightmap.width()) - 1 ||
            gridY < 0 || gridY >= static_cast<int>(heightmap.height()) - 1) {
            break;  // Particle left the map
        }

        // Get current height and gradient
        float currentHeight = heightmap.getHeightInterpolated(posX, posY);
        float gradX, gradY;
        heightmap.getGradient(posX, posY, gradX, gradY);

        // Calculate new direction using gradient (steepest descent)
        // Negative gradient points downhill
        float newDirX = -gradX;
        float newDirY = -gradY;

        // Mix with previous direction (inertia)
        dirX = dirX * m_params.inertia - newDirX * (1.0f - m_params.inertia);
        dirY = dirY * m_params.inertia - newDirY * (1.0f - m_params.inertia);

        // Normalize direction
        float dirLength = std::sqrt(dirX * dirX + dirY * dirY);
        if (dirLength > 0.0001f) {
            dirX /= dirLength;
            dirY /= dirLength;
        } else {
            // No gradient - particle stops
            break;
        }

        // Update position
        float newPosX = posX + dirX;
        float newPosY = posY + dirY;

        // Get new height
        float newHeight = heightmap.getHeightInterpolated(newPosX, newPosY);

        // Calculate height difference (positive = downhill)
        float heightDiff = currentHeight - newHeight;

        // Calculate speed using gravity and height difference
        float speed = std::sqrt(std::abs(heightDiff) * m_params.gravity);
        speed = std::min(speed, m_params.maxDropletSpeed);

        // Calculate sediment capacity
        float capacity = calculateSedimentCapacity(speed, std::abs(heightDiff), particle.water());

        // Erosion or deposition
        if (particle.sediment() > capacity || heightDiff < 0.0f) {
            // Deposition - droplet is oversaturated or moving uphill
            float amountToDeposit = (heightDiff < 0.0f) ?
                std::min(heightDiff, particle.sediment()) :  // Moving uphill - deposit more
                (particle.sediment() - capacity) * m_params.depositSpeed;

            amountToDeposit = std::max(0.0f, amountToDeposit);
            particle.addSediment(-amountToDeposit);

            // Deposit at current grid cell
            heightmap.set(static_cast<size_t>(gridX), static_cast<size_t>(gridY),
                         heightmap.at(static_cast<size_t>(gridX), static_cast<size_t>(gridY)) + amountToDeposit);
        } else {
            // Erosion - droplet can carry more sediment
            float amountToErode = std::min((capacity - particle.sediment()) * m_params.erodeSpeed, heightDiff);

            // Erode from current grid cell
            heightmap.set(static_cast<size_t>(gridX), static_cast<size_t>(gridY),
                         heightmap.at(static_cast<size_t>(gridX), static_cast<size_t>(gridY)) - amountToErode);

            particle.addSediment(amountToErode);
        }

        // Update particle position
        particle.setPosition(newPosX, newPosY);

        // Evaporate water
        float newWater = particle.water() * (1.0f - m_params.evaporateSpeed);
        particle.setWater(newWater);
    }
}

void HydraulicErosion::erode(Heightmap& heightmap, int numParticles) {
    // Random number generator for particle spawn positions
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<float> distX(0.0f, static_cast<float>(heightmap.width() - 2));
    std::uniform_real_distribution<float> distY(0.0f, static_cast<float>(heightmap.height() - 2));

    // Simulate each particle
    for (int i = 0; i < numParticles; ++i) {
        float startX = distX(gen);
        float startY = distY(gen);
        simulateParticle(heightmap, startX, startY);
    }
}

} // namespace terrain
