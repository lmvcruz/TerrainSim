#include <gtest/gtest.h>
#include "WaterParticle.hpp"

using namespace terrain;

TEST(WaterParticleTest, Constructor) {
    WaterParticle particle(10.5f, 20.3f);

    EXPECT_FLOAT_EQ(particle.x(), 10.5f);
    EXPECT_FLOAT_EQ(particle.y(), 20.3f);
    EXPECT_FLOAT_EQ(particle.velocityX(), 0.0f);
    EXPECT_FLOAT_EQ(particle.velocityY(), 0.0f);
    EXPECT_FLOAT_EQ(particle.sediment(), 0.0f);
    EXPECT_FLOAT_EQ(particle.water(), 1.0f);
}

TEST(WaterParticleTest, SetPosition) {
    WaterParticle particle(0.0f, 0.0f);
    particle.setPosition(5.5f, 10.5f);

    EXPECT_FLOAT_EQ(particle.x(), 5.5f);
    EXPECT_FLOAT_EQ(particle.y(), 10.5f);
}

TEST(WaterParticleTest, SetVelocity) {
    WaterParticle particle(0.0f, 0.0f);
    particle.setVelocity(2.0f, -1.5f);

    EXPECT_FLOAT_EQ(particle.velocityX(), 2.0f);
    EXPECT_FLOAT_EQ(particle.velocityY(), -1.5f);
}

TEST(WaterParticleTest, AddSediment) {
    WaterParticle particle(0.0f, 0.0f);

    particle.addSediment(0.5f);
    EXPECT_FLOAT_EQ(particle.sediment(), 0.5f);

    particle.addSediment(0.3f);
    EXPECT_FLOAT_EQ(particle.sediment(), 0.8f);

    particle.addSediment(-0.2f);
    EXPECT_FLOAT_EQ(particle.sediment(), 0.6f);
}

TEST(WaterParticleTest, SetSediment) {
    WaterParticle particle(0.0f, 0.0f);

    particle.setSediment(1.5f);
    EXPECT_FLOAT_EQ(particle.sediment(), 1.5f);
}

TEST(WaterParticleTest, SetWater) {
    WaterParticle particle(0.0f, 0.0f);

    particle.setWater(0.5f);
    EXPECT_FLOAT_EQ(particle.water(), 0.5f);
}

TEST(WaterParticleTest, IsActive) {
    WaterParticle particle(0.0f, 0.0f);

    EXPECT_TRUE(particle.isActive());

    particle.setWater(0.02f);
    EXPECT_TRUE(particle.isActive());

    particle.setWater(0.005f);
    EXPECT_FALSE(particle.isActive());

    particle.setWater(0.0f);
    EXPECT_FALSE(particle.isActive());
}
