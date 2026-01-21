/**
 * Job-Based Pipeline System API Routes
 * Implements session-based simulation with frame-by-frame execution
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
// import { validateConfig, executeFrame } from '../job-system-binding.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load the erosion native addon directly (navigate from apps/simulation-api/src/routes to libs/core)
const erosionAddonPath = join(__dirname, '../../../../libs/core/bindings/node/build/Release/terrain_erosion_native.node');
const erosionAddon = require(erosionAddonPath);

// Temporary stub for validateConfig
const validateConfig = (config: any) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const uncoveredFrames: number[] = [];

  // Basic validation
  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object');
    return { isValid: false, errors, warnings, uncoveredFrames };
  }

  if (typeof config.totalFrames !== 'number' || config.totalFrames < 0) {
    errors.push('totalFrames must be a non-negative number');
  }

  if (!Array.isArray(config.jobs)) {
    errors.push('jobs must be an array');
  }

  // Check frame coverage if valid
  if (typeof config.totalFrames === 'number' && Array.isArray(config.jobs)) {
    const coveredFrames = new Set<number>();

    for (const job of config.jobs) {
      if (job.enabled !== false && typeof job.startFrame === 'number' && typeof job.endFrame === 'number') {
        for (let frame = job.startFrame; frame <= job.endFrame; frame++) {
          coveredFrames.add(frame);
        }
      }
    }

    // Find uncovered frames (excluding frame 0, which is covered by step0/terrain generation)
    for (let frame = 1; frame <= config.totalFrames; frame++) {
    errors,
    warnings,
    uncoveredFrames
  };
};

// Use the real C++ erosion from the addon
const executeFrame = (config: any, frame: number, terrain: Float32Array, width: number, height: number, absoluteMaxHeight?: number): Float32Array => {
  console.log(`🎯 Executing frame ${frame} with real C++ erosion (erosionRadius=1, ${config.jobs?.length || 0} jobs, max=${absoluteMaxHeight?.toFixed(2)})`);

  // Instead of using the full pipeline executor (which requires step0),
  // directly apply the hydraulic erosion for jobs that cover this frame
  const jobs = config.jobs || [];
  let currentTerrain = terrain;

  for (const job of jobs) {
    // Check if this job applies to the current frame
    if (job.startFrame <= frame && job.endFrame >= frame && job.enabled !== false) {
      // Support both 'type' (from tests/old API) and 'step' (from frontend)
      const jobType = job.type || job.step;

      if ((jobType === 'hydraulic' || jobType === 'hydraulicErosion') && job.config) {
        // Extract hydraulic erosion config - it may be nested under hydraulicErosion key
        const erosionConfig = job.config.hydraulicErosion || job.config;

        console.log(`  → Applying hydraulic erosion job "${job.name}" (${erosionConfig.numParticles} particles, radius=${erosionConfig.erosionRadius}, maxHeight=${absoluteMaxHeight?.toFixed(2)})`);

        // Call the C++ simulateErosion function directly
        // This bypasses the pipeline and directly applies erosion
        const params = {
          numParticles: erosionConfig.numParticles || 10000,
          maxIterations: erosionConfig.maxLifetime || 30,
          inertia: erosionConfig.inertia || 0.05,
          sedimentCapacityFactor: erosionConfig.sedimentCapacity || 4.0,
          minSedimentCapacity: erosionConfig.minSlope || 0.01,
          erodeSpeed: erosionConfig.erosionRate || 0.3,
          depositSpeed: erosionConfig.depositionRate || 0.3,
          evaporateSpeed: erosionConfig.evaporationRate || 0.01,
          gravity: erosionConfig.gravity || 4.0,
          maxDropletSpeed: 10.0,
          erosionRadius: erosionConfig.erosionRadius || 1,  // Use radius from config or default to 1
          absoluteMaxElevation: absoluteMaxHeight  // Pass Frame 0 max to prevent progressive frame compounding
        };

        currentTerrain = erosionAddon.simulateErosion(currentTerrain, width, height, params);
      }
    }
  }

  return currentTerrain;
};

const router: ExpressRouter = Router();

const PRESETS_DIR = path.join(process.cwd(), 'config-presets');

// Ensure presets directory exists (async initialization)
fs.mkdir(PRESETS_DIR, { recursive: true }).catch(console.error);

// In-memory session storage (sessions will be cleaned up after execution)
interface Session {
  id: string;
  config: any;  // PipelineConfig JSON
  initialTerrain: Float32Array;  // Original frame 0 (never modified)
  terrain: Float32Array;         // Current working terrain
  width: number;
  height: number;
  absoluteMaxHeight: number;     // Original max height from Frame 0 (for progressive erosion)
  createdAt: number;
  lastAccessedAt: number;
}

const sessions = new Map<string, Session>();

// Session cleanup - remove sessions older than 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes

setInterval(() => {
  const now = Date.now();
  const sessionsToDelete: string[] = [];

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccessedAt > SESSION_TIMEOUT_MS) {
      sessionsToDelete.push(sessionId);
    }
  }

  for (const sessionId of sessionsToDelete) {
    sessions.delete(sessionId);
    console.log(`🧹 Cleaned up session: ${sessionId} (timeout)`);
  }
}, 5 * 60 * 1000);  // Check every 5 minutes

/**
 * API-007: POST /config/validate
 * Validate pipeline configuration without executing
 */
router.post('/config/validate', (req: Request, res: Response) => {
  try {
    const config = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body: expected configuration object'
      });
    }

    // Call C++ validation
    const result = validateConfig(config);

    res.json(result);

  } catch (error) {
    console.error('Error validating configuration:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
});

