#include <gtest/gtest.h>
#include "ConfigParser.hpp"

using namespace terrain;

class ConfigParserTest : public ::testing::Test {
protected:
    ConfigParser parser;
};

// Test 1: Valid complete configuration
TEST_F(ConfigParserTest, ValidCompleteConfiguration) {
    std::string json = R"({
        "totalFrames": 10,
        "step0": {
            "method": "fbm",
            "seed": 12345,
            "frequency": 0.01,
            "amplitude": 50.0,
            "octaves": 6,
            "persistence": 0.5,
            "lacunarity": 2.0
        },
        "jobs": [
            {
                "id": "job-1",
                "name": "Heavy Erosion",
                "startFrame": 1,
                "endFrame": 5,
                "type": "hydraulic",
                "enabled": true,
                "config": {
                    "numParticles": 50000,
                    "erosionRate": 0.3
                }
            }
        ]
    })";

    PipelineConfig config = parser.parse(json);

    EXPECT_EQ(config.totalFrames, 10);
    EXPECT_EQ(config.step0.method, ModelingConfig::Method::FBM);
    EXPECT_EQ(config.step0.seed, 12345);
    EXPECT_EQ(config.jobs.size(), 1);
    EXPECT_EQ(config.jobs[0].id, "job-1");
    EXPECT_EQ(config.jobs[0].startFrame, 1);
    EXPECT_EQ(config.jobs[0].endFrame, 5);
}

// Test 2: Missing required field (totalFrames)
TEST_F(ConfigParserTest, MissingTotalFrames) {
    std::string json = R"({
        "step0": {
            "method": "perlin"
        }
    })";

    EXPECT_THROW({
        parser.parse(json);
    }, std::runtime_error);
}

// Test 3: Missing required field (step0)
TEST_F(ConfigParserTest, MissingStep0) {
    std::string json = R"({
        "totalFrames": 5
    })";

    EXPECT_THROW({
        parser.parse(json);
    }, std::runtime_error);
}

// Test 4: Invalid JSON syntax
TEST_F(ConfigParserTest, InvalidJSONSyntax) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {
            "method": "fbm"
        }
        // Missing closing brace
    )";

    EXPECT_THROW({
        parser.parse(json);
    }, std::runtime_error);
}

// Test 5: Invalid totalFrames value (< 1)
TEST_F(ConfigParserTest, InvalidTotalFramesValue) {
    std::string json = R"({
        "totalFrames": 0,
        "step0": {
            "method": "perlin"
        }
    })";

    EXPECT_THROW({
        parser.parse(json);
    }, std::runtime_error);
}

// Test 6: Unknown modeling method
TEST_F(ConfigParserTest, UnknownModelingMethod) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {
            "method": "unknown_method"
        }
    })";

    EXPECT_THROW({
        parser.parse(json);
    }, std::runtime_error);
}

// Test 7: Valid configuration with multiple jobs
TEST_F(ConfigParserTest, MultipleJobs) {
    std::string json = R"({
        "totalFrames": 10,
        "step0": {
            "method": "cone",
            "radius": 100.0,
            "height": 80.0
        },
        "jobs": [
            {
                "id": "job-1",
                "name": "Hydraulic",
                "startFrame": 1,
                "endFrame": 5,
                "type": "hydraulic",
                "config": {}
            },
            {
                "id": "job-2",
                "name": "Thermal",
                "startFrame": 6,
                "endFrame": 10,
                "type": "thermal",
                "config": {
                    "talusAngle": 0.7
                }
            }
        ]
    })";

    PipelineConfig config = parser.parse(json);

    EXPECT_EQ(config.jobs.size(), 2);
    EXPECT_EQ(config.jobs[0].name, "Hydraulic");
    EXPECT_EQ(config.jobs[1].name, "Thermal");
}

// Test 8: Job missing required field (id)
TEST_F(ConfigParserTest, JobMissingId) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {"method": "perlin"},
        "jobs": [
            {
                "name": "Test",
                "startFrame": 1,
                "endFrame": 5,
                "type": "hydraulic",
                "config": {}
            }
        ]
    })";

    EXPECT_THROW({
        parser.parse(json);
    }, std::runtime_error);
}

