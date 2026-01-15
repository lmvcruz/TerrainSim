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

// Temporary stub for validateConfig until C++ binding is compiled
const validateConfig = (config: any) => {
  return {
    isValid: true,
    errors: [],
    warnings: []
  };
};

// Temporary stub for executeFrame - applies AGGRESSIVE smoothing to make frames visually different
const executeFrame = (config: any, frame: number, terrain: Float32Array, width: number, height: number): Float32Array => {
  let result = new Float32Array(terrain.length);
  const smoothFactor = 0.8; // VERY aggressive smoothing (80% per frame)
  const passes = 3; // Apply smoothing 3 times per frame for dramatic effect

  // Copy initial terrain
  for (let i = 0; i < terrain.length; i++) {
    result[i] = terrain[i];
  }

  // Apply multiple smoothing passes for EXTREME visual changes
  for (let pass = 0; pass < passes; pass++) {
    const temp = new Float32Array(result.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Get ALL 8 neighbors (including diagonals) for maximum smoothing
        let sum = result[idx];
        let count = 1;

        // Cardinal directions
        if (x > 0) { sum += result[idx - 1]; count++; }
        if (x < width - 1) { sum += result[idx + 1]; count++; }
        if (y > 0) { sum += result[idx - width]; count++; }
        if (y < height - 1) { sum += result[idx + width]; count++; }

        // Diagonals for even more aggressive smoothing
        if (x > 0 && y > 0) { sum += result[idx - width - 1]; count++; }
        if (x < width - 1 && y > 0) { sum += result[idx - width + 1]; count++; }
        if (x > 0 && y < height - 1) { sum += result[idx + width - 1]; count++; }
        if (x < width - 1 && y < height - 1) { sum += result[idx + width + 1]; count++; }

        const avg = sum / count;
        temp[idx] = result[idx] * (1 - smoothFactor) + avg * smoothFactor;
      }
    }

    result = temp;
  }

  console.log(`   🔧 Applied AGGRESSIVE smoothing (${passes} passes, ${smoothFactor * 100}% factor) to frame ${frame}`);
  return result;
};

const router: ExpressRouter = Router();

// Directory for storing configuration presets
const PRESETS_DIR = path.join(process.cwd(), 'presets');

// Ensure presets directory exists
await fs.mkdir(PRESETS_DIR, { recursive: true });

// In-memory session storage (sessions will be cleaned up after execution)
interface Session {
  id: string;
  config: any;  // PipelineConfig JSON
  terrain: Float32Array;
  width: number;
  height: number;
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

    // Create session
    const sessionId = randomUUID();
    const session: Session = {
      id: sessionId,
      config,
      terrain,
      width,
      height,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    };

    sessions.set(sessionId, session);

    console.log(`🆕 Created session: ${sessionId}`);

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

    // Execute frame using C++ binding
    const resultTerrain = executeFrame(
      session.config,
      frame,
      session.terrain,
      session.width,
      session.height
    );

    // Update session terrain (for next frame execution)
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
