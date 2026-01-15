import { type JobConfig } from '../contexts/PipelineContext';

export interface JobTemplate {
  id: string;
  name: string;
  step: 'hydraulicErosion' | 'thermalErosion';
  config: JobConfig;
  description: string;
  source: 'local' | 'server';
}

// Local presets for hydraulic erosion
export const HYDRAULIC_TEMPLATES: JobTemplate[] = [
  {
    id: 'hydraulic-heavy',
    name: 'Heavy Erosion',
    step: 'hydraulicErosion',
    description: 'Aggressive erosion with high particle count and erosion rate',
    source: 'local',
    config: {
      hydraulicErosion: {
        numParticles: 100000,
        erosionRate: 0.8,
        depositionRate: 0.2,
        sedimentCapacity: 8.0,
        minSlope: 0.001,
        inertia: 0.3,
        evaporationRate: 0.02,
        gravity: 4.0,
        erosionRadius: 3,
      },
    },
  },
  {
    id: 'hydraulic-light',
    name: 'Light Smoothing',
    step: 'hydraulicErosion',
    description: 'Gentle erosion with lower particle count and erosion rate',
    source: 'local',
    config: {
      hydraulicErosion: {
        numParticles: 30000,
        erosionRate: 0.3,
        depositionRate: 0.5,
        sedimentCapacity: 4.0,
        minSlope: 0.01,
        inertia: 0.1,
        evaporationRate: 0.05,
        gravity: 4.0,
        erosionRadius: 2,
      },
    },
  },
  {
    id: 'hydraulic-default',
    name: 'Balanced Erosion',
    step: 'hydraulicErosion',
    description: 'Default balanced parameters for general use',
    source: 'local',
    config: {
      hydraulicErosion: {
        numParticles: 50000,
        erosionRate: 0.5,
        depositionRate: 0.3,
        sedimentCapacity: 6.0,
        minSlope: 0.005,
        inertia: 0.2,
        evaporationRate: 0.03,
        gravity: 4.0,
        erosionRadius: 2,
      },
    },
  },
];

// Local presets for thermal erosion
export const THERMAL_TEMPLATES: JobTemplate[] = [
  {
    id: 'thermal-aggressive',
    name: 'Aggressive Collapse',
    step: 'thermalErosion',
    description: 'High talus angle with fast material transfer',
    source: 'local',
    config: {
      thermalErosion: {
        talusAngle: 45,
        transferRate: 0.8,
      },
    },
  },
  {
    id: 'thermal-gentle',
    name: 'Gentle Settling',
    step: 'thermalErosion',
    description: 'Low talus angle with slow material transfer',
    source: 'local',
    config: {
      thermalErosion: {
        talusAngle: 30,
        transferRate: 0.3,
      },
    },
  },
  {
    id: 'thermal-default',
    name: 'Balanced Thermal',
    step: 'thermalErosion',
    description: 'Default balanced parameters for thermal erosion',
    source: 'local',
    config: {
      thermalErosion: {
        talusAngle: 35,
        transferRate: 0.5,
      },
    },
  },
];

export const ALL_TEMPLATES = [...HYDRAULIC_TEMPLATES, ...THERMAL_TEMPLATES];

export function getTemplatesByStep(step: 'hydraulicErosion' | 'thermalErosion'): JobTemplate[] {
  return step === 'hydraulicErosion' ? HYDRAULIC_TEMPLATES : THERMAL_TEMPLATES;
}

export function getTemplateById(id: string): JobTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultTemplate(step: 'hydraulicErosion' | 'thermalErosion'): JobTemplate {
  const templates = getTemplatesByStep(step);
  return templates.find((t) => t.id.includes('default')) || templates[0];
}