// Test 9: Job missing required field (type)
TEST_F(ConfigParserTest, JobMissingType) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {"method": "perlin"},
        "jobs": [
            {
                "id": "job-1",
                "name": "Test",
                "startFrame": 1,
                "endFrame": 5,
                "config": {}
            }
        ]
    })";

    EXPECT_THROW({
        parser.parse(json);
    }, std::runtime_error);
}

// Test 10: Unknown job type
TEST_F(ConfigParserTest, UnknownJobType) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {"method": "perlin"},
        "jobs": [
            {
                "id": "job-1",
                "name": "Test",
                "startFrame": 1,
                "endFrame": 5,
                "type": "unknown_type",
                "config": {}
            }
        ]
    })";

    EXPECT_THROW({
        parser.parse(json);
    }, std::runtime_error);
}

// Test 11: Empty jobs array (valid)
TEST_F(ConfigParserTest, EmptyJobsArray) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {"method": "perlin"},
        "jobs": []
    })";

    PipelineConfig config = parser.parse(json);

    EXPECT_EQ(config.totalFrames, 5);
    EXPECT_TRUE(config.jobs.empty());
}

// Test 12: No jobs field (valid)
TEST_F(ConfigParserTest, NoJobsField) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {"method": "perlin"}
    })";

    PipelineConfig config = parser.parse(json);

    EXPECT_EQ(config.totalFrames, 5);
    EXPECT_TRUE(config.jobs.empty());
}

// Test 13: All modeling methods
TEST_F(ConfigParserTest, AllModelingMethods) {
    std::vector<std::pair<std::string, ModelingConfig::Method>> methods = {
        {"perlin", ModelingConfig::Method::PERLIN_NOISE},
        {"fbm", ModelingConfig::Method::FBM},
        {"semiSphere", ModelingConfig::Method::SEMI_SPHERE},
        {"cone", ModelingConfig::Method::CONE},
        {"sigmoid", ModelingConfig::Method::SIGMOID}
    };

    for (const auto& [methodStr, methodEnum] : methods) {
        std::string json = R"({
            "totalFrames": 5,
            "step0": {
                "method": ")" + methodStr + R"("
            }
        })";

        PipelineConfig config = parser.parse(json);
        EXPECT_EQ(config.step0.method, methodEnum);
    }
}

// Test 14: Hydraulic config parameters
TEST_F(ConfigParserTest, HydraulicConfigParameters) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {"method": "perlin"},
        "jobs": [
            {
                "id": "job-1",
                "name": "Test",
                "startFrame": 1,
                "endFrame": 5,
                "type": "hydraulic",
                "config": {
                    "numParticles": 100000,
                    "erosionRate": 0.5,
                    "depositionRate": 0.4,
                    "sedimentCapacity": 5.0
                }
            }
        ]
    })";

    PipelineConfig config = parser.parse(json);

    ASSERT_EQ(config.jobs.size(), 1);
    auto* hydraulicConfig = std::get_if<HydraulicErosionConfig>(&config.jobs[0].config);
    ASSERT_NE(hydraulicConfig, nullptr);
    EXPECT_EQ(hydraulicConfig->numParticles, 100000);
    EXPECT_DOUBLE_EQ(hydraulicConfig->erosionRate, 0.5);
    EXPECT_DOUBLE_EQ(hydraulicConfig->depositionRate, 0.4);
    EXPECT_DOUBLE_EQ(hydraulicConfig->sedimentCapacity, 5.0);
}

// Test 15: Thermal config parameters
TEST_F(ConfigParserTest, ThermalConfigParameters) {
    std::string json = R"({
        "totalFrames": 5,
        "step0": {"method": "perlin"},
        "jobs": [
            {
                "id": "job-1",
                "name": "Test",
                "startFrame": 1,
                "endFrame": 5,
                "type": "thermal",
                "config": {
                    "talusAngle": 0.8,
                    "transferRate": 0.6,
                    "iterations": 200
                }
            }
        ]
    })";

    PipelineConfig config = parser.parse(json);

    ASSERT_EQ(config.jobs.size(), 1);
    auto* thermalConfig = std::get_if<ThermalErosionConfig>(&config.jobs[0].config);
    ASSERT_NE(thermalConfig, nullptr);
    EXPECT_DOUBLE_EQ(thermalConfig->talusAngle, 0.8);
    EXPECT_DOUBLE_EQ(thermalConfig->transferRate, 0.6);
    EXPECT_EQ(thermalConfig->iterations, 200);
}
