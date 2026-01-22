import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import apiConfig from '../config/api';
import { logger } from '../utils/logger';

const pipelineLogger = logger.withContext('PipelineContext');

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
  width: number;
  height: number;
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
  updateDimensions: (width: number, height: number) => void;
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
  sessionId: string | null;
  setSessionId: (sessionId: string | null) => void;
  executeSimulation: () => Promise<void>;
  stopSimulation: () => void;
  clearCache: () => void;
  isSimulating: boolean;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

const DEFAULT_CONFIG: PipelineConfig = {
  step0: {
    method: 'Perlin',
    seed: 42, // Fixed seed for consistent testing (was 12345)
    frequency: 0.05,
    amplitude: 50,
  },
  width: 256,
  height: 256,
  totalFrames: 10,
  jobs: [],
};

const STORAGE_KEY = 'terrainsim-pipeline-config';

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PipelineConfig>(() => {
    // Load last-used configuration from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old configs that don't have valid width/height
        const needsMigration =
          typeof parsed.width !== 'number' ||
          typeof parsed.height !== 'number' ||
          parsed.width <= 0 ||
          parsed.height <= 0 ||
          !Number.isFinite(parsed.width) ||
          !Number.isFinite(parsed.height);

        if (needsMigration) {
          pipelineLogger.info('Migrating old config to include valid dimensions');
          return {
            ...parsed,
            width: DEFAULT_CONFIG.width,
            height: DEFAULT_CONFIG.height,
          };
        }
        return parsed;
      } catch (e) {
        pipelineLogger.error('Failed to parse stored config:', e);
      }
    }
    return DEFAULT_CONFIG;
  });

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [heightmapCache, setHeightmapCache] = useState<Map<number, Float32Array>>(new Map());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [shouldStopSimulation, setShouldStopSimulation] = useState(false);

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

  const updateDimensions = (width: number, height: number) => {
    setConfig({ ...config, width, height });
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
    // Create a new Map to trigger React re-render
    const newCache = new Map(heightmapCache);
    newCache.set(frame, heightmap);
    setHeightmapCache(newCache);
    pipelineLogger.trace('Heightmap cache updated', {
      frame,
      totalCachedFrames: newCache.size,
      heightmapLength: heightmap.length,
    });
  };

  const executeSimulation = async () => {
    if (!sessionId) {
      pipelineLogger.error('No session ID - generate terrain first');
      return;
    }

    if (config.jobs.length === 0) {
      pipelineLogger.warn('No jobs configured - simulation will just copy terrain across frames');
    }

    setIsSimulating(true);
    setShouldStopSimulation(false);

    try {
      // Execute frame-by-frame for frames 1 through totalFrames (frame 0 is input)
      for (let frame = 1; frame <= config.totalFrames; frame++) {
        // Check if user requested stop
        if (shouldStopSimulation) {
          pipelineLogger.info('Simulation stopped by user at frame', { frame });
          break;
        }

        const response = await fetch(apiConfig.endpoints.simulate.execute, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            frame,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(`Frame ${frame} execution failed: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();

        // Store heightmap in cache
        if (data.terrain) {
          const heightmap = new Float32Array(data.terrain);
          setHeightmapForFrame(frame, heightmap);
          setCurrentFrame(frame); // Update viewer to show this frame
          pipelineLogger.info(`Frame ${frame} complete`, { statistics: data.statistics });
        }

        // Small delay for visualization
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (!shouldStopSimulation) {
        pipelineLogger.info('Simulation complete!');
      }
    } catch (error) {
      pipelineLogger.error('Simulation error:', error);
    } finally {
      setIsSimulating(false);
      setShouldStopSimulation(false);

      // Clean up server session
      if (sessionId) {
        try {
          await fetch(apiConfig.endpoints.simulate.session(sessionId), {
            method: 'DELETE',
          });
          pipelineLogger.info('Server session cleaned up');
        } catch (error) {
          pipelineLogger.error('Failed to clean up server session:', error);
        }
      }
    }
  };

  const stopSimulation = () => {
    pipelineLogger.info('Stop simulation requested');
    setShouldStopSimulation(true);
  };

  const clearCache = () => {
    pipelineLogger.info('Clearing heightmap cache (preserving frame 0)');
    // Preserve frame 0 (original terrain) when clearing cache
    const frame0 = heightmapCache.get(0);
    const newCache = new Map<number, Float32Array>();
    if (frame0) {
      newCache.set(0, frame0);
    }
    setHeightmapCache(newCache);
    setCurrentFrame(0); // Return to original terrain
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
        updateDimensions,
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
        sessionId,
        setSessionId,
        executeSimulation,
        stopSimulation,
        clearCache,
        isSimulating,
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