/**
 * API-008: POST /config/save
 * Save configuration to server presets
 */
router.post('/config/save', async (req: Request, res: Response) => {
  try {
    const { name, config } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "name" field' });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid "config" field' });
    }

    // Validate configuration before saving
    const validation = validateConfig(config);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid configuration',
        validation
      });
    }

    // Generate unique ID
    const id = randomUUID();
    const filename = `${id}.json`;
    const filepath = path.join(PRESETS_DIR, filename);

    // Save to file
    await fs.writeFile(filepath, JSON.stringify({
      id,
      name,
      config,
      createdAt: new Date().toISOString()
    }, null, 2));

    res.json({
      id,
      name,
      message: 'Configuration saved successfully'
    });

  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save configuration'
    });
  }
});

/**
 * API-009: GET /config/load/:id
 * Load configuration from server presets
 */
router.get('/config/load/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Missing configuration ID' });
    }

    const filename = `${id}.json`;
    const filepath = path.join(PRESETS_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Read and parse file
    const fileContent = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(fileContent);

    res.json(data);

  } catch (error) {
    console.error('Error loading configuration:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load configuration'
    });
  }
});

/**
 * GET /config/list
 * List all saved configurations
 */
router.get('/config/list', async (req: Request, res: Response) => {
  try {
    const files = await fs.readdir(PRESETS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const configs = await Promise.all(
      jsonFiles.map(async (filename) => {
        const filepath = path.join(PRESETS_DIR, filename);
        const content = await fs.readFile(filepath, 'utf-8');
        const data = JSON.parse(content);
        return {
          id: data.id,
          name: data.name,
          createdAt: data.createdAt
        };
      })
    );

    res.json({ configs });

  } catch (error) {
    console.error('Error listing configurations:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list configurations'
    });
  }
});

/**
 * API-010: POST /simulate/create
 * Initialize a new simulation session
 */
router.post('/simulate/create', (req: Request, res: Response) => {
  try {
    const { config, initialTerrain } = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration' });
    }

    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid configuration',
        validation
      });
    }

    // Extract dimensions from config (default 256x256)
    const width = config.width || 256;
    const height = config.height || 256;

    // Use provided initial terrain or create flat terrain as fallback
    let terrain: Float32Array;
    if (initialTerrain && Array.isArray(initialTerrain)) {
      // Convert from array (JSON) to Float32Array
      terrain = new Float32Array(initialTerrain);
      console.log(`📥 Session initialized with provided terrain (${terrain.length} points)`);
    } else {
      // Create flat terrain as fallback
      terrain = new Float32Array(width * height);
      terrain.fill(0);
      console.log(`📄 Session initialized with flat terrain (${width}x${height})`);
    }

    // Calculate absolute max height from initial terrain (Frame 0)
    // This will be used to prevent deposition from creating spikes in progressive erosion
    let absoluteMaxHeight = -Infinity;
    for (let i = 0; i < terrain.length; i++) {
      if (terrain[i] > absoluteMaxHeight) {
        absoluteMaxHeight = terrain[i];
      }
    }

    // Create session
    const sessionId = randomUUID();
    const session: Session = {
      id: sessionId,
      config,
      initialTerrain: terrain,  // Store original - never modify this!
      terrain: terrain.slice(), // Working copy for current frame
      width,
      height,
      absoluteMaxHeight,        // Store original max for all frames
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    };

    sessions.set(sessionId, session);

    console.log(`🆕 Created session: ${sessionId} (max height: ${absoluteMaxHeight.toFixed(3)})`);

    res.json({
      sessionId,
      width,
      height,
      initialTerrain: Array.from(terrain),
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create session'
    });
  }
});

/**
 * API-010: POST /simulate/execute
 * Execute a single frame for an existing session
 */
router.post('/simulate/execute', (req: Request, res: Response) => {
  try {
    const { sessionId, frame } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "sessionId"' });
    }

    if (typeof frame !== 'number' || frame < 1) {
      return res.status(400).json({ error: 'Invalid frame number' });
    }

    // Get session
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();

    // FIXED: Each frame should build on the PREVIOUS frame's result for progressive erosion.
    // Frame 1 starts from initialTerrain, Frame 2 from Frame 1's result, etc.
    // This allows erosion to progressively deepen valleys and wear down peaks.
    const workingTerrain = session.terrain.slice();

    // Execute frame using C++ binding
    const resultTerrain = executeFrame(
      session.config,
      frame,
      workingTerrain,
      session.width,
      session.height,
      session.absoluteMaxHeight  // Pass Frame 0 max to prevent progressive frame compounding
    );

    // CRITICAL: Update session terrain so next frame builds on this result
    session.terrain = resultTerrain;

    // Calculate statistics
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < resultTerrain.length; i++) {
      if (resultTerrain[i] < min) min = resultTerrain[i];
      if (resultTerrain[i] > max) max = resultTerrain[i];
    }

    console.log(`⚙️  Executed frame ${frame} for session ${sessionId}`);

    res.json({
      sessionId,
      frame,
      terrain: Array.from(resultTerrain),
      width: session.width,
      height: session.height,
      statistics: {
        min,
        max,
        range: max - min
      }
    });

  } catch (error) {
    console.error('Error executing frame:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Frame execution failed'
    });
  }
});

/**
 * DELETE /simulate/session/:id
 * Explicitly delete a session and free memory
 */
router.delete('/simulate/session/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const deleted = sessions.delete(id);

    if (deleted) {
      console.log(`🗑️  Deleted session: ${id}`);
      res.json({ message: 'Session deleted successfully' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }

  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete session'
    });
  }
});

export { router as jobSystemRouter, sessions };
