#include "JobValidator.hpp"
#include <set>
#include <algorithm>
#include <sstream>

namespace terrain {

ValidationResult JobValidator::validate(const PipelineConfig& config) {
    ValidationResult result;

    // Validate job frame ranges
    result.errors = validateJobRanges(config.totalFrames, config.jobs);

    // Find uncovered frames (only if no range errors)
    if (result.errors.empty()) {
        result.uncoveredFrames = findUncoveredFrames(config.totalFrames, config.jobs);

        // Add error messages for uncovered frames
        if (!result.uncoveredFrames.empty()) {
            std::ostringstream oss;
            oss << "Uncovered frames: ";
            for (size_t i = 0; i < result.uncoveredFrames.size(); ++i) {
                if (i > 0) oss << ", ";
                oss << result.uncoveredFrames[i];
            }
            result.errors.push_back(oss.str());
        }
    }

    // Check for overlaps (warnings only)
    result.warnings = checkOverlaps(config.jobs);

    // Configuration is valid if no errors and no uncovered frames
    result.isValid = result.errors.empty() && result.uncoveredFrames.empty();

    return result;
}

std::vector<int> JobValidator::findUncoveredFrames(int totalFrames, const std::vector<SimulationJob>& jobs) {
    std::vector<int> uncovered;

    // Create coverage map (frame 1 to totalFrames)
    std::vector<bool> covered(totalFrames + 1, false);

    // Mark frames covered by enabled jobs
    for (const auto& job : jobs) {
        if (!job.enabled) continue;

        for (int frame = job.startFrame; frame <= job.endFrame && frame <= totalFrames; ++frame) {
            if (frame >= 1) {
                covered[frame] = true;
            }
        }
    }

    // Collect uncovered frames (1 to totalFrames)
    for (int frame = 1; frame <= totalFrames; ++frame) {
        if (!covered[frame]) {
            uncovered.push_back(frame);
        }
    }

    return uncovered;
}

std::vector<std::string> JobValidator::checkOverlaps(const std::vector<SimulationJob>& jobs) {
    std::vector<std::string> warnings;

    // Check each pair of enabled jobs
    for (size_t i = 0; i < jobs.size(); ++i) {
        if (!jobs[i].enabled) continue;

        for (size_t j = i + 1; j < jobs.size(); ++j) {
            if (!jobs[j].enabled) continue;

            // Check if frame ranges overlap
            int overlapStart = std::max(jobs[i].startFrame, jobs[j].startFrame);
            int overlapEnd = std::min(jobs[i].endFrame, jobs[j].endFrame);

            if (overlapStart <= overlapEnd) {
                std::ostringstream oss;
                oss << "Jobs '" << jobs[i].name << "' and '" << jobs[j].name
                    << "' overlap on frames " << overlapStart << "-" << overlapEnd;
                warnings.push_back(oss.str());
            }
        }
    }

    return warnings;
}

std::vector<std::string> JobValidator::validateJobRanges(int totalFrames, const std::vector<SimulationJob>& jobs) {
    std::vector<std::string> errors;

    for (const auto& job : jobs) {
        // Check if startFrame is valid
        if (job.startFrame < 1) {
            std::ostringstream oss;
            oss << "Job '" << job.name << "' has invalid startFrame " << job.startFrame
                << " (must be >= 1)";
            errors.push_back(oss.str());
        }

        // Check if endFrame is valid
        if (job.endFrame > totalFrames) {
            std::ostringstream oss;
            oss << "Job '" << job.name << "' has endFrame " << job.endFrame
                << " exceeding totalFrames " << totalFrames;
            errors.push_back(oss.str());
        }

        // Check if startFrame <= endFrame
        if (job.startFrame > job.endFrame) {
            std::ostringstream oss;
            oss << "Job '" << job.name << "' has startFrame " << job.startFrame
                << " > endFrame " << job.endFrame;
            errors.push_back(oss.str());
        }
    }

    return errors;
}

}  // namespace terrain
