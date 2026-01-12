import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { TerrainMesh } from './components/TerrainMesh'
import { NoiseParametersPanel, NoiseParameters } from './components/NoiseParametersPanel'
import { generateSemiSphere } from './utils/terrainGenerators'
import './App.css'

function App() {
  const width = 128
  const height = 128

  // Initial terrain: semi-sphere
  const [heightmap, setHeightmap] = useState<Float32Array>(() =>
    generateSemiSphere(width, height, 64, 64, 50)
  )

  const handleGenerate = (parameters: NoiseParameters) => {
    console.log('Generate terrain with parameters:', parameters)
    // TODO: Call API endpoint to generate noise-based terrain
    // For now, regenerate the semi-sphere as a placeholder
    const newHeightmap = generateSemiSphere(width, height, 64, 64, 50)
    setHeightmap(newHeightmap)
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

      <NoiseParametersPanel onGenerate={handleGenerate} />

      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <TerrainMesh
          width={width}
          height={height}
          meshWidth={10}
          meshDepth={10}
          heightmap={heightmap}
        />
        <gridHelper args={[12, 12]} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App
