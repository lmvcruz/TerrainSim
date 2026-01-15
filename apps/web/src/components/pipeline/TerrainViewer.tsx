import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TerrainMesh } from '../TerrainMesh';
import { usePipeline } from '../../contexts/PipelineContext';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useState } from 'react';

export default function TerrainViewer() {
  const { currentFrame, setCurrentFrame, config, heightmapCache } = usePipeline();
  const [isPlaying, setIsPlaying] = useState(false);

  // Get heightmap for current frame (placeholder for now)
  const currentHeightmap = heightmapCache.get(currentFrame);

  const handlePrevFrame = () => {
    if (currentFrame > 1) {
      setCurrentFrame(currentFrame - 1);
    }
  };

  const handleNextFrame = () => {
    if (currentFrame < config.totalFrames) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [100, 150, 200], fov: 60 }}
        style={{ background: '#09090b' }} // zinc-950
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 50]} intensity={0.8} />
        <TerrainMesh heightmap={currentHeightmap} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={50}
          maxDistance={500}
        />
      </Canvas>

      {/* Frame Scrubber Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/90 backdrop-blur-sm border border-zinc-700 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-3">
          {/* Playback Controls */}
          <button
            onClick={handlePrevFrame}
            disabled={currentFrame <= 1}
            className="p-2 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous frame"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={handleNextFrame}
            disabled={currentFrame >= config.totalFrames}
            className="p-2 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next frame"
          >
            <SkipForward size={16} />
          </button>

          {/* Frame Slider */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <input
              type="range"
              min="1"
              max={config.totalFrames}
              value={currentFrame}
              onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="text-sm font-mono text-zinc-300 min-w-[80px] text-center">
              {currentFrame} / {config.totalFrames}
            </div>
          </div>
        </div>
      </div>

      {/* Info Overlay */}
      <div className="absolute top-4 left-4 bg-zinc-800/90 backdrop-blur-sm border border-zinc-700 rounded px-3 py-2 text-xs space-y-1">
        <div className="text-zinc-400">
          Status: <span className="text-white">{isPlaying ? 'Playing' : 'Paused'}</span>
        </div>
        <div className="text-zinc-400">
          Cache: <span className="text-white">{heightmapCache.size} frames</span>
        </div>
      </div>
    </div>
  );
}
