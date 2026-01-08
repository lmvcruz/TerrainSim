import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { TerrainMesh } from './components/TerrainMesh'
import { generateSemiSphere } from './utils/terrainGenerators'
import './App.css'

function App() {
  // Generate a semi-sphere heightmap (128x128 grid, centered at 64,64, radius 50)
  const width = 128
  const height = 128
  const heightmap = generateSemiSphere(width, height, 64, 64, 50)

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
