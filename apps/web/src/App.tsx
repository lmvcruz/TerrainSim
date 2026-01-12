import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { io, Socket } from 'socket.io-client'
import { TerrainMesh } from './components/TerrainMesh'
import { NoiseParametersPanel } from './components/NoiseParametersPanel'
import type { NoiseParameters } from './components/NoiseParametersPanel'
import { ErosionParametersPanel } from './components/ErosionParametersPanel'
import type { ErosionParameters } from './components/ErosionParametersPanel'
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
  const [simulating, setSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState<{
    particlesSimulated: number
    totalParticles: number
  } | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const apiAvailable = !IS_PRODUCTION

  // Setup WebSocket connection
  useEffect(() => {
    if (!apiAvailable) return

    const socket = io(API_BASE_URL)
    socketRef.current = socket

    socket.on('connect', () => {
      logger.info('🔌 WebSocket connected')
    })

    socket.on('disconnect', () => {
      logger.info('🔌 WebSocket disconnected')
    })

    socket.on('error', (error) => {
      logger.error('WebSocket error', error)
      setError(error.message || 'WebSocket error')
      setSimulating(false)
    })

    socket.on('terrain-frame', (frame) => {
      logger.info('📥 Received terrain frame', {
        frameType: frame.frameType,
        particlesSimulated: frame.particlesSimulated,
        totalParticles: frame.totalParticles,
        dataLength: frame.data.length,
        firstValue: frame.data[0].toFixed(4),
        centerValue: frame.data[Math.floor(frame.data.length / 2)].toFixed(4),
      })

      // Update heightmap with new data - FORCE new reference for React to detect change
      const newHeightmap = new Float32Array(frame.data)
      setHeightmap(newHeightmap)

      // Update progress
      setSimulationProgress({
        particlesSimulated: frame.particlesSimulated,
        totalParticles: frame.totalParticles,
      })

      // If simulation is complete, stop loading
      if (frame.frameType === 'final') {
        setSimulating(false)
        setSimulationProgress(null)
        logger.info('✅ Erosion simulation complete')
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [apiAvailable])

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

  const generateDemoTerrain = (parameters: NoiseParameters = DEFAULT_PARAMETERS) => {
    logger.info('Generating demo terrain (no API)', parameters)
    const demo = new Float32Array(width * height)

    // Simple pseudo-random noise based on seed and parameters
    const { seed, frequency, amplitude } = parameters

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x * frequency
        const ny = y * frequency

        // Simple hash-based pseudo-random function using seed
        const hash = (n: number) => {
          let h = seed + n
          h = ((h >> 16) ^ h) * 0x45d9f3b
          h = ((h >> 16) ^ h) * 0x45d9f3b
          h = (h >> 16) ^ h
          return (h & 0xff) / 255.0 - 0.5
        }

        // Multi-octave noise
        let value = 0
        let amp = amplitude
        let freq = 1

        for (let o = 0; o < 4; o++) {
          const sx = Math.floor(nx * freq)
          const sy = Math.floor(ny * freq)
          value += hash(sx + sy * 1000 + o * 10000) * amp
          amp *= 0.5
          freq *= 2
        }

        demo[y * width + x] = value
      }
    }

    setHeightmap(demo)
  }

  const handleGenerate = async (parameters: NoiseParameters) => {
    if (!apiAvailable) {
      generateDemoTerrain(parameters)
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

  const handleSimulate = (parameters: ErosionParameters) => {
    if (!apiAvailable || !socketRef.current) {
      setError('Erosion simulation requires API server connection')
      return
    }

    logger.info('🌊 Starting erosion simulation', parameters)

    setSimulating(true)
    setError(null)
    setSimulationProgress({ particlesSimulated: 0, totalParticles: parameters.numParticles })

    // Calculate frame delay based on animation speed
    // Base delay: 150ms at 1x speed
    const baseDelay = 150
    const frameDelay = Math.round(baseDelay / parameters.animationSpeed)

    socketRef.current.emit('simulate', {
      width,
      height,
      seed: 42, // Use current terrain seed
      numParticles: parameters.numParticles,
      frameDelay,
      particlesPerFrame: parameters.particlesPerFrame,
      erosionParams: {
        inertia: parameters.inertia,
        sedimentCapacityFactor: parameters.sedimentCapacityFactor,
        minSedimentCapacity: parameters.minSedimentCapacity,
        erodeSpeed: parameters.erodeSpeed,
        depositSpeed: parameters.depositSpeed,
        evaporateSpeed: parameters.evaporateSpeed,
        gravity: parameters.gravity,
        maxDropletLifetime: parameters.maxDropletLifetime,
        initialWaterVolume: parameters.initialWaterVolume,
        initialSpeed: parameters.initialSpeed,
      },
    })
  }

  const handleStopSimulation = () => {
    logger.info('⏸ Stopping erosion simulation')
    setSimulating(false)
    setSimulationProgress(null)
    // Could emit 'stop-simulation' to server if implemented
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

      <ErosionParametersPanel
        onSimulate={handleSimulate}
        onStop={handleStopSimulation}
        loading={simulating}
        error={error}
        progress={simulationProgress}
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
      {(loading || simulating) && (
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
              border: simulating ? '4px solid rgba(255, 140, 66, 0.2)' : '4px solid rgba(74, 158, 255, 0.2)',
              borderTop: simulating ? '4px solid #ff8c42' : '4px solid #4a9eff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span>{simulating ? 'Simulating Erosion...' : 'Generating Terrain...'}</span>
            {simulationProgress && (
              <span style={{ fontSize: '14px', color: '#ccc' }}>
                {simulationProgress.particlesSimulated.toLocaleString()} / {simulationProgress.totalParticles.toLocaleString()} particles
              </span>
            )}
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
