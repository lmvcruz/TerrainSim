import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Info } from 'lucide-react';
import { usePipeline, type SimulationJob, type JobConfig } from '../../contexts/PipelineContext';
import { getTemplatesByStep, getDefaultTemplate } from '../../lib/jobTemplates';

interface JobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  editingJob?: SimulationJob;
}

export function JobModal({ open, onOpenChange, mode, editingJob }: JobModalProps) {
  const { config, addJob, updateJob } = usePipeline();
  const [jobName, setJobName] = useState('');
  const [step, setStep] = useState<'hydraulicErosion' | 'thermalErosion'>('hydraulicErosion');
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame, setEndFrame] = useState(config.totalFrames);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [jobConfig, setJobConfig] = useState<JobConfig>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load editing job data
  useEffect(() => {
    if (mode === 'edit' && editingJob) {
      setJobName(editingJob.name);
      setStep(editingJob.step);
      setStartFrame(editingJob.startFrame);
      setEndFrame(editingJob.endFrame);
      setJobConfig(editingJob.config);

      // Try to find matching template
      const templates = getTemplatesByStep(editingJob.step);
      const matchingTemplate = templates.find((t) =>
        JSON.stringify(t.config) === JSON.stringify(editingJob.config)
      );
      setSelectedTemplateId(matchingTemplate?.id || '');
    } else if (mode === 'create') {
      // Initialize with default template
      const defaultTemplate = getDefaultTemplate(step);
      setSelectedTemplateId(defaultTemplate.id);
      setJobConfig(defaultTemplate.config);
    }
  }, [mode, editingJob, step]);

  // Load template when selection changes
  useEffect(() => {
    if (selectedTemplateId) {
      const templates = getTemplatesByStep(step);
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setJobConfig(template.config);
      }
    }
  }, [selectedTemplateId, step]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!jobName.trim()) {
      newErrors.name = 'Job name is required';
    } else {
      // Check for duplicate names (excluding current job in edit mode)
      const isDuplicate = config.jobs.some(
        (j) => j.name === jobName.trim() && (mode === 'create' || j.id !== editingJob?.id)
      );
      if (isDuplicate) {
        newErrors.name = 'Job name must be unique';
      }
    }

    if (startFrame < 1) {
      newErrors.startFrame = 'Start frame must be at least 1';
    }
    if (endFrame > config.totalFrames) {
      newErrors.endFrame = `End frame cannot exceed ${config.totalFrames}`;
    }
    if (startFrame >= endFrame) {
      newErrors.frameRange = 'Start frame must be less than end frame';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const job: SimulationJob = {
      id: mode === 'edit' && editingJob ? editingJob.id : `job-${Date.now()}`,
      name: jobName.trim(),
      startFrame,
      endFrame,
      step,
      config: jobConfig,
      enabled: true,
    };

    if (mode === 'create') {
      addJob(job);
    } else {
      updateJob(job.id, job);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setJobName('');
    setStep('hydraulicErosion');
    setStartFrame(1);
    setEndFrame(config.totalFrames);
    setSelectedTemplateId('');
    setJobConfig({});
    setErrors({});
  };

  const templates = getTemplatesByStep(step);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-semibold text-zinc-100">
              {mode === 'create' ? 'Create Job' : 'Edit Job'}
            </Dialog.Title>
            <Dialog.Close className="text-zinc-400 hover:text-zinc-100">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            {/* Job Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Job Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="e.g., Initial Erosion"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
              />
              {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name}</p>}
            </div>

            {/* Step Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Erosion Type <span className="text-red-400">*</span>
              </label>
              <select
                value={step}
                onChange={(e) => {
                  const newStep = e.target.value as 'hydraulicErosion' | 'thermalErosion';
                  setStep(newStep);
                  const defaultTemplate = getDefaultTemplate(newStep);
                  setSelectedTemplateId(defaultTemplate.id);
                }}
                disabled={mode === 'edit'}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="hydraulicErosion">Hydraulic Erosion</option>
                <option value="thermalErosion">Thermal Erosion</option>
              </select>
            </div>

            {/* Frame Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Start Frame <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={config.totalFrames}
                  value={startFrame}
                  onChange={(e) => setStartFrame(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
                {errors.startFrame && <p className="text-sm text-red-400 mt-1">{errors.startFrame}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  End Frame <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={config.totalFrames}
                  value={endFrame}
                  onChange={(e) => setEndFrame(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
                {errors.endFrame && <p className="text-sm text-red-400 mt-1">{errors.endFrame}</p>}
              </div>
            </div>
            {errors.frameRange && <p className="text-sm text-red-400 -mt-2">{errors.frameRange}</p>}
            <p className="text-sm text-zinc-400">
              Range: {endFrame - startFrame + 1} frames
            </p>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Configuration Preset
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Step-specific Parameters */}
            <div className="border border-zinc-700 rounded p-4 bg-zinc-800/50">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">
                {step === 'hydraulicErosion' ? 'Hydraulic Erosion Parameters' : 'Thermal Erosion Parameters'}
              </h3>
              {step === 'hydraulicErosion' && jobConfig.hydraulicErosion && (
                <HydraulicParams config={jobConfig.hydraulicErosion} onChange={(newConfig) => setJobConfig({ hydraulicErosion: newConfig })} />
              )}
              {step === 'thermalErosion' && jobConfig.thermalErosion && (
                <ThermalParams config={jobConfig.thermalErosion} onChange={(newConfig) => setJobConfig({ thermalErosion: newConfig })} />
              )}
            </div>

            {/* Info Banner */}
            <div className="flex gap-2 p-3 bg-blue-900/20 border border-blue-700/50 rounded text-sm text-blue-300">
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                {mode === 'create'
                  ? 'This job will be added to the timeline. Ensure all frames are covered to enable simulation.'
                  : 'Changes will update the job configuration on the timeline.'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              {mode === 'create' ? 'Create Job' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Hydraulic Erosion Parameters Component
function HydraulicParams({
  config,
  onChange,
}: {
  config: NonNullable<JobConfig['hydraulicErosion']>;
  onChange: (config: NonNullable<JobConfig['hydraulicErosion']>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ParamInput
        label="Particles"
        value={config.numParticles}
        onChange={(v) => onChange({ ...config, numParticles: v })}
        min={1000}
        max={200000}
        step={1000}
      />
      <ParamInput
        label="Erosion Rate"
        value={config.erosionRate}
        onChange={(v) => onChange({ ...config, erosionRate: v })}
        min={0}
        max={1}
        step={0.01}
      />
      <ParamInput
        label="Deposition Rate"
        value={config.depositionRate}
        onChange={(v) => onChange({ ...config, depositionRate: v })}
        min={0}
        max={1}
        step={0.01}
      />
      <ParamInput
        label="Sediment Capacity"
        value={config.sedimentCapacity}
        onChange={(v) => onChange({ ...config, sedimentCapacity: v })}
        min={0}
        max={20}
        step={0.1}
      />
      <ParamInput
        label="Min Slope"
        value={config.minSlope}
        onChange={(v) => onChange({ ...config, minSlope: v })}
        min={0}
        max={0.1}
        step={0.001}
      />
      <ParamInput
        label="Inertia"
        value={config.inertia}
        onChange={(v) => onChange({ ...config, inertia: v })}
        min={0}
        max={1}
        step={0.01}
      />
      <ParamInput
        label="Evaporation Rate"
        value={config.evaporationRate}
        onChange={(v) => onChange({ ...config, evaporationRate: v })}
        min={0}
        max={1}
        step={0.01}
      />
      <ParamInput
        label="Gravity"
        value={config.gravity}
        onChange={(v) => onChange({ ...config, gravity: v })}
        min={0}
        max={10}
        step={0.1}
      />
      <ParamInput
        label="Erosion Radius"
        value={config.erosionRadius}
        onChange={(v) => onChange({ ...config, erosionRadius: v })}
        min={1}
        max={10}
        step={1}
      />
    </div>
  );
}

// Thermal Erosion Parameters Component
function ThermalParams({
  config,
  onChange,
}: {
  config: NonNullable<JobConfig['thermalErosion']>;
  onChange: (config: NonNullable<JobConfig['thermalErosion']>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ParamInput
        label="Talus Angle (°)"
        value={config.talusAngle}
        onChange={(v) => onChange({ ...config, talusAngle: v })}
        min={0}
        max={90}
        step={1}
      />
      <ParamInput
        label="Transfer Rate"
        value={config.transferRate}
        onChange={(v) => onChange({ ...config, transferRate: v })}
        min={0}
        max={1}
        step={0.01}
      />
    </div>
  );
}

// Parameter Input Component
function ParamInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">
        {label}: <span className="text-zinc-300 font-mono">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}
