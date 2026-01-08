#include <gtest/gtest.h>
#include "Heightmap.hpp"

using namespace terrain;

// Test fixture for Heightmap tests
class HeightmapTest : public ::testing::Test {
protected:
    static constexpr size_t TEST_WIDTH = 256;
    static constexpr size_t TEST_HEIGHT = 256;
};

// Test: Constructor initializes with correct dimensions
TEST_F(HeightmapTest, ConstructorInitializesDimensions) {
    Heightmap hm(TEST_WIDTH, TEST_HEIGHT);

    EXPECT_EQ(hm.width(), TEST_WIDTH);
    EXPECT_EQ(hm.height(), TEST_HEIGHT);
    EXPECT_EQ(hm.size(), TEST_WIDTH * TEST_HEIGHT);
}

// Test: Constructor initializes all values to zero
TEST_F(HeightmapTest, ConstructorInitializesToZero) {
    Heightmap hm(10, 10);

    for (size_t y = 0; y < hm.height(); ++y) {
        for (size_t x = 0; x < hm.width(); ++x) {
            EXPECT_FLOAT_EQ(hm.at(x, y), 0.0f);
        }
    }
}

// Test: Set and get values correctly
TEST_F(HeightmapTest, SetAndGetValues) {
    Heightmap hm(TEST_WIDTH, TEST_HEIGHT);

    hm.set(0, 0, 1.0f);
    hm.set(100, 100, 50.5f);
    hm.set(255, 255, -10.0f);

    EXPECT_FLOAT_EQ(hm.at(0, 0), 1.0f);
    EXPECT_FLOAT_EQ(hm.at(100, 100), 50.5f);
    EXPECT_FLOAT_EQ(hm.at(255, 255), -10.0f);
}

// Test: Row-major order storage
TEST_F(HeightmapTest, RowMajorOrderStorage) {
    Heightmap hm(4, 3);

    // Set values in a known pattern
    for (size_t y = 0; y < 3; ++y) {
        for (size_t x = 0; x < 4; ++x) {
            hm.set(x, y, static_cast<float>(y * 4 + x));
        }
    }

    // Verify Row-Major Order: data should be [0,1,2,3, 4,5,6,7, 8,9,10,11]
    const auto& data = hm.data();
    for (size_t i = 0; i < data.size(); ++i) {
        EXPECT_FLOAT_EQ(data[i], static_cast<float>(i));
    }
}

// Test: Fill operation
TEST_F(HeightmapTest, FillOperation) {
    Heightmap hm(TEST_WIDTH, TEST_HEIGHT);

    hm.fill(42.0f);

    for (size_t y = 0; y < hm.height(); ++y) {
        for (size_t x = 0; x < hm.width(); ++x) {
            EXPECT_FLOAT_EQ(hm.at(x, y), 42.0f);
        }
    }
}

// Test: Corner cells access
TEST_F(HeightmapTest, CornerCellsAccess) {
    Heightmap hm(TEST_WIDTH, TEST_HEIGHT);

    // Top-left
    hm.set(0, 0, 1.0f);
    EXPECT_FLOAT_EQ(hm.at(0, 0), 1.0f);

    // Top-right
    hm.set(TEST_WIDTH - 1, 0, 2.0f);
    EXPECT_FLOAT_EQ(hm.at(TEST_WIDTH - 1, 0), 2.0f);

    // Bottom-left
    hm.set(0, TEST_HEIGHT - 1, 3.0f);
    EXPECT_FLOAT_EQ(hm.at(0, TEST_HEIGHT - 1), 3.0f);

    // Bottom-right
    hm.set(TEST_WIDTH - 1, TEST_HEIGHT - 1, 4.0f);
    EXPECT_FLOAT_EQ(hm.at(TEST_WIDTH - 1, TEST_HEIGHT - 1), 4.0f);
}

