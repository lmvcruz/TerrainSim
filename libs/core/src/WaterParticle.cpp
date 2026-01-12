#include "WaterParticle.hpp"

namespace terrain {

WaterParticle::WaterParticle(float x, float y)
    : m_x(x)
    , m_y(y)
    , m_velocityX(0.0f)
    , m_velocityY(0.0f)
    , m_sediment(0.0f)
    , m_water(1.0f)  // Start with full water volume
{
}

} // namespace terrain
