import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TerrainMesh } from '../TerrainMesh';
import { usePipeline } from '../../contexts/PipelineContext';
import { useMemo } from 'react';

export default function TerrainViewer() {
  const { config, currentFrame, heightmapCache } = usePipeline();

  // Generate default flat terrain for preview
  const defaultHeightmap = useMemo(() => {
    return new Float32Array(config.width * config.height).fill(0);
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
          width={config.width}
          height={config.height}
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
