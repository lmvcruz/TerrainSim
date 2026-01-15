import { usePipeline, type SimulationJob } from '../../contexts/PipelineContext';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square } from 'lucide-react';

export default function ConfigurationTimeline() {
  const { config, validation, currentFrame, setCurrentFrame, sessionId, executeSimulation, isSimulating } = usePipeline();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hasExecutedSimulation, setHasExecutedSimulation] = useState(false);

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
    const height = canvas.height;
    const totalFrames = config.totalFrames;
    const frameWidth = (width - 40) / totalFrames; // 20px padding on each side

    // Clear canvas
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(0, 0, width, height);

    // Draw frame numbers (every 10 frames)
    ctx.fillStyle = '#71717a'; // zinc-500
    ctx.font = '10px system-ui';
    for (let i = 0; i <= totalFrames; i += 10) {
      const x = 20 + i * frameWidth;
      ctx.fillText(i.toString(), x, 15);
    }

    // Draw baseline (uncovered frames - red)
    ctx.fillStyle = '#dc2626'; // red-600
    ctx.fillRect(20, 25, (width - 40), 30);

    // Draw job bars (covered frames)
    config.jobs.forEach((job) => {
      if (!job.enabled) return;

      const startX = 20 + (job.startFrame - 1) * frameWidth;
      const jobWidth = (job.endFrame - job.startFrame + 1) * frameWidth;

      // Color based on step type
      const color = job.step === 'hydraulicErosion' ? '#2563eb' : '#ea580c'; // blue-600 or orange-600
      ctx.fillStyle = color;
      ctx.fillRect(startX, 25, jobWidth, 30);

      // Job label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui';
      const label = job.name.length > 15 ? job.name.substring(0, 12) + '...' : job.name;
      ctx.fillText(label, startX + 4, 43);
    });

    // Draw overlapping job indicators (yellow outline)
    const frameJobs = new Map<number, SimulationJob[]>();
    config.jobs.forEach((job) => {
      if (!job.enabled) return;
      for (let i = job.startFrame; i <= job.endFrame; i++) {
        if (!frameJobs.has(i)) {
          frameJobs.set(i, []);
        }
        frameJobs.get(i)!.push(job);
      }
    });

    ctx.strokeStyle = '#facc15'; // yellow-400
    ctx.lineWidth = 2;
    frameJobs.forEach((jobs, frame) => {
      if (jobs.length > 1) {
        const x = 20 + (frame - 1) * frameWidth;
        ctx.strokeRect(x, 25, frameWidth, 30);
      }
    });

    // Draw current frame indicator
    if (currentFrame > 0 && currentFrame <= totalFrames) {
      const x = 20 + (currentFrame - 1) * frameWidth + frameWidth / 2;
      ctx.strokeStyle = '#22c55e'; // green-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, 60);
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
    const frameWidth = (canvas.width - 40) / config.totalFrames;
    const clickedFrame = Math.floor((x - 20) / frameWidth);

    if (clickedFrame >= 0 && clickedFrame <= config.totalFrames) {
      setCurrentFrame(clickedFrame);
    }
  };

  // Handle play button - execute simulation if not done yet
  const handlePlay = async () => {
    if (!sessionId) {
      console.error('No session - generate terrain first');
      alert('Please generate terrain first');
      return;
    }

    console.log('Play button clicked, sessionId:', sessionId);

    // If simulation hasn't been executed yet, do it now
    if (!hasExecutedSimulation && !isSimulating) {
      console.log('Executing simulation for frames 2-10...');
      await executeSimulation();
      setHasExecutedSimulation(true);
      console.log('Simulation complete, starting playback');
    }

    // Start playback from frame 0 (input model)
    setCurrentFrame(0);
    setIsPlaying(!isPlaying);
  };

  // Playback controls
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (currentFrame >= config.totalFrames) {
        setIsPlaying(false);
        setCurrentFrame(0); // Loop back to input model
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
          <button
            onClick={handlePlay}
            disabled={isSimulating || !sessionId}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded transition-colors"
            title={isSimulating ? 'Simulating...' : isPlaying ? 'Pause' : 'Play'}
          >
            {isSimulating ? '⏳' : isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentFrame(0);
            }}
            className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
            title="Stop"
          >
            <Square size={16} />
          </button>
          <div className="text-sm text-zinc-400 ml-2">
            Frame: <span className="font-mono text-white">{currentFrame}</span> / {config.totalFrames}
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
          style={{ width: '100%', height: '80px' }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
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
          <div className="w-4 h-4 border-2 border-yellow-400 rounded" />
          <span>Overlap</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-green-500" style={{ width: '2px' }} />
          <span>Current Frame</span>
        </div>
      </div>
    </div>
  );
}
