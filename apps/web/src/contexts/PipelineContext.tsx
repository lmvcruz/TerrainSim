import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface ModelingConfig {
  method: 'Perlin' | 'FBM' | 'SemiSphere' | 'Cone' | 'Sigmoid';
  seed?: number;
  frequency?: number;
  amplitude?: number;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
}

export interface JobConfig {
  hydraulicErosion?: {
    numParticles: number;
    erosionRate: number;
    depositionRate: number;
    sedimentCapacity: number;
    minSlope: number;
    inertia: number;
    evaporationRate: number;
    gravity: number;
    erosionRadius: number;
  };
  thermalErosion?: {
    talusAngle: number;
    transferRate: number;
  };
}

export interface SimulationJob {
  id: string;
  name: string;
  startFrame: number;
  endFrame: number;
  step: 'hydraulicErosion' | 'thermalErosion';
  config: JobConfig;
  enabled: boolean;
}

export interface PipelineConfig {
  step0: ModelingConfig;
  totalFrames: number;
  jobs: SimulationJob[];
}

export interface ValidationResult {
  isValid: boolean;
  uncoveredFrames: number[];
  warnings: string[];
}

interface PipelineContextType {
  config: PipelineConfig;
  setConfig: (config: PipelineConfig) => void;
  updateStep0: (step0: ModelingConfig) => void;
  updateTotalFrames: (totalFrames: number) => void;
  addJob: (job: SimulationJob) => void;
  updateJob: (id: string, job: Partial<SimulationJob>) => void;
  deleteJob: (id: string) => void;
  toggleJobEnabled: (id: string) => void;
  validation: ValidationResult | null;
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  heightmapCache: Map<number, Float32Array>;
  setHeightmapForFrame: (frame: number, heightmap: Float32Array) => void;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

const DEFAULT_CONFIG: PipelineConfig = {
  step0: {
    method: 'Perlin',
    seed: 12345,
    frequency: 0.05,
    amplitude: 50,
  },
  totalFrames: 100,
  jobs: [],
};

const STORAGE_KEY = 'terrainsim-pipeline-config';

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PipelineConfig>(() => {
    // Load last-used configuration from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored config:', e);
      }
    }
    return DEFAULT_CONFIG;
  });

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [heightmapCache] = useState<Map<number, Float32Array>>(new Map());

  // Persist config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const setConfig = (newConfig: PipelineConfig) => {
    setConfigState(newConfig);
    // Validate on config change
    validateConfig(newConfig);
  };

  const updateStep0 = (step0: ModelingConfig) => {
    setConfig({ ...config, step0 });
  };

  const updateTotalFrames = (totalFrames: number) => {
    setConfig({ ...config, totalFrames });
  };

  const addJob = (job: SimulationJob) => {
    setConfig({ ...config, jobs: [...config.jobs, job] });
  };

  const updateJob = (id: string, updates: Partial<SimulationJob>) => {
    setConfig({
      ...config,
      jobs: config.jobs.map((job) => (job.id === id ? { ...job, ...updates } : job)),
    });
  };

  const deleteJob = (id: string) => {
    setConfig({
      ...config,
      jobs: config.jobs.filter((job) => job.id !== id),
    });
  };

  const toggleJobEnabled = (id: string) => {
    setConfig({
      ...config,
      jobs: config.jobs.map((job) =>
        job.id === id ? { ...job, enabled: !job.enabled } : job
      ),
    });
  };

  const validateConfig = (cfg: PipelineConfig) => {
    // Simple client-side validation (will also call API later)
    const uncoveredFrames: number[] = [];
    const coveredFrames = new Set<number>();

    // Check which frames are covered by enabled jobs
    cfg.jobs.forEach((job) => {
      if (job.enabled) {
        for (let i = job.startFrame; i <= job.endFrame; i++) {
          coveredFrames.add(i);
        }
      }
    });

    // Find gaps
    for (let i = 1; i <= cfg.totalFrames; i++) {
      if (!coveredFrames.has(i)) {
        uncoveredFrames.push(i);
      }
    }

    const warnings: string[] = [];
    const isValid = uncoveredFrames.length === 0;

    if (!isValid) {
      warnings.push(`Missing coverage for ${uncoveredFrames.length} frames`);
    }

    setValidation({ isValid, uncoveredFrames, warnings });
  };

  const setHeightmapForFrame = (frame: number, heightmap: Float32Array) => {
    heightmapCache.set(frame, heightmap);
  };

  // Initial validation
  useEffect(() => {
    validateConfig(config);
  }, [config]);

  return (
    <PipelineContext.Provider
      value={{
        config,
        setConfig,
        updateStep0,
        updateTotalFrames,
        addJob,
        updateJob,
        deleteJob,
        toggleJobEnabled,
        validation,
        currentFrame,
        setCurrentFrame,
        heightmapCache,
        setHeightmapForFrame,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within PipelineProvider');
  }
  return context;
}
