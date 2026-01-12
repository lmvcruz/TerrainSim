import { useState } from 'react'
import type { ChangeEvent } from 'react'
import './NoiseParametersPanel.css'

export type { NoiseParameters }

interface NoiseParameters {
  seed: number
  frequency: number
  amplitude: number
  octaves: number
}

interface NoiseParametersPanelProps {
  onGenerate?: (parameters: NoiseParameters) => void
  initialParameters?: Partial<NoiseParameters>
  loading?: boolean
  error?: string | null
}

const DEFAULT_PARAMETERS: NoiseParameters = {
  seed: 42,
  frequency: 0.05,
  amplitude: 50,
  octaves: 4,
}

/**
 * NoiseParametersPanel provides UI controls for terrain noise generation.
 *
 * Features:
 * - Seed input field with validation (integer values only)
 * - Sliders for frequency, amplitude, and octaves
 * - Generate button to trigger terrain creation
 * - Real-time parameter display
 * - Collapsible interface
 */
export function NoiseParametersPanel({
  onGenerate,
  initialParameters = {},
  loading = false,
  error = null,
}: NoiseParametersPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [parameters, setParameters] = useState<NoiseParameters>({
    ...DEFAULT_PARAMETERS,
    ...initialParameters,
  })

  const [seedInput, setSeedInput] = useState<string>(
    (initialParameters.seed ?? DEFAULT_PARAMETERS.seed).toString()
  )
  const [seedError, setSeedError] = useState<string>('')

  /**
   * Validates and updates the seed value.
   * Only accepts integer values (positive or negative).
   */
  const handleSeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSeedInput(value)

    // Allow empty input (user is typing)
    if (value === '' || value === '-') {
      setSeedError('')
      return
    }

    // Validate integer format
    const numValue = Number(value)
    if (Number.isNaN(numValue) || !Number.isInteger(numValue)) {
      setSeedError('Seed must be an integer')
      return
    }

    // Valid integer
    setSeedError('')
    setParameters((prev) => ({ ...prev, seed: numValue }))
  }

  /**
   * Handles seed input blur - restores last valid value if input is invalid
   */
  const handleSeedBlur = () => {
    if (seedInput === '' || seedInput === '-' || seedError) {
      // Restore last valid seed value
      setSeedInput(parameters.seed.toString())
      setSeedError('')
    }
  }

  const handleGenerate = () => {
    if (seedError || seedInput === '' || seedInput === '-') {
      setSeedError('Please enter a valid integer seed')
      return
    }

    onGenerate?.(parameters)
  }

  return (
    <div className={`noise-parameters-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <h2>Noise Parameters</h2>
        <button
          className="collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? '▲' : '▼'}
        </button>
      </div>

      {!isCollapsed && (
        <>
      {/* Seed Input */}
      <div className="parameter-group">
        <label htmlFor="seed-input">
          Seed
          <span className="parameter-value">{parameters.seed}</span>
        </label>
        <input
          id="seed-input"
          type="text"
          value={seedInput}
          onChange={handleSeedChange}
          onBlur={handleSeedBlur}
          className={seedError ? 'error' : ''}
          placeholder="Enter integer seed"
        />
        {seedError && <span className="error-message">{seedError}</span>}
        <p className="parameter-description">
          Random seed for reproducible terrain generation
        </p>
      </div>

      {/* Frequency Slider */}
      <div className="parameter-group">
        <label htmlFor="frequency-slider">
          Frequency
          <span className="parameter-value">{parameters.frequency.toFixed(3)}</span>
        </label>
        <input
          id="frequency-slider"
          type="range"
          min="0.001"
          max="0.2"
          step="0.001"
          value={parameters.frequency}
          onChange={(e) =>
            setParameters((prev) => ({ ...prev, frequency: Number(e.target.value) }))
          }
        />
        <p className="parameter-description">
          Controls terrain feature size (higher = more detail)
        </p>
      </div>

      {/* Amplitude Slider */}
      <div className="parameter-group">
        <label htmlFor="amplitude-slider">
          Amplitude
          <span className="parameter-value">{parameters.amplitude.toFixed(1)}</span>
        </label>
        <input
          id="amplitude-slider"
          type="range"
          min="1"
          max="100"
          step="1"
          value={parameters.amplitude}
          onChange={(e) =>
            setParameters((prev) => ({ ...prev, amplitude: Number(e.target.value) }))
          }
        />
        <p className="parameter-description">
          Maximum height of terrain features
        </p>
      </div>

      {/* Octaves Slider */}
      <div className="parameter-group">
        <label htmlFor="octaves-slider">
          Octaves
          <span className="parameter-value">{parameters.octaves}</span>
        </label>
        <input
          id="octaves-slider"
          type="range"
          min="1"
          max="8"
          step="1"
          value={parameters.octaves}
          onChange={(e) =>
            setParameters((prev) => ({ ...prev, octaves: Number(e.target.value) }))
          }
        />
        <p className="parameter-description">
          Number of noise layers (more = finer detail)
        </p>
      </div>

      {/* Generate Button */}
      <button
        className="generate-button"
        onClick={handleGenerate}
        disabled={!!seedError || loading}
      >
        {loading ? 'Generating...' : 'Generate Terrain'}
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
