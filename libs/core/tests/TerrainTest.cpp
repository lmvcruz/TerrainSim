#include <gtest/gtest.h>
#include "Terrain.hpp"

TEST(TerrainEngine, Initialization) {
    terrain::Engine engine;
    EXPECT_TRUE(engine.isReady());
}
