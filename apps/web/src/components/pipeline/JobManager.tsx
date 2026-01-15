import { usePipeline, type SimulationJob } from '../../contexts/PipelineContext';
import { Plus, Edit, Trash2, Power } from 'lucide-react';
import { useState } from 'react';
import { JobModal } from './JobModal';

export default function JobManager() {
  const { config, deleteJob, toggleJobEnabled } = usePipeline();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingJob, setEditingJob] = useState<SimulationJob | undefined>(undefined);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingJob(undefined);
    setModalOpen(true);
  };

  const openEditModal = (job: SimulationJob) => {
    setModalMode('edit');
    setEditingJob(job);
    setModalOpen(true);
  };

  const getJobColor = (step: SimulationJob['step']) => {
    return step === 'hydraulicErosion' ? 'bg-blue-600' : 'bg-orange-600';
  };

  const getJobStatus = (job: SimulationJob) => {
    if (!job.enabled) return { color: 'text-zinc-500', label: 'Disabled' };
    return { color: 'text-green-500', label: 'Enabled' };
  };

  return (
    <div className="p-4 space-y-4">
      {/* Create Job Modal */}
      <JobModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        editingJob={editingJob}
      />

      {/* Create Job Button */}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
        onClick={openCreateModal}
      >
        <Plus size={16} />
        Create Job
      </button>

      {/* Jobs List */}
      <div className="space-y-2">
        {config.jobs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            <div className="mb-2">No jobs created yet</div>
            <div className="text-xs">Click "Create Job" to add erosion jobs</div>
          </div>
        ) : (
          config.jobs.map((job) => {
            const status = getJobStatus(job);
            const isSelected = selectedJob === job.id;

            return (
              <div
                key={job.id}
                className={`p-3 rounded border ${
                  isSelected
                    ? 'border-blue-500 bg-zinc-800'
                    : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
                } transition-colors cursor-pointer`}
                onClick={() => setSelectedJob(isSelected ? null : job.id)}
              >
                {/* Job Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${getJobColor(job.step)}`} />
                      <h4 className="text-sm font-medium truncate">{job.name}</h4>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {job.step === 'hydraulicErosion' ? 'Hydraulic Erosion' : 'Thermal Erosion'}
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${status.color}`}>
                    {status.label}
                  </div>
                </div>

                {/* Frame Range */}
                <div className="text-xs text-zinc-400 mb-3">
                  Frames {job.startFrame}–{job.endFrame} ({job.endFrame - job.startFrame + 1} frames)
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleJobEnabled(job.id);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      job.enabled
                        ? 'bg-zinc-700 hover:bg-zinc-600'
                        : 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                    }`}
                    title={job.enabled ? 'Disable job' : 'Enable job'}
                  >
                    <Power size={12} />
                    {job.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(job);
                    }}
                    className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                    title="Edit job"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete job "${job.name}"?`)) {
                        deleteJob(job.id);
                      }
                    }}
                    className="p-1.5 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                    title="Delete job"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded Details */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-zinc-700 space-y-2">
                    <div className="text-xs">
                      <div className="text-zinc-400 mb-1">Configuration:</div>
                      <pre className="bg-zinc-900 p-2 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(job.config, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Statistics */}
      {config.jobs.length > 0 && (
        <div className="pt-4 border-t border-zinc-700 text-xs text-zinc-400 space-y-1">
          <div>Total Jobs: {config.jobs.length}</div>
          <div>Enabled: {config.jobs.filter((j) => j.enabled).length}</div>
          <div>Disabled: {config.jobs.filter((j) => !j.enabled).length}</div>
        </div>
      )}
    </div>
  );
}
