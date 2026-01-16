/**
 * WebSocket event handlers for job-based simulation
 * API-011: Implements frame:complete events
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { executeFrame } from '../erosion-binding.js';
import { logger } from '../utils/logger.js';

const wsLogger = logger.withContext('JobSystemWebSocket');

interface Session {
  id: string;
  config: any;
  terrain: Float32Array;
  width: number;
  height: number;
  createdAt: number;
  lastAccessedAt: number;
}

export function setupJobSystemWebSocket(io: SocketServer, sessions: Map<string, Session>) {
  io.on('connection', (socket: Socket) => {
    wsLogger.info(`🔌 Client connected for job system`, { socketId: socket.id });

    /**
     * Event: 'job-simulation:start'
     * Start frame-by-frame execution for a session
     */
    socket.on('job-simulation:start', async (params) => {
      try {
        const { sessionId, startFrame = 1, endFrame, frameDelay = 150 } = params;

        if (!sessionId) {
          socket.emit('error', { message: 'Missing sessionId' });
          return;
        }

        const session = sessions.get(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const totalFrames = session.config.totalFrames || endFrame || 100;
        const finalFrame = Math.min(endFrame || totalFrames, totalFrames);

        wsLogger.info(`🎬 Starting job simulation`, { sessionId, startFrame, finalFrame });

        // Execute frames sequentially
        for (let frame = startFrame; frame <= finalFrame; frame++) {
          try {
            // Execute frame using C++ binding
            const resultTerrain = executeFrame(
              session.config,
              frame,
              session.terrain,
              session.width,
              session.height
            );

            // Update session terrain for next frame
            session.terrain = resultTerrain;
            session.lastAccessedAt = Date.now();

            // Emit frame:complete event
            socket.emit('frame:complete', {
              sessionId,
              frame,
              heights: Array.from(resultTerrain),
              width: session.width,
              height: session.height,
              totalFrames: finalFrame
            });

            wsLogger.info(`📊 Frame complete`, { frame, finalFrame, sessionId });

            // Delay between frames for visualization
            if (frame < finalFrame) {
              await new Promise(resolve => setTimeout(resolve, frameDelay));
            }

          } catch (frameError) {
            wsLogger.error(`Error executing frame ${frame}:`, frameError);
            socket.emit('error', {
              message: `Frame ${frame} execution failed`,
              error: frameError instanceof Error ? frameError.message : 'Unknown error'
            });
            break;
          }
        }

        // Emit completion event
        socket.emit('simulation:complete', {
          sessionId,
          totalFrames: finalFrame - startFrame + 1
        });

        console.log(`✅ Job simulation complete for session ${sessionId}`);

      } catch (error) {
        console.error('Error in job-simulation:start:', error);
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Simulation failed'
        });
      }
    });

    /**
     * Event: 'job-simulation:pause'
     * Pause execution (client-side control)
     */
    socket.on('job-simulation:pause', (params) => {
      const { sessionId } = params;
      console.log(`⏸️  Pause requested for session ${sessionId} (client-side control)`);
      // In this stateless model, pause is handled client-side by not requesting next frame
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}
