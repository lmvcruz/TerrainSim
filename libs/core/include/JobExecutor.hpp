#ifndef JOB_EXECUTOR_HPP
#define JOB_EXECUTOR_HPP

#include "SimulationJob.hpp"
#include "Heightmap.hpp"
#include <functional>
#include <vector>

namespace terrain {

class JobExecutor {
public:
    // Callback for frame completion: (frameNumber, heightmap snapshot)
    using FrameCallback = std::function<void(int, const Heightmap&)>;

    // Callback for job execution: (jobId, jobName, frameNumber)
    using JobCallback = std::function<void(const std::string&, const std::string&, int)>;

    // Execute a complete pipeline configuration
    void execute(
        const PipelineConfig& config,
        Heightmap& terrain,
        FrameCallback onFrameComplete = nullptr,
        JobCallback onJobStart = nullptr,
        JobCallback onJobEnd = nullptr
    );

private:
    // Execute all jobs applicable to a specific frame
    void executeFrame(
        int frame,
        const std::vector<SimulationJob*>& jobs,
        Heightmap& terrain,
        JobCallback onJobStart,
        JobCallback onJobEnd
    );

    // Get all enabled jobs that apply to a specific frame
    std::vector<SimulationJob*> getJobsForFrame(int frame, std::vector<SimulationJob>& jobs);

    // Apply a single job's configuration to the terrain
    void applyJob(const SimulationJob& job, Heightmap& terrain);
};

}  // namespace terrain

#endif  // JOB_EXECUTOR_HPP
