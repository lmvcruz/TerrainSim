/**
 * Job-Based Pipeline System API Routes
 * Implements session-based simulation with frame-by-frame execution
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { validateConfig, executeFrame } from '../erosion-binding.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

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
    const config = req.body;

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

    // Generate initial terrain from Step 0 (modeling configuration)
    let initialTerrain: Float32Array;

    // For now, create a flat terrain - will be properly generated by JobExecutor
    initialTerrain = new Float32Array(width * height);
    initialTerrain.fill(0);

    // Create session
    const sessionId = randomUUID();
    const session: Session = {
      id: sessionId,
      config,
      terrain: initialTerrain,
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
      initialTerrain: Array.from(initialTerrain),
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

    console.log(`⚙️  Executed frame ${frame} for session ${sessionId}`);

    res.json({
      sessionId,
      frame,
      terrain: Array.from(resultTerrain),
      width: session.width,
      height: session.height
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
