import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TerrainMesh } from '../TerrainMesh';
import { usePipeline } from '../../contexts/PipelineContext';
import { useRef, useMemo } from 'react';

export default function TerrainViewer() {
  const { config, currentFrame, heightmapCache } = usePipeline();

  // Cache the last dimensions to detect actual changes
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  const defaultHeightmapRef = useRef<Float32Array | null>(null);

  // Generate default flat terrain for preview only when dimensions actually change
  const defaultHeightmap = useMemo(() => {
    const width = config.width || 256;
    const height = config.height || 256;
    
    // Only create a new array if dimensions actually changed
    if (lastDimensionsRef.current.width !== width || lastDimensionsRef.current.height !== height) {
      lastDimensionsRef.current = { width, height };
      defaultHeightmapRef.current = new Float32Array(width * height).fill(0);
    }
    
    return defaultHeightmapRef.current!;
  }, [config.width, config.height]);

  // Get heightmap for current frame, fallback to default terrain
  const currentHeightmap = heightmapCache.get(currentFrame) || defaultHeightmap;

  // DEBUG: Log when frame changes
  console.log(`🎬 TerrainViewer: Rendering frame ${currentFrame}`, {
    hasCachedHeightmap: heightmapCache.has(currentFrame),
    usingDefault: !heightmapCache.has(currentFrame),
    heightmapSample: currentHeightmap ? [currentHeightmap[0], currentHeightmap[1000], currentHeightmap[10000]] : null
  });

  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 10, 15], fov: 60 }}
        style={{ background: '#09090b' }} // zinc-950
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 50]} intensity={0.8} />
        <TerrainMesh
          heightmap={currentHeightmap}
          width={config.width || 256}
          height={config.height || 256}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
