#ifndef CONFIG_PARSER_HPP
#define CONFIG_PARSER_HPP

#include "SimulationJob.hpp"
#include <string>
#include <nlohmann/json.hpp>

namespace terrain {

class ConfigParser {
public:
    // Parse a JSON string into a PipelineConfig
    PipelineConfig parse(const std::string& jsonStr);

    // Parse from a JSON object
    PipelineConfig parse(const nlohmann::json& json);

private:
    // Parse Step 0 (initial modeling configuration)
    ModelingConfig parseModelingConfig(const nlohmann::json& json);

    // Parse the jobs array
    std::vector<SimulationJob> parseJobs(const nlohmann::json& json);

    // Parse a single job
    SimulationJob parseJob(const nlohmann::json& json);

    // Parse hydraulic erosion config
    HydraulicErosionConfig parseHydraulicConfig(const nlohmann::json& json);

    // Parse thermal erosion config
    ThermalErosionConfig parseThermalConfig(const nlohmann::json& json);

    // Validate required fields and types
    void validateSchema(const nlohmann::json& json);
};

}  // namespace terrain

#endif  // CONFIG_PARSER_HPP
