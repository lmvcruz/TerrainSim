import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box } from '@react-three/drei'
import './App.css'

function App() {
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
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Box args={[1, 1, 1]} position={[0, 0, 0]}>
          <meshStandardMaterial color="green" />
        </Box>
        <gridHelper args={[10, 10]} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App
