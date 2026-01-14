#ifndef SIMULATION_JOB_HPP
#define SIMULATION_JOB_HPP

#include <string>
#include <variant>
#include <vector>

namespace terrain {

// Configuration for hydraulic erosion algorithm
struct HydraulicErosionConfig {
    int numParticles = 50000;
    double erosionRate = 0.3;
    double depositionRate = 0.3;
    double evaporationRate = 0.01;
    double sedimentCapacity = 4.0;
    double minSlope = 0.01;
    double inertia = 0.05;
    double gravity = 4.0;
    int maxLifetime = 30;
    double initialWater = 1.0;
    double initialSpeed = 1.0;
};

// Configuration for thermal erosion algorithm
struct ThermalErosionConfig {
    double talusAngle = 0.7;  // Angle of repose in radians
    double transferRate = 0.5;
    int iterations = 100;
};

// Configuration for initial terrain modeling (Step 0)
struct ModelingConfig {
    enum class Method {
        PERLIN_NOISE,
        FBM,
        SEMI_SPHERE,
        CONE,
        SIGMOID
    };

    Method method = Method::FBM;

    // Noise parameters (for PERLIN_NOISE and FBM)
    int seed = 12345;
    double frequency = 0.01;
    double amplitude = 50.0;
    int octaves = 6;           // Only for FBM
    double persistence = 0.5;  // Only for FBM
    double lacunarity = 2.0;   // Only for FBM

    // Geometric parameters (for SEMI_SPHERE, CONE, SIGMOID)
    double radius = 128.0;
    double height = 100.0;
};

// A single simulation job that applies an algorithm to a frame range
struct SimulationJob {
    std::string id;           // e.g., "job-1"
    std::string name;         // e.g., "Heavy Hydraulic Erosion"
    int startFrame;           // Inclusive (1-based)
    int endFrame;             // Inclusive
    std::variant<HydraulicErosionConfig, ThermalErosionConfig> config;
    bool enabled = true;
};

// Complete pipeline configuration
struct PipelineConfig {
    int totalFrames = 10;
    ModelingConfig step0;              // Initial terrain generation
    std::vector<SimulationJob> jobs;   // Jobs to execute
};

// Validation result
struct ValidationResult {
    bool isValid = false;
    std::vector<int> uncoveredFrames;     // Frames with no enabled jobs
    std::vector<std::string> warnings;    // Non-fatal issues (overlaps, etc.)
    std::vector<std::string> errors;      // Fatal issues (gaps, invalid ranges)
};

}  // namespace terrain

#endif  // SIMULATION_JOB_HPP
