#include "ConfigParser.hpp"
#include <stdexcept>
#include <sstream>

namespace terrain {

PipelineConfig ConfigParser::parse(const std::string& jsonStr) {
    try {
        nlohmann::json json = nlohmann::json::parse(jsonStr);
        return parse(json);
    } catch (const nlohmann::json::parse_error& e) {
        std::ostringstream oss;
        oss << "JSON parse error: " << e.what();
        throw std::runtime_error(oss.str());
    }
}

PipelineConfig ConfigParser::parse(const nlohmann::json& json) {
    validateSchema(json);

    PipelineConfig config;

    // Parse totalFrames (required)
    config.totalFrames = json["totalFrames"].get<int>();

    // Parse step0 (required)
    if (json.contains("step0")) {
        config.step0 = parseModelingConfig(json["step0"]);
    }

    // Parse jobs array (optional, defaults to empty)
    if (json.contains("jobs") && json["jobs"].is_array()) {
        config.jobs = parseJobs(json["jobs"]);
    }

    return config;
}

ModelingConfig ConfigParser::parseModelingConfig(const nlohmann::json& json) {
    ModelingConfig config;

    // Parse method (required)
    if (json.contains("method")) {
        std::string methodStr = json["method"].get<std::string>();

        if (methodStr == "perlin") {
            config.method = ModelingConfig::Method::PERLIN_NOISE;
        } else if (methodStr == "fbm") {
            config.method = ModelingConfig::Method::FBM;
        } else if (methodStr == "semiSphere") {
            config.method = ModelingConfig::Method::SEMI_SPHERE;
        } else if (methodStr == "cone") {
            config.method = ModelingConfig::Method::CONE;
        } else if (methodStr == "sigmoid") {
            config.method = ModelingConfig::Method::SIGMOID;
        } else {
            throw std::runtime_error("Unknown modeling method: " + methodStr);
        }
    }

    // Parse noise parameters (optional)
    if (json.contains("seed")) config.seed = json["seed"].get<int>();
    if (json.contains("frequency")) config.frequency = json["frequency"].get<double>();
    if (json.contains("amplitude")) config.amplitude = json["amplitude"].get<double>();
    if (json.contains("octaves")) config.octaves = json["octaves"].get<int>();
    if (json.contains("persistence")) config.persistence = json["persistence"].get<double>();
    if (json.contains("lacunarity")) config.lacunarity = json["lacunarity"].get<double>();

    // Parse geometric parameters (optional)
    if (json.contains("radius")) config.radius = json["radius"].get<double>();
    if (json.contains("height")) config.height = json["height"].get<double>();

    return config;
}

std::vector<SimulationJob> ConfigParser::parseJobs(const nlohmann::json& json) {
    std::vector<SimulationJob> jobs;

    for (const auto& jobJson : json) {
        jobs.push_back(parseJob(jobJson));
    }

    return jobs;
}

SimulationJob ConfigParser::parseJob(const nlohmann::json& json) {
    SimulationJob job;

    // Parse required fields
    if (!json.contains("id")) {
        throw std::runtime_error("Job missing required field: id");
    }
    job.id = json["id"].get<std::string>();

    if (!json.contains("name")) {
        throw std::runtime_error("Job missing required field: name");
    }
    job.name = json["name"].get<std::string>();

    if (!json.contains("startFrame")) {
        throw std::runtime_error("Job missing required field: startFrame");
    }
    job.startFrame = json["startFrame"].get<int>();

    if (!json.contains("endFrame")) {
        throw std::runtime_error("Job missing required field: endFrame");
    }
    job.endFrame = json["endFrame"].get<int>();

    if (!json.contains("type")) {
        throw std::runtime_error("Job missing required field: type");
    }
    std::string type = json["type"].get<std::string>();

    if (!json.contains("config")) {
        throw std::runtime_error("Job missing required field: config");
    }

    // Parse config based on type
    if (type == "hydraulic") {
        job.config = parseHydraulicConfig(json["config"]);
    } else if (type == "thermal") {
        job.config = parseThermalConfig(json["config"]);
    } else {
        throw std::runtime_error("Unknown job type: " + type);
    }

    // Parse optional enabled field
    if (json.contains("enabled")) {
        job.enabled = json["enabled"].get<bool>();
    }

    return job;
}

HydraulicErosionConfig ConfigParser::parseHydraulicConfig(const nlohmann::json& json) {
    HydraulicErosionConfig config;

    // Parse all optional parameters
    if (json.contains("numParticles")) config.numParticles = json["numParticles"].get<int>();
    if (json.contains("erosionRate")) config.erosionRate = json["erosionRate"].get<double>();
    if (json.contains("depositionRate")) config.depositionRate = json["depositionRate"].get<double>();
    if (json.contains("evaporationRate")) config.evaporationRate = json["evaporationRate"].get<double>();
    if (json.contains("sedimentCapacity")) config.sedimentCapacity = json["sedimentCapacity"].get<double>();
    if (json.contains("minSlope")) config.minSlope = json["minSlope"].get<double>();
    if (json.contains("inertia")) config.inertia = json["inertia"].get<double>();
    if (json.contains("gravity")) config.gravity = json["gravity"].get<double>();
    if (json.contains("maxLifetime")) config.maxLifetime = json["maxLifetime"].get<int>();
    if (json.contains("initialWater")) config.initialWater = json["initialWater"].get<double>();
    if (json.contains("initialSpeed")) config.initialSpeed = json["initialSpeed"].get<double>();

    return config;
}

ThermalErosionConfig ConfigParser::parseThermalConfig(const nlohmann::json& json) {
    ThermalErosionConfig config;

    // Parse all optional parameters
    if (json.contains("talusAngle")) config.talusAngle = json["talusAngle"].get<double>();
    if (json.contains("transferRate")) config.transferRate = json["transferRate"].get<double>();
    if (json.contains("iterations")) config.iterations = json["iterations"].get<int>();

    return config;
}

void ConfigParser::validateSchema(const nlohmann::json& json) {
    // Check top-level required fields
    if (!json.is_object()) {
        throw std::runtime_error("Configuration must be a JSON object");
    }

    if (!json.contains("totalFrames")) {
        throw std::runtime_error("Configuration missing required field: totalFrames");
    }

    if (!json["totalFrames"].is_number_integer()) {
        throw std::runtime_error("totalFrames must be an integer");
    }

    if (!json.contains("step0")) {
        throw std::runtime_error("Configuration missing required field: step0");
    }

    if (!json["step0"].is_object()) {
        throw std::runtime_error("step0 must be an object");
    }

    // Validate totalFrames value
    int totalFrames = json["totalFrames"].get<int>();
    if (totalFrames < 1) {
        throw std::runtime_error("totalFrames must be >= 1");
    }

    // Validate jobs array if present
    if (json.contains("jobs")) {
        if (!json["jobs"].is_array()) {
            throw std::runtime_error("jobs must be an array");
        }
    }
}

}  // namespace terrain