// Test: Data access methods
TEST_F(HeightmapTest, DataAccessMethods) {
    Heightmap hm(4, 4);
    hm.fill(7.5f);

    // Const access
    const auto& constData = hm.data();
    EXPECT_EQ(constData.size(), 16u);
    EXPECT_FLOAT_EQ(constData[0], 7.5f);

    // Mutable access
    auto& mutableData = hm.data();
    mutableData[5] = 99.0f;

    // Verify change through at()
    EXPECT_FLOAT_EQ(hm.at(1, 1), 99.0f); // index 5 = (1, 1) in 4x4 grid
}

// Test: Small heightmap (1x1)
TEST_F(HeightmapTest, SingleCellHeightmap) {
    Heightmap hm(1, 1);

    EXPECT_EQ(hm.width(), 1u);
    EXPECT_EQ(hm.height(), 1u);
    EXPECT_EQ(hm.size(), 1u);

    hm.set(0, 0, 123.456f);
    EXPECT_FLOAT_EQ(hm.at(0, 0), 123.456f);
}

// Test: Non-square heightmap
TEST_F(HeightmapTest, NonSquareHeightmap) {
    Heightmap hm(100, 50);

    EXPECT_EQ(hm.width(), 100u);
    EXPECT_EQ(hm.height(), 50u);
    EXPECT_EQ(hm.size(), 5000u);

    hm.set(99, 49, 1.0f); // Last cell
    EXPECT_FLOAT_EQ(hm.at(99, 49), 1.0f);
}

// Test: Negative elevation values
TEST_F(HeightmapTest, NegativeElevations) {
    Heightmap hm(10, 10);

    hm.set(5, 5, -100.5f);
    EXPECT_FLOAT_EQ(hm.at(5, 5), -100.5f);

    hm.fill(-50.0f);
    EXPECT_FLOAT_EQ(hm.at(0, 0), -50.0f);
    EXPECT_FLOAT_EQ(hm.at(9, 9), -50.0f);
}

// Test: Large values
TEST_F(HeightmapTest, LargeElevationValues) {
    Heightmap hm(10, 10);

    hm.set(5, 5, 8848.86f); // Mt. Everest height in meters
    EXPECT_FLOAT_EQ(hm.at(5, 5), 8848.86f);
}

// Test: Memory layout contiguity
TEST_F(HeightmapTest, MemoryContiguity) {
    Heightmap hm(10, 10);

    const auto& data = hm.data();

    // Verify that data is stored in a contiguous block
    EXPECT_EQ(data.size(), 100u);

    // The underlying std::vector guarantees contiguous storage
    // We can verify by checking that pointer arithmetic works
    const float* ptr = data.data();
    for (size_t i = 0; i < data.size(); ++i) {
        EXPECT_EQ(&ptr[i], &data[i]);
    }
}

// Test: Multiple fill operations
TEST_F(HeightmapTest, MultipleFillOperations) {
    Heightmap hm(50, 50);

    hm.fill(1.0f);
    EXPECT_FLOAT_EQ(hm.at(25, 25), 1.0f);

    hm.fill(2.0f);
    EXPECT_FLOAT_EQ(hm.at(25, 25), 2.0f);

    hm.fill(0.0f);
    EXPECT_FLOAT_EQ(hm.at(25, 25), 0.0f);
}

// Test: Setting multiple values doesn't affect others
TEST_F(HeightmapTest, IndependentCells) {
    Heightmap hm(3, 3);
    hm.fill(0.0f);

    hm.set(1, 1, 5.0f); // Center

    // Check that neighbors are unaffected
    EXPECT_FLOAT_EQ(hm.at(0, 0), 0.0f);
    EXPECT_FLOAT_EQ(hm.at(1, 0), 0.0f);
    EXPECT_FLOAT_EQ(hm.at(2, 0), 0.0f);
    EXPECT_FLOAT_EQ(hm.at(0, 1), 0.0f);
    EXPECT_FLOAT_EQ(hm.at(1, 1), 5.0f);
    EXPECT_FLOAT_EQ(hm.at(2, 1), 0.0f);
    EXPECT_FLOAT_EQ(hm.at(0, 2), 0.0f);
    EXPECT_FLOAT_EQ(hm.at(1, 2), 0.0f);
    EXPECT_FLOAT_EQ(hm.at(2, 2), 0.0f);
}
