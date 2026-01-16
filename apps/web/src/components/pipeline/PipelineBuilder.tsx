import { usePipeline, type ModelingConfig } from '../../contexts/PipelineContext';
import { Sliders, Wand2 } from 'lucide-react';
import { useState } from 'react';
import apiConfig from '../../config/api';
import { logger } from '../../utils/logger';

const builderLogger = logger.withContext('PipelineBuilder');

export default function PipelineBuilder() {
  const { config, updateStep0, updateTotalFrames, setHeightmapForFrame, setCurrentFrame, setSessionId } = usePipeline();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTerrain = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Convert method to lowercase for backend API
      const payload = {
        ...config.step0,
        method: config.step0.method.toLowerCase() as 'perlin' | 'fbm',
        width: 256,
        height: 256,
      };

      const response = await fetch(apiConfig.endpoints.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Server error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.data) {
        // Convert heightmap array to Float32Array and store in cache at frame 0 (input model)
        const heightmapArray = new Float32Array(data.data);
        setHeightmapForFrame(0, heightmapArray);

        // Create simulation session with this terrain as initial model
        const sessionResponse = await fetch(apiConfig.endpoints.simulate.create, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              ...config,
              width: 256,
              height: 256,
            },
            initialTerrain: data.data, // Pass the generated terrain
          }),
        });

        if (!sessionResponse.ok) {
          const sessionError = await sessionResponse.json().catch(() => ({ error: sessionResponse.statusText }));
          throw new Error(`Session creation failed: ${sessionError.error || sessionResponse.statusText}`);
        }

        const sessionData = await sessionResponse.json();
        setSessionId(sessionData.sessionId); // Store session ID in context

        setCurrentFrame(0); // Switch to frame 0 to display generated terrain (input model)
        builderLogger.info('Terrain generated successfully', { statistics: data.statistics, sessionId: sessionData.sessionId });
      } else {
        throw new Error('No heightmap data received');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate terrain';
      setError(errorMessage);
      builderLogger.error('Error generating terrain:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMethodChange = (method: ModelingConfig['method']) => {
    updateStep0({ ...config.step0, method });
  };

  const handleParameterChange = (key: keyof ModelingConfig, value: number) => {
    updateStep0({ ...config.step0, [key]: value });
  };

  const renderParameters = () => {
    const { method } = config.step0;

    switch (method) {
      case 'Perlin':
      case 'FBM':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="seed-input" className="block text-xs text-zinc-400 mb-1">Seed</label>
              <input
                id="seed-input"
                type="number"
                value={config.step0.seed || 12345}
                onChange={(e) => handleParameterChange('seed', parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="frequency-slider" className="block text-xs text-zinc-400 mb-1">
                Frequency: {config.step0.frequency || 0.05}
              </label>
              <input
                id="frequency-slider"
                type="range"
                min="0.01"
                max="0.2"
                step="0.01"
                value={config.step0.frequency || 0.05}
                onChange={(e) => handleParameterChange('frequency', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="amplitude-slider" className="block text-xs text-zinc-400 mb-1">
                Amplitude: {config.step0.amplitude || 50}
              </label>
              <input
                id="amplitude-slider"
                type="range"
                min="10"
                max="100"
                step="5"
                value={config.step0.amplitude || 50}
                onChange={(e) => handleParameterChange('amplitude', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            {method === 'FBM' && (
              <>
                <div>
                  <label htmlFor="octaves-slider" className="block text-xs text-zinc-400 mb-1">
                    Octaves: {config.step0.octaves || 4}
                  </label>
                  <input
                    id="octaves-slider"
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={config.step0.octaves || 4}
                    onChange={(e) => handleParameterChange('octaves', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="persistence-slider" className="block text-xs text-zinc-400 mb-1">
                    Persistence: {config.step0.persistence || 0.5}
                  </label>
                  <input
                    id="persistence-slider"
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={config.step0.persistence || 0.5}
                    onChange={(e) => handleParameterChange('persistence', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="lacunarity-slider" className="block text-xs text-zinc-400 mb-1">
                    Lacunarity: {config.step0.lacunarity || 2.0}
                  </label>
                  <input
                    id="lacunarity-slider"
                    type="range"
                    min="1"
                    max="4"
                    step="0.1"
                    value={config.step0.lacunarity || 2.0}
                    onChange={(e) => handleParameterChange('lacunarity', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>
        );
      case 'SemiSphere':
      case 'Cone':
      case 'Sigmoid':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="amplitude-slider-geo" className="block text-xs text-zinc-400 mb-1">
                Amplitude: {config.step0.amplitude || 50}
              </label>
              <input
                id="amplitude-slider-geo"
                type="range"
                min="10"
                max="100"
                step="5"
                value={config.step0.amplitude || 50}
                onChange={(e) => handleParameterChange('amplitude', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Step 0 Configuration */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sliders size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold">Step 0: Initial Terrain</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="modeling-method-select" className="block text-xs text-zinc-400 mb-2">Modeling Method</label>
            <select
              id="modeling-method-select"
              value={config.step0.method}
              onChange={(e) => handleMethodChange(e.target.value as ModelingConfig['method'])}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              <option value="Perlin">Perlin Noise</option>
              <option value="FBM">Fractional Brownian Motion</option>
              <option value="SemiSphere">Semi-Sphere</option>
              <option value="Cone">Cone</option>
              <option value="Sigmoid">Sigmoid</option>
            </select>
          </div>

          {renderParameters()}

          {/* Generate Button */}
          <div className="mt-6">
            <button
              onClick={handleGenerateTerrain}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-colors"
            >
              <Wand2 size={18} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? 'Generating...' : 'Generate Terrain'}
            </button>
            {error && (
              <p className="text-xs text-red-400 mt-2">Error: {error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Total Frames */}
      <div className="pt-4 border-t border-zinc-700">
        <label htmlFor="total-frames-input" className="block text-xs text-zinc-400 mb-2">Total Frames</label>
        <input
          id="total-frames-input"
          type="number"
          min="1"
          max="1000"
          value={config.totalFrames}
          onChange={(e) => updateTotalFrames(parseInt(e.target.value) || 1)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
        />
        <p className="text-xs text-zinc-500 mt-1">
          Range: 1 to {config.totalFrames}
        </p>
      </div>

      {/* Available Steps (Future) */}
      <div className="pt-4 border-t border-zinc-700">
        <h3 className="text-sm font-semibold mb-3">Available Steps</h3>
        <div className="space-y-2">
          <div className="p-3 bg-zinc-800 border border-zinc-700 rounded text-sm opacity-50">
            <div className="font-medium">Hydraulic Erosion</div>
            <div className="text-xs text-zinc-400 mt-1">
              Create jobs in Job Manager →
            </div>
          </div>
          <div className="p-3 bg-zinc-800 border border-zinc-700 rounded text-sm opacity-50">
            <div className="font-medium">Thermal Erosion</div>
            <div className="text-xs text-zinc-400 mt-1">
              Coming in Iteration 4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
