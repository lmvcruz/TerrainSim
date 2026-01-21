import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TerrainMesh, type TextureMode } from '../TerrainMesh';
import { usePipeline } from '../../contexts/PipelineContext';
import { useRef, useMemo, useState } from 'react';

export default function TerrainViewer() {
  const { config, currentFrame, heightmapCache } = usePipeline();
  const [textureMode, setTextureMode] = useState<TextureMode>('landscape');

  // Extract stable width and height values
  const width = config.width || 256;
  const height = config.height || 256;

  // Cache the last dimensions to detect actual changes
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  const defaultHeightmapRef = useRef<Float32Array | null>(null);

  // Generate default flat terrain for preview only when dimensions actually change
  const defaultHeightmap = useMemo(() => {
    // Only create a new array if dimensions actually changed
    if (lastDimensionsRef.current.width !== width || lastDimensionsRef.current.height !== height) {
      lastDimensionsRef.current = { width, height };
      defaultHeightmapRef.current = new Float32Array(width * height).fill(0);
    }

    return defaultHeightmapRef.current!;
  }, [width, height]);

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
      {/* Texture Mode Controls */}
      <div className="absolute top-4 right-4 z-10 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-zinc-800">
        <label htmlFor="texture-mode" className="block text-xs font-medium text-zinc-400 mb-2">
          Texture Mode
        </label>
        <select
          id="texture-mode"
          value={textureMode}
          onChange={(e) => setTextureMode(e.target.value as TextureMode)}
          className="w-32 px-3 py-1.5 text-xs bg-zinc-800 text-zinc-200 border border-zinc-700 rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="landscape">Landscape</option>
          <option value="none">None</option>
        </select>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 10, 15], fov: 60 }}
        style={{ background: '#09090b' }} // zinc-950
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 50]} intensity={0.8} />
        <TerrainMesh
          heightmap={currentHeightmap}
          width={width}
          height={height}
          textureMode={textureMode}
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
