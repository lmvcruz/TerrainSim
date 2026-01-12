import { useState } from 'react'
import './ErosionParametersPanel.css'

export type { ErosionParameters }

interface ErosionParameters {
  numParticles: number
  inertia: number
  sedimentCapacityFactor: number
  minSedimentCapacity: number
  erodeSpeed: number
  depositSpeed: number
  evaporateSpeed: number
  gravity: number
  maxDropletLifetime: number
  initialWaterVolume: number
  initialSpeed: number
  // Animation control
  animationSpeed: number // Multiplier: 0.5x, 1x, 2x, 5x
  particlesPerFrame: number
}

interface ErosionParametersPanelProps {
  onSimulate?: (parameters: ErosionParameters) => void
  onStop?: () => void
  loading?: boolean
  error?: string | null
  progress?: {
    particlesSimulated: number
    totalParticles: number
  } | null
}

const DEFAULT_PARAMETERS: ErosionParameters = {
  numParticles: 5000,
  inertia: 0.05,
  sedimentCapacityFactor: 4.0,
  minSedimentCapacity: 0.01,
  erodeSpeed: 0.3,
  depositSpeed: 0.3,
  evaporateSpeed: 0.01,
  gravity: 4.0,
  maxDropletLifetime: 30,
  initialWaterVolume: 1.0,
  initialSpeed: 1.0,
  animationSpeed: 1.0,
  particlesPerFrame: 50,
}

/**
 * ErosionParametersPanel provides UI controls for hydraulic erosion simulation.
 *
 * Features:
 * - Number of particles slider
 * - Key erosion parameters (inertia, erosion speed, deposit speed)
 * - Start/Stop simulation button
 * - Real-time progress display
 * - Collapsible interface
 */
