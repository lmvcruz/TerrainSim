#include "JobExecutor.hpp"
#include "HydraulicErosion.hpp"
#include <algorithm>

namespace terrain {

void JobExecutor::execute(
    const PipelineConfig& config,
    Heightmap& terrain,
    FrameCallback onFrameComplete,
    JobCallback onJobStart,
    JobCallback onJobEnd
) {
    // Frame 0 is handled by Step 0 (initial modeling) - already done before this

    // Execute frames 1 to totalFrames
    for (int frame = 1; frame <= config.totalFrames; ++frame) {
        // Get all jobs that apply to this frame
        // Note: We need a mutable copy to get pointers
        auto mutableJobs = config.jobs;
        auto frameJobs = getJobsForFrame(frame, mutableJobs);

        // Execute all jobs for this frame
        executeFrame(frame, frameJobs, terrain, onJobStart, onJobEnd);

        // Notify frame completion
        if (onFrameComplete) {
            onFrameComplete(frame, terrain);
        }
    }
}

void JobExecutor::executeFrame(
    int frame,
    const std::vector<SimulationJob*>& jobs,
    Heightmap& terrain,
    JobCallback onJobStart,
    JobCallback onJobEnd
) {
    // Apply each job sequentially (last job wins for overlaps)
    for (auto* job : jobs) {
        if (onJobStart) {
            onJobStart(job->id, job->name, frame);
        }

        applyJob(*job, terrain);

        if (onJobEnd) {
            onJobEnd(job->id, job->name, frame);
        }
    }
}

std::vector<SimulationJob*> JobExecutor::getJobsForFrame(int frame, std::vector<SimulationJob>& jobs) {
    std::vector<SimulationJob*> result;

    for (auto& job : jobs) {
        // Check if job is enabled and covers this frame
        if (job.enabled && frame >= job.startFrame && frame <= job.endFrame) {
            result.push_back(&job);
        }
    }

    return result;
}

void JobExecutor::applyJob(const SimulationJob& job, Heightmap& terrain) {
    // Use std::visit to handle the variant config type
    std::visit([&terrain](auto&& config) {
        using T = std::decay_t<decltype(config)>;

        if constexpr (std::is_same_v<T, HydraulicErosionConfig>) {
            // Convert config to HydraulicErosionParams
            HydraulicErosionParams params;
            params.maxIterations = config.maxLifetime;
            params.inertia = static_cast<float>(config.inertia);
            params.sedimentCapacityFactor = static_cast<float>(config.sedimentCapacity);
            params.minSedimentCapacity = static_cast<float>(config.minSlope);
            params.erodeSpeed = static_cast<float>(config.erosionRate);
            params.depositSpeed = static_cast<float>(config.depositionRate);
            params.evaporateSpeed = static_cast<float>(config.evaporationRate);
            params.gravity = static_cast<float>(config.gravity);

            // Apply hydraulic erosion
            HydraulicErosion erosion(params);
            erosion.erode(terrain, config.numParticles);
        } else if constexpr (std::is_same_v<T, ThermalErosionConfig>) {
            // Thermal erosion not yet implemented
            // This is a placeholder for Iteration 4
            // For now, do nothing
        }
    }, job.config);
}

}  // namespace terrain
