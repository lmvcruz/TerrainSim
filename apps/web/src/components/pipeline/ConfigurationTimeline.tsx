import { usePipeline, type SimulationJob } from '../../contexts/PipelineContext';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

export default function ConfigurationTimeline() {
  const { config, validation, currentFrame, setCurrentFrame, sessionId, executeSimulation, stopSimulation, clearCache, isSimulating, heightmapCache } = usePipeline();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Draw timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const totalFrames = config.totalFrames;
    const frameWidth = (width - 40) / (totalFrames + 1); // +1 to include frame 0

    // Calculate height based on number of jobs
    const enabledJobs = config.jobs.filter(job => job.enabled);
    const rowHeight = 40;
    const topMargin = 25;
    const height = topMargin + (enabledJobs.length * rowHeight) + 10;

    // Update canvas height
    canvas.height = height;
    canvas.style.height = `${height}px`;

    // Clear canvas
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(0, 0, width, height);

    // Draw all frame numbers
    ctx.fillStyle = '#71717a'; // zinc-500
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i <= totalFrames; i++) {
      const x = 20 + i * frameWidth + frameWidth / 2;
      ctx.fillText(i.toString(), x, 15);
    }

    // Draw each job in its own row
    enabledJobs.forEach((job, index) => {
      const rowY = topMargin + (index * rowHeight);

      // Draw frame 0 (input model) - green for this row
      ctx.fillStyle = '#22c55e'; // green-600
      ctx.fillRect(20, rowY, frameWidth, rowHeight - 5);

      // Draw "Model" label on frame 0
      if (index === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Model', 20 + frameWidth / 2, rowY + 20);
      }

      // Draw baseline for frames 1+ (uncovered frames - red)
      ctx.fillStyle = '#dc2626'; // red-600
      ctx.fillRect(20 + frameWidth, rowY, (width - 40 - frameWidth), rowHeight - 5);

      // Draw job bar (covered frames)
      const startX = 20 + job.startFrame * frameWidth;
      const jobWidth = (job.endFrame - job.startFrame + 1) * frameWidth;

      // Color based on step type
      const color = job.step === 'hydraulicErosion' ? '#2563eb' : '#ea580c'; // blue-600 or orange-600
      ctx.fillStyle = color;
      ctx.fillRect(startX, rowY, jobWidth, rowHeight - 5);

      // Job label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      const label = job.name.length > 20 ? job.name.substring(0, 17) + '...' : job.name;
      ctx.fillText(label, startX + 4, rowY + 22);
    });

    // Draw current frame indicator across all rows
    if (currentFrame >= 0 && currentFrame <= totalFrames) {
      const x = 20 + currentFrame * frameWidth + frameWidth / 2;
      ctx.strokeStyle = '#22c55e'; // green-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 5);
      ctx.stroke();

      // Triangle marker
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x - 5, 15);
      ctx.lineTo(x + 5, 15);
      ctx.closePath();
      ctx.fill();
    }
  }, [config, currentFrame, containerWidth]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frameWidth = (canvas.width - 40) / (config.totalFrames + 1);
    const clickedFrame = Math.floor((x - 20) / frameWidth);

    if (clickedFrame >= 0 && clickedFrame <= config.totalFrames) {
      setCurrentFrame(clickedFrame);
    }
  };

  // Handle simulate button - execute simulation
  const handleSimulate = async () => {
    if (!sessionId) {
      console.error('No session - generate terrain first');
      alert('Please generate terrain first');
      return;
    }

    if (!validation?.isValid) {
      console.error('Invalid configuration - has coverage gaps');
      alert('Configuration has coverage gaps. Please add jobs to cover all frames.');
      return;
    }

    console.log('Simulate button clicked, sessionId:', sessionId);
    await executeSimulation();
  };

  // Handle stop button - stop simulation
  const handleStop = () => {
    console.log('Stop button clicked');
    stopSimulation();
  };

  // Handle reset button - clear cache
  const handleReset = () => {
    console.log('Reset button clicked');
    if (confirm('Clear all cached frames? This will not affect your configuration.')) {
      clearCache();
    }
  };

  // Playback controls
  const handlePrevFrame = () => {
    if (currentFrame > 0) {
      setCurrentFrame(currentFrame - 1);
    }
  };

  const handleNextFrame = () => {
    if (currentFrame < config.totalFrames) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  // Playback animation effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (currentFrame >= config.totalFrames) {
        setCurrentFrame(0);
      } else {
        setCurrentFrame(currentFrame + 1);
      }
    }, 100); // 10 FPS

    return () => clearInterval(interval);
  }, [isPlaying, currentFrame, config.totalFrames, setCurrentFrame]);

  return (
    <div ref={containerRef} className="h-full flex flex-col p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Simulate Button */}
          <button
            onClick={isSimulating ? handleStop : handleSimulate}
            disabled={!sessionId || (!isSimulating && !validation?.isValid)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-2"
            title={
              !sessionId
                ? 'Generate terrain first'
                : !validation?.isValid
                  ? 'Configuration has coverage gaps'
                  : isSimulating
                    ? 'Stop simulation'
                    : 'Run simulation'
            }
          >
            {isSimulating ? (
              <>
                <Square size={16} />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Simulate</span>
              </>
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            disabled={isSimulating}
            className="p-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed rounded transition-colors"
            title="Clear cached frames"
          >
            <RotateCcw size={16} />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-zinc-700 mx-2" />

          {/* Playback Controls */}
          <button
            onClick={handlePrevFrame}
            disabled={currentFrame <= 0}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white"
            title="Previous frame"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={handleNextFrame}
            disabled={currentFrame >= config.totalFrames}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white"
            title="Next frame"
          >
            <SkipForward size={16} />
          </button>

          <div className="text-sm text-zinc-400 ml-2">
            Frame: <span className="font-mono text-white">{currentFrame}</span> / {config.totalFrames}
            <span className="ml-3 text-zinc-500">Cache: {heightmapCache.size} frames</span>
          </div>
        </div>

        {/* Validation Status */}
        {validation && (
          <div className="text-sm">
            {validation.isValid ? (
              <span className="text-green-500">✓ Full Coverage</span>
            ) : (
              <span className="text-red-500">
                ✗ {validation.uncoveredFrames.length} frames uncovered
              </span>
            )}
          </div>
        )}
      </div>

      {/* Timeline Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={containerWidth || 800}
          height={80}
          onClick={handleCanvasClick}
          className="cursor-pointer border border-zinc-700 rounded"
          style={{ width: '100%' }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span>Input Model</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded" />
          <span>Hydraulic Erosion</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-600 rounded" />
          <span>Thermal Erosion</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded" />
          <span>Uncovered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-green-500" style={{ width: '2px' }} />
          <span>Current Frame</span>
        </div>
      </div>
    </div>
  );
}
