#ifndef JOB_VALIDATOR_HPP
#define JOB_VALIDATOR_HPP

#include "SimulationJob.hpp"
#include <vector>
#include <string>

namespace terrain {

class JobValidator {
public:
    // Validate a complete pipeline configuration
    ValidationResult validate(const PipelineConfig& config);

private:
    // Find frames that have no enabled jobs covering them
    std::vector<int> findUncoveredFrames(int totalFrames, const std::vector<SimulationJob>& jobs);

    // Check for overlapping jobs (warnings, not errors)
    std::vector<std::string> checkOverlaps(const std::vector<SimulationJob>& jobs);

    // Validate individual job frame ranges
    std::vector<std::string> validateJobRanges(int totalFrames, const std::vector<SimulationJob>& jobs);
};

}  // namespace terrain

#endif  // JOB_VALIDATOR_HPP
