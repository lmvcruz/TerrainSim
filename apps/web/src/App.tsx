import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { TerrainMesh } from './components/TerrainMesh'
import { NoiseParametersPanel } from './components/NoiseParametersPanel'
import type { NoiseParameters } from './components/NoiseParametersPanel'
import { StatisticsPanel } from './components/StatisticsPanel'
import { trackGeneration } from './utils/terrainTracker'
import { logger } from './utils/logger'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const IS_PRODUCTION = window.location.hostname.includes('github.io')

// Default parameters for initial terrain generation
const DEFAULT_PARAMETERS: NoiseParameters = {
  seed: 42,
  frequency: 0.05,
  amplitude: 50,
  octaves: 6,
}

function App() {
  const width = 128
  const height = 128

  // Initial terrain: flat (will be replaced by noise terrain on mount)
  const [heightmap, setHeightmap] = useState<Float32Array>(() =>
    new Float32Array(width * height).fill(0)
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wireframe, setWireframe] = useState(false)
  const apiAvailable = !IS_PRODUCTION

  // Generate default terrain on mount (only if API is available)
  useEffect(() => {
    if (apiAvailable) {
      handleGenerate(DEFAULT_PARAMETERS)
    } else {
      // In production without backend, generate a simple demo terrain
      logger.warn('Running in production mode without backend API. Using demo terrain.')
      generateDemoTerrain()
    }
  }, [apiAvailable]) // Re-run if apiAvailable changes
  const generateDemoTerrain = () => {
    logger.info('Generating demo terrain (no API)')
    const demo = new Float32Array(width * height)

    // Simple sine wave pattern for demo
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width - 0.5
        const ny = y / height - 0.5
        const dist = Math.sqrt(nx * nx + ny * ny)
        demo[y * width + x] = 20 * Math.sin(dist * 10) * (1 - dist * 2)
      }
    }

    setHeightmap(demo)
  }
  const handleGenerate = async (parameters: NoiseParameters) => {
    if (!apiAvailable) {
      generateDemoTerrain()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'fbm', // Use Fractional Brownian Motion
          width,
          height,
          seed: parameters.seed,
          frequency: parameters.frequency,
          amplitude: parameters.amplitude,
          octaves: parameters.octaves,
          persistence: 0.5,
          lacunarity: 2.0,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate terrain')
      }

      const data = await response.json()

      // Calculate statistics for comparison
      const dataArray = data.data
      const centerIdx = Math.floor(dataArray.length / 2)
      const sum = dataArray.reduce((a: number, b: number) => a + b, 0)
      const mean = sum / dataArray.length

      // Track this generation for comparison
      trackGeneration({
        centerValue: dataArray[centerIdx],
        firstFive: dataArray.slice(0, 5),
        parameters: data.parameters,
        min: data.statistics.min,
        max: data.statistics.max,
        mean: mean,
      })

      logger.group('📥 API Response Received', () => {
        logger.info('Parameters', data.parameters)
        logger.debug('Data', {
          length: dataArray.length,
          centerValue: dataArray[centerIdx].toFixed(4),
          firstFive: dataArray.slice(0, 5).map((v: number) => v.toFixed(2)),
          statistics: {
            min: data.statistics.min.toFixed(2),
            max: data.statistics.max.toFixed(2),
            mean: mean.toFixed(2),
          },
        })
      })

      // Convert the heightmap array to Float32Array
      const newHeightmap = new Float32Array(data.data)

      logger.debug('🔄 Calling setHeightmap()', {
        reference: `Float32Array@${newHeightmap.byteOffset}`,
        length: newHeightmap.length,
        centerValue: newHeightmap[centerIdx].toFixed(4),
        note: 'TerrainMesh should re-render with this data',
      })

      setHeightmap(newHeightmap)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      logger.error('Error generating terrain', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <h1 style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        color: 'white',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      }}>
        Hello Terrain
      </h1>

      <NoiseParametersPanel
        initialParameters={DEFAULT_PARAMETERS}
        onGenerate={handleGenerate}
        loading={loading}
        error={error}
      />

      <StatisticsPanel
        heightmap={heightmap}
        width={width}
        height={height}
      />

      {/* Wireframe Toggle Button */}
      <button
        onClick={() => setWireframe(!wireframe)}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10,
          padding: '10px 20px',
          background: wireframe ? '#4a9eff' : 'rgba(30, 30, 30, 0.9)',
          color: 'white',
          border: wireframe ? '2px solid #6bb3ff' : '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        {wireframe ? '◼ Solid' : '◻ Wireframe'}
      </button>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'rgba(30, 30, 30, 0.95)',
            padding: '24px 40px',
            borderRadius: '12px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(74, 158, 255, 0.2)',
              borderTop: '4px solid #4a9eff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span>Generating Terrain...</span>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <TerrainMesh
          width={width}
          height={height}
          meshWidth={10}
          meshDepth={10}
          heightmap={heightmap}
          wireframe={wireframe}
        />
        <gridHelper args={[12, 12]} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App
