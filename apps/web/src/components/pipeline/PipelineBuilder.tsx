import { usePipeline, type ModelingConfig } from '../../contexts/PipelineContext';
import { Sliders } from 'lucide-react';

export default function PipelineBuilder() {
  const { config, updateStep0, updateTotalFrames } = usePipeline();

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
              <label className="block text-xs text-zinc-400 mb-1">Seed</label>
              <input
                type="number"
                value={config.step0.seed || 12345}
                onChange={(e) => handleParameterChange('seed', parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Frequency: {config.step0.frequency || 0.05}
              </label>
              <input
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
              <label className="block text-xs text-zinc-400 mb-1">
                Amplitude: {config.step0.amplitude || 50}
              </label>
              <input
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
                  <label className="block text-xs text-zinc-400 mb-1">
                    Octaves: {config.step0.octaves || 4}
                  </label>
                  <input
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
                  <label className="block text-xs text-zinc-400 mb-1">
                    Persistence: {config.step0.persistence || 0.5}
                  </label>
                  <input
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
                  <label className="block text-xs text-zinc-400 mb-1">
                    Lacunarity: {config.step0.lacunarity || 2.0}
                  </label>
                  <input
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
              <label className="block text-xs text-zinc-400 mb-1">
                Amplitude: {config.step0.amplitude || 50}
              </label>
              <input
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
            <label className="block text-xs text-zinc-400 mb-2">Modeling Method</label>
            <select
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
        </div>
      </div>

      {/* Total Frames */}
      <div className="pt-4 border-t border-zinc-700">
        <label className="block text-xs text-zinc-400 mb-2">Total Frames</label>
        <input
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