export function ErosionParametersPanel({
  onSimulate,
  onStop,
  loading = false,
  error = null,
  progress = null,
}: ErosionParametersPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [parameters, setParameters] = useState<ErosionParameters>(DEFAULT_PARAMETERS)

  const handleSimulate = () => {
    if (loading) {
      onStop?.()
    } else {
      onSimulate?.(parameters)
    }
  }

  const progressPercent = progress
    ? (progress.particlesSimulated / progress.totalParticles) * 100
    : 0

  return (
    <div className={`erosion-parameters-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <h2>Erosion Simulation</h2>
        <button
          className="collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '▲' : '▼'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Basic Parameters */}
          <div className="parameter-group">
            <label htmlFor="num-particles-slider">
              Particles
              <span className="parameter-value">{parameters.numParticles.toLocaleString()}</span>
            </label>
            <input
              id="num-particles-slider"
              type="range"
              min="100"
              max="50000"
              step="100"
              value={parameters.numParticles}
              onChange={(e) =>
                setParameters((prev) => ({ ...prev, numParticles: Number(e.target.value) }))
              }
              disabled={loading}
            />
            <p className="parameter-description">
              Number of water droplets to simulate (more = slower but smoother)
            </p>
          </div>

          <div className="parameter-group">
            <label htmlFor="erode-speed-slider">
              Erosion Strength
              <span className="parameter-value">{parameters.erodeSpeed.toFixed(2)}</span>
            </label>
            <input
              id="erode-speed-slider"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={parameters.erodeSpeed}
              onChange={(e) =>
                setParameters((prev) => ({ ...prev, erodeSpeed: Number(e.target.value) }))
              }
              disabled={loading}
            />
            <p className="parameter-description">
              How quickly water erodes terrain (higher = more erosion)
            </p>
          </div>

          <div className="parameter-group">
            <label htmlFor="deposit-speed-slider">
              Deposition Strength
              <span className="parameter-value">{parameters.depositSpeed.toFixed(2)}</span>
            </label>
            <input
              id="deposit-speed-slider"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={parameters.depositSpeed}
              onChange={(e) =>
                setParameters((prev) => ({ ...prev, depositSpeed: Number(e.target.value) }))
              }
              disabled={loading}
            />
            <p className="parameter-description">
              How quickly water deposits sediment (higher = more deposition)
            </p>
          </div>

          {/* Advanced Parameters Toggle */}
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▼' : '▶'} Advanced Parameters
          </button>

          {showAdvanced && (
            <>
              <div className="parameter-group">
                <label htmlFor="animation-speed-slider">
                  Animation Speed
                  <span className="parameter-value">{parameters.animationSpeed}x</span>
                </label>
                <input
                  id="animation-speed-slider"
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={parameters.animationSpeed}
                  onChange={(e) =>
                    setParameters((prev) => ({ ...prev, animationSpeed: Number(e.target.value) }))
                  }
                  disabled={loading}
                />
                <p className="parameter-description">
                  Simulation playback speed (0.5x = slower, 5x = faster)
                </p>
              </div>

              <div className="parameter-group">
                <label htmlFor="particles-per-frame-slider">
                  Particles Per Frame
                  <span className="parameter-value">{parameters.particlesPerFrame}</span>
                </label>
                <input
                  id="particles-per-frame-slider"
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={parameters.particlesPerFrame}
                  onChange={(e) =>
                    setParameters((prev) => ({ ...prev, particlesPerFrame: Number(e.target.value) }))
                  }
                  disabled={loading}
                />
                <p className="parameter-description">
                  Erosion detail per frame (lower = smoother animation, higher = faster)
                </p>
              </div>

              <div className="parameter-group">
                <label htmlFor="inertia-slider">
                  Inertia
                  <span className="parameter-value">{parameters.inertia.toFixed(3)}</span>
                </label>
                <input
                  id="inertia-slider"
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.01"
                  value={parameters.inertia}
                  onChange={(e) =>
                    setParameters((prev) => ({ ...prev, inertia: Number(e.target.value) }))
                  }
                  disabled={loading}
                />
                <p className="parameter-description">
                  Particle momentum (0 = instant direction change, higher = smoother paths)
                </p>
              </div>

              <div className="parameter-group">
                <label htmlFor="capacity-slider">
                  Sediment Capacity
                  <span className="parameter-value">{parameters.sedimentCapacityFactor.toFixed(1)}</span>
                </label>
                <input
                  id="capacity-slider"
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={parameters.sedimentCapacityFactor}
                  onChange={(e) =>
                    setParameters((prev) => ({
                      ...prev,
                      sedimentCapacityFactor: Number(e.target.value),
                    }))
                  }
                  disabled={loading}
                />
                <p className="parameter-description">
                  Maximum sediment a droplet can carry (higher = more erosion)
                </p>
              </div>

              <div className="parameter-group">
                <label htmlFor="evaporate-slider">
                  Evaporation Rate
                  <span className="parameter-value">{parameters.evaporateSpeed.toFixed(3)}</span>
                </label>
                <input
                  id="evaporate-slider"
                  type="range"
                  min="0.001"
                  max="0.1"
                  step="0.001"
                  value={parameters.evaporateSpeed}
                  onChange={(e) =>
                    setParameters((prev) => ({ ...prev, evaporateSpeed: Number(e.target.value) }))
                  }
                  disabled={loading}
                />
                <p className="parameter-description">
                  How quickly water evaporates (higher = shorter droplet lifetime)
                </p>
              </div>

              <div className="parameter-group">
                <label htmlFor="gravity-slider">
                  Gravity
                  <span className="parameter-value">{parameters.gravity.toFixed(1)}</span>
                </label>
                <input
                  id="gravity-slider"
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={parameters.gravity}
                  onChange={(e) =>
                    setParameters((prev) => ({ ...prev, gravity: Number(e.target.value) }))
                  }
                  disabled={loading}
                />
                <p className="parameter-description">
                  Gravitational acceleration (higher = faster water flow)
                </p>
              </div>
            </>
          )}

          {/* Progress Bar */}
          {loading && progress && (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress-text">
                {progress.particlesSimulated.toLocaleString()} / {progress.totalParticles.toLocaleString()} particles
                ({progressPercent.toFixed(1)}%)
              </div>
            </div>
          )}

          {/* Simulate Button */}
          <button
            className={`simulate-button ${loading ? 'stop' : ''}`}
            onClick={handleSimulate}
          >
            {loading ? '⏸ Stop Simulation' : '▶ Start Simulation'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="api-error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}
