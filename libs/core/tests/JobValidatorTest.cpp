#include <gtest/gtest.h>
#include "JobValidator.hpp"

using namespace terrain;

class JobValidatorTest : public ::testing::Test {
protected:
    JobValidator validator;

    // Helper to create a simple pipeline config
    PipelineConfig createConfig(int totalFrames) {
        PipelineConfig config;
        config.totalFrames = totalFrames;
        return config;
    }

    // Helper to create a hydraulic erosion job
    SimulationJob createHydraulicJob(const std::string& id, const std::string& name,
                                      int start, int end, bool enabled = true) {
        SimulationJob job;
        job.id = id;
        job.name = name;
        job.startFrame = start;
        job.endFrame = end;
        job.enabled = enabled;
        job.config = HydraulicErosionConfig{};
        return job;
    }
};

// Test 1: Valid configuration with full coverage
TEST_F(JobValidatorTest, ValidConfigFullCoverage) {
    auto config = createConfig(5);
    config.jobs.push_back(createHydraulicJob("job-1", "Full Coverage", 1, 5));

    auto result = validator.validate(config);

    EXPECT_TRUE(result.isValid);
    EXPECT_TRUE(result.uncoveredFrames.empty());
    EXPECT_TRUE(result.errors.empty());
}

// Test 2: Single gap in coverage
TEST_F(JobValidatorTest, SingleGapDetected) {
    auto config = createConfig(5);
    config.jobs.push_back(createHydraulicJob("job-1", "Partial", 1, 2));
    config.jobs.push_back(createHydraulicJob("job-2", "Partial", 4, 5));
    // Frame 3 is missing

    auto result = validator.validate(config);

    EXPECT_FALSE(result.isValid);
    ASSERT_EQ(result.uncoveredFrames.size(), 1);
    EXPECT_EQ(result.uncoveredFrames[0], 3);
    EXPECT_FALSE(result.errors.empty());
}

// Test 3: Multiple gaps in coverage
TEST_F(JobValidatorTest, MultipleGapsDetected) {
    auto config = createConfig(10);
    config.jobs.push_back(createHydraulicJob("job-1", "Job1", 1, 2));
    config.jobs.push_back(createHydraulicJob("job-2", "Job2", 5, 6));
    // Frames 3, 4, 7, 8, 9, 10 are missing

    auto result = validator.validate(config);

    EXPECT_FALSE(result.isValid);
    EXPECT_EQ(result.uncoveredFrames.size(), 6);
    EXPECT_EQ(result.uncoveredFrames[0], 3);
    EXPECT_EQ(result.uncoveredFrames[1], 4);
    EXPECT_EQ(result.uncoveredFrames[2], 7);
    EXPECT_EQ(result.uncoveredFrames[3], 8);
    EXPECT_EQ(result.uncoveredFrames[4], 9);
    EXPECT_EQ(result.uncoveredFrames[5], 10);
}

// Test 4: All jobs disabled
TEST_F(JobValidatorTest, AllJobsDisabled) {
    auto config = createConfig(3);
    config.jobs.push_back(createHydraulicJob("job-1", "Disabled", 1, 3, false));

    auto result = validator.validate(config);

    EXPECT_FALSE(result.isValid);
    EXPECT_EQ(result.uncoveredFrames.size(), 3);
}

// Test 5: Overlapping jobs (warning, not error)
TEST_F(JobValidatorTest, OverlappingJobsWarning) {
    auto config = createConfig(5);
    config.jobs.push_back(createHydraulicJob("job-1", "Heavy Erosion", 1, 3));
    config.jobs.push_back(createHydraulicJob("job-2", "Light Erosion", 2, 5));

    auto result = validator.validate(config);

    EXPECT_TRUE(result.isValid);  // Still valid despite overlap
    EXPECT_TRUE(result.uncoveredFrames.empty());
    EXPECT_FALSE(result.warnings.empty());
    EXPECT_TRUE(result.warnings[0].find("overlap") != std::string::npos);
}

// Test 6: Multiple overlaps
TEST_F(JobValidatorTest, MultipleOverlaps) {
    auto config = createConfig(5);
    config.jobs.push_back(createHydraulicJob("job-1", "Job1", 1, 3));
    config.jobs.push_back(createHydraulicJob("job-2", "Job2", 2, 4));
    config.jobs.push_back(createHydraulicJob("job-3", "Job3", 3, 5));

    auto result = validator.validate(config);

    EXPECT_TRUE(result.isValid);
    EXPECT_TRUE(result.uncoveredFrames.empty());
    EXPECT_EQ(result.warnings.size(), 3);  // 3 pairs overlap
}

// Test 7: Invalid startFrame (< 1)
TEST_F(JobValidatorTest, InvalidStartFrameTooLow) {
    auto config = createConfig(5);
    config.jobs.push_back(createHydraulicJob("job-1", "Invalid", 0, 5));

    auto result = validator.validate(config);

    EXPECT_FALSE(result.isValid);
    EXPECT_FALSE(result.errors.empty());
    EXPECT_TRUE(result.errors[0].find("startFrame") != std::string::npos);
}

// Test 8: Invalid endFrame (> totalFrames)
TEST_F(JobValidatorTest, InvalidEndFrameTooHigh) {
    auto config = createConfig(5);
    config.jobs.push_back(createHydraulicJob("job-1", "Invalid", 1, 10));

    auto result = validator.validate(config);

    EXPECT_FALSE(result.isValid);
    EXPECT_FALSE(result.errors.empty());
    EXPECT_TRUE(result.errors[0].find("endFrame") != std::string::npos);
}

// Test 9: startFrame > endFrame
TEST_F(JobValidatorTest, StartFrameGreaterThanEndFrame) {
    auto config = createConfig(5);
    config.jobs.push_back(createHydraulicJob("job-1", "Invalid", 4, 2));

    auto result = validator.validate(config);

    EXPECT_FALSE(result.isValid);
    EXPECT_FALSE(result.errors.empty());
    EXPECT_TRUE(result.errors[0].find("startFrame") != std::string::npos);
    EXPECT_TRUE(result.errors[0].find("endFrame") != std::string::npos);
}

// Test 10: Empty jobs array
TEST_F(JobValidatorTest, EmptyJobsArray) {
    auto config = createConfig(3);
    // No jobs added

    auto result = validator.validate(config);

    EXPECT_FALSE(result.isValid);
    EXPECT_EQ(result.uncoveredFrames.size(), 3);
}

// Test 11: Mix of enabled and disabled jobs
TEST_F(JobValidatorTest, MixedEnabledDisabled) {
    auto config = createConfig(5);
    config.jobs.push_back(createHydraulicJob("job-1", "Enabled", 1, 2, true));
    config.jobs.push_back(createHydraulicJob("job-2", "Disabled", 3, 5, false));
    // Only frames 1-2 are covered

    auto result = validator.validate(config);

    EXPECT_FALSE(result.isValid);
    EXPECT_EQ(result.uncoveredFrames.size(), 3);  // Frames 3, 4, 5
}

// Test 12: Edge case - single frame
TEST_F(JobValidatorTest, SingleFrame) {
    auto config = createConfig(1);
    config.jobs.push_back(createHydraulicJob("job-1", "Single", 1, 1));

    auto result = validator.validate(config);

    EXPECT_TRUE(result.isValid);
    EXPECT_TRUE(result.uncoveredFrames.empty());
}
