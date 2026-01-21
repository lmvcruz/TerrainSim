#include "HydraulicErosion.hpp"
#include <cmath>
#include <random>
#include <algorithm>
#include <limits>

namespace terrain {

HydraulicErosion::HydraulicErosion()
    : m_params(), m_initialMaxHeight(std::numeric_limits<float>::max()), m_initialHeightmap(0, 0), m_hasInitialHeightmap(false)
{
}

HydraulicErosion::HydraulicErosion(const HydraulicErosionParams& params)
    : m_params(params), m_initialMaxHeight(std::numeric_limits<float>::max()), m_initialHeightmap(0, 0), m_hasInitialHeightmap(false)
{
}

float HydraulicErosion::calculateSedimentCapacity(float speed, float slope, float water) const {
    return std::max(slope * speed * water * m_params.sedimentCapacityFactor, m_params.minSedimentCapacity);
}

void HydraulicErosion::simulateParticle(Heightmap& heightmap, float startX, float startY) {
    float posX = startX;
    float posY = startY;
    float dirX = 0.0f;
    float dirY = 0.0f;
    float speed = 1.0f;  // Initial speed
    float water = 1.0f;  // Initial water volume
    float sediment = 0.0f;

    for (int lifetime = 0; lifetime < m_params.maxIterations; ++lifetime) {
        // Get integer grid position for current location
        int nodeX = static_cast<int>(posX);
        int nodeY = static_cast<int>(posY);

        // Calculate droplet's offset inside the cell (0,0) = at NW node, (1,1) = at SE node
        float cellOffsetX = posX - nodeX;
        float cellOffsetY = posY - nodeY;

        // Bounds check
        if (nodeX < 0 || nodeX >= static_cast<int>(heightmap.width()) - 1 ||
            nodeY < 0 || nodeY >= static_cast<int>(heightmap.height()) - 1) {
            break;  // Particle left the map
        }

        // Get current height and gradient
        float currentHeight = heightmap.getHeightInterpolated(posX, posY);
        float gradX, gradY;
        heightmap.getGradient(posX, posY, gradX, gradY);

        // Update droplet's direction (mix gradient with inertia)
        dirX = (dirX * m_params.inertia - gradX * (1.0f - m_params.inertia));
        dirY = (dirY * m_params.inertia - gradY * (1.0f - m_params.inertia));

        // Normalize direction
        float dirLength = std::sqrt(dirX * dirX + dirY * dirY);
        if (dirLength != 0.0f) {
            dirX /= dirLength;
            dirY /= dirLength;
        }

        // Store old position before moving
        float oldPosX = posX;
        float oldPosY = posY;

        // Update position
        posX += dirX;
        posY += dirY;

        // Stop if not moving or flowed over edge
        if ((dirX == 0.0f && dirY == 0.0f) || posX < 0 || posX >= heightmap.width() - 1 ||
            posY < 0 || posY >= heightmap.height() - 1) {
            break;
        }

        // Find new height and calculate delta
        float newHeight = heightmap.getHeightInterpolated(posX, posY);
        float deltaHeight = newHeight - currentHeight;

        // Calculate sediment capacity (higher when moving fast down a slope with lots of water)
        float sedimentCapacity = std::max(-deltaHeight * speed * water * m_params.sedimentCapacityFactor,
                                          m_params.minSedimentCapacity);

        // If carrying more sediment than capacity, or if flowing uphill:
        if (sediment > sedimentCapacity || deltaHeight > 0.0f) {
            // Moving uphill (deltaHeight > 0) - try fill up to current height
            // Otherwise deposit a fraction of excess sediment
            float amountToDeposit = (deltaHeight > 0.0f) ?
                std::min(deltaHeight, sediment) :
                (sediment - sedimentCapacity) * m_params.depositSpeed;

            // Deposit using bilinear interpolation at the four nodes of the OLD cell (before movement)
            int oldNodeX = static_cast<int>(oldPosX);
            int oldNodeY = static_cast<int>(oldPosY);
            float oldCellOffsetX = oldPosX - oldNodeX;
            float oldCellOffsetY = oldPosY - oldNodeY;

            // Ensure all four corners are within bounds
            if (oldNodeX >= 0 && oldNodeX < static_cast<int>(heightmap.width()) - 1 &&
                oldNodeY >= 0 && oldNodeY < static_cast<int>(heightmap.height()) - 1) {
                int dropletIndex = oldNodeY * heightmap.width() + oldNodeX;
                heightmap.data()[dropletIndex] += amountToDeposit * (1.0f - oldCellOffsetX) * (1.0f - oldCellOffsetY);
                heightmap.data()[dropletIndex + 1] += amountToDeposit * oldCellOffsetX * (1.0f - oldCellOffsetY);
                heightmap.data()[dropletIndex + heightmap.width()] += amountToDeposit * (1.0f - oldCellOffsetX) * oldCellOffsetY;
                heightmap.data()[dropletIndex + heightmap.width() + 1] += amountToDeposit * oldCellOffsetX * oldCellOffsetY;

                // Only update sediment if we actually deposited
                sediment -= amountToDeposit;
            }
        } else {
            // Erode a fraction of the droplet's current carry capacity
            // Clamp erosion to the change in height so it doesn't dig a hole behind the droplet
            float amountToErode = std::min((sedimentCapacity - sediment) * m_params.erodeSpeed, -deltaHeight);

            // Use erosion radius if specified. Apply at old position before movement
            if (m_params.erosionRadius > 1) {
                applyHeightChange(heightmap, oldPosX, oldPosY, -amountToErode);
                sediment += amountToErode;
            } else {
                // Direct erosion at old cell using bilinear interpolation
                int oldNodeX = static_cast<int>(oldPosX);
                int oldNodeY = static_cast<int>(oldPosY);
                float oldCellOffsetX = oldPosX - oldNodeX;
                float oldCellOffsetY = oldPosY - oldNodeY;

                if (oldNodeX >= 0 && oldNodeX < static_cast<int>(heightmap.width()) - 1 &&
                    oldNodeY >= 0 && oldNodeY < static_cast<int>(heightmap.height()) - 1) {
                    int dropletIndex = oldNodeY * heightmap.width() + oldNodeX;
                    heightmap.data()[dropletIndex] -= amountToErode * (1.0f - oldCellOffsetX) * (1.0f - oldCellOffsetY);
                    heightmap.data()[dropletIndex + 1] -= amountToErode * oldCellOffsetX * (1.0f - oldCellOffsetY);
                    heightmap.data()[dropletIndex + heightmap.width()] -= amountToErode * (1.0f - oldCellOffsetX) * oldCellOffsetY;
                    heightmap.data()[dropletIndex + heightmap.width() + 1] -= amountToErode * oldCellOffsetX * oldCellOffsetY;

                    // Only update sediment if we actually eroded
                    sediment += amountToErode;
                }
            }
        }

        // Update droplet's speed and water content
        // When moving downhill (deltaHeight < 0), speed increases
        float speedSq = speed * speed - deltaHeight * m_params.gravity;
        speed = std::sqrt(std::max(0.0f, speedSq));  // Prevent NaN from negative values
        speed = std::min(speed, m_params.maxDropletSpeed);
        water *= (1.0f - m_params.evaporateSpeed);
    }
}

void HydraulicErosion::erode(Heightmap& heightmap, int numParticles, float absoluteMaxHeight) {
    // Save initial heightmap on first call for progressive frame fix
    if (!m_hasInitialHeightmap) {
        m_initialHeightmap = Heightmap(heightmap.width(), heightmap.height());
        m_initialHeightmap.data() = heightmap.data();  // Copy vector data
        m_hasInitialHeightmap = true;
    }

    // Use provided absolute max height if available (prevents progressive frame compounding)
    // Otherwise calculate from current heightmap
    if (absoluteMaxHeight != std::numeric_limits<float>::max()) {
        m_initialMaxHeight = absoluteMaxHeight;
    } else {
        // Calculate initial max elevation to prevent deposition creating spikes
        m_initialMaxHeight = -std::numeric_limits<float>::max();
        for (size_t y = 0; y < heightmap.height(); ++y) {
            for (size_t x = 0; x < heightmap.width(); ++x) {
                m_initialMaxHeight = std::max(m_initialMaxHeight, heightmap.at(x, y));
            }
        }
    }

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

void HydraulicErosion::applyHeightChange(Heightmap& heightmap, float posX, float posY, float amount) {
    // Get the center grid position
    int centerX = static_cast<int>(posX);
    int centerY = static_cast<int>(posY);

    if (m_params.erosionRadius <= 1) {
        // No radius - apply only to current cell
        if (centerX >= 0 && centerX < static_cast<int>(heightmap.width()) &&
            centerY >= 0 && centerY < static_cast<int>(heightmap.height())) {
            float oldHeight = heightmap.at(static_cast<size_t>(centerX), static_cast<size_t>(centerY));

            // For erosion (negative amount), clamp to ensure we don't dig below zero
            if (amount < 0.0f) {
                amount = std::max(amount, -oldHeight);
            }

            float newHeight = oldHeight + amount;
            heightmap.set(static_cast<size_t>(centerX), static_cast<size_t>(centerY), newHeight);
        }
        return;
    }

    // Apply erosion/deposition across a radius with weighted distribution
    // Use a simple distance-weighted kernel for natural-looking results
    float totalWeight = 0.0f;

    // First pass: calculate total weight
    for (int dy = -m_params.erosionRadius; dy <= m_params.erosionRadius; ++dy) {
        for (int dx = -m_params.erosionRadius; dx <= m_params.erosionRadius; ++dx) {
            int x = centerX + dx;
            int y = centerY + dy;

            // Bounds check
            if (x < 0 || x >= static_cast<int>(heightmap.width()) ||
                y < 0 || y >= static_cast<int>(heightmap.height())) {
                continue;
            }

            // Calculate distance from center
            float distance = std::sqrt(static_cast<float>(dx * dx + dy * dy));

            // Skip cells outside the circular radius
            if (distance > static_cast<float>(m_params.erosionRadius)) {
                continue;
            }

            // Weight decreases with distance (linear falloff)
            float weight = std::max(0.0f, 1.0f - distance / static_cast<float>(m_params.erosionRadius));
            totalWeight += weight;
        }
    }

    // Second pass: distribute the height change
    if (totalWeight > 0.0001f) {  // Avoid division by zero
        for (int dy = -m_params.erosionRadius; dy <= m_params.erosionRadius; ++dy) {
            for (int dx = -m_params.erosionRadius; dx <= m_params.erosionRadius; ++dx) {
                int x = centerX + dx;
                int y = centerY + dy;

                // Bounds check
                if (x < 0 || x >= static_cast<int>(heightmap.width()) ||
                    y < 0 || y >= static_cast<int>(heightmap.height())) {
                    continue;
                }

                // Calculate distance from center
                float distance = std::sqrt(static_cast<float>(dx * dx + dy * dy));

                // Skip cells outside the circular radius
                if (distance > static_cast<float>(m_params.erosionRadius)) {
                    continue;
                }

                // Weight decreases with distance (linear falloff)
                float weight = std::max(0.0f, 1.0f - distance / static_cast<float>(m_params.erosionRadius));

                // Apply proportional height change
                float weightedAmount = (weight / totalWeight) * amount;
                float oldHeight = heightmap.at(static_cast<size_t>(x), static_cast<size_t>(y));

                // For erosion, ensure we don't dig below zero
                if (weightedAmount < 0.0f) {
                    weightedAmount = std::max(weightedAmount, -oldHeight);
                }

                float newHeight = oldHeight + weightedAmount;
                heightmap.set(static_cast<size_t>(x), static_cast<size_t>(y), newHeight);
            }
        }
    }
}

} // namespace terrain
