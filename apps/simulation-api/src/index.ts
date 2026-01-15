import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { generatePerlinNoise, generateFbm } from './generators/heightmapGenerators.js';
import { simulateParticle } from './erosion-binding.js';
import { jobSystemRouter, sessions } from './routes/jobSystem.js';
import { setupJobSystemWebSocket } from './websocket/jobSystemEvents.js';

const app = express();
const PORT = process.env.PORT || 3001;
const IS_DEV = process.env.NODE_ENV !== 'production';

// CORS origin configuration - support multiple domains
const allowedOrigins = [
  'http://localhost:5173',
  'https://terrainsim.lmvcruz.work',
];

// Allow Cloudflare Pages preview deployments
const isAllowedOrigin = (origin: string | undefined) => {
  if (!origin) return true; // Allow requests with no origin (e.g., mobile apps, curl)
  if (allowedOrigins.includes(origin)) return true;
  // Allow Cloudflare Pages preview URLs: *.terrainsim.pages.dev
  if (origin.match(/^https:\/\/[a-z0-9-]+\.terrainsim\.pages\.dev$/)) return true;
  return false;
};

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Development log storage
const DEV_LOGS_DIR = path.join(process.cwd(), '.dev-logs');
const DEV_LOGS_FILE = path.join(DEV_LOGS_DIR, 'browser-logs.json');

// Initialize dev logs directory
if (IS_DEV) {
  if (!fs.existsSync(DEV_LOGS_DIR)) {
    fs.mkdirSync(DEV_LOGS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DEV_LOGS_FILE)) {
    fs.writeFileSync(DEV_LOGS_FILE, JSON.stringify([]), 'utf-8');
  }
}

// API-004: CORS support for local development
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Mount job system routes
app.use(jobSystemRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API-002: /generate endpoint accepting noise parameters
app.post('/generate', (req, res) => {
  try {
    const {
      method = 'perlin',
      width = 256,
      height = 256,
      seed = 0,
      frequency = 0.05,
      amplitude = 1.0,
      octaves = 4,
      persistence = 0.5,
      lacunarity = 2.0
    } = req.body;

    // Validate basic parameters
    if (typeof width !== 'number' || typeof height !== 'number') {
      return res.status(400).json({ error: 'Width and height must be numbers' });
    }

    if (width < 1 || width > 2048 || height < 1 || height > 2048) {
      return res.status(400).json({
        error: 'Width and height must be between 1 and 2048'
      });
    }

    let heightmap: Float32Array;

    // API-003: Generate heightmap and serialize to Float32Array
    if (method === 'perlin') {
      heightmap = generatePerlinNoise(width, height, seed, frequency, amplitude);
    } else if (method === 'fbm') {
      heightmap = generateFbm(
        width,
        height,
        seed,
        octaves,
        frequency,
        amplitude,
        persistence,
        lacunarity
      );
    } else {
      return res.status(400).json({
        error: 'Invalid method. Use "perlin" or "fbm"'
      });
    }

    // Calculate statistics
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < heightmap.length; i++) {
      if (heightmap[i] < min) min = heightmap[i];
      if (heightmap[i] > max) max = heightmap[i];
    }

    // API-003: Serialize Heightmap to Float32Array in response
    res.json({
      width,
      height,
      data: Array.from(heightmap), // Convert Float32Array to regular array for JSON
      statistics: {
        min,
        max,
        range: max - min
      },
      parameters: {
        method,
        seed,
        frequency,
        amplitude,
        ...(method === 'fbm' && { octaves, persistence, lacunarity })
      }
    });

  } catch (error) {
    console.error('Error generating terrain:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Development-only log endpoints
if (IS_DEV) {
  // POST /dev/logs - Receive logs from browser
  app.post('/dev/logs', (req, res) => {
    try {
      const { logs, timestamp } = req.body;

      if (!Array.isArray(logs)) {
        return res.status(400).json({ error: 'Logs must be an array' });
      }

      // Read existing logs
      let existingLogs: any[] = [];
      try {
        const data = fs.readFileSync(DEV_LOGS_FILE, 'utf-8');
        existingLogs = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or invalid JSON, start fresh
        existingLogs = [];
      }

      // Append new logs
      existingLogs.push(...logs);

      // Keep only the last 5000 logs to prevent unbounded growth
      if (existingLogs.length > 5000) {
        existingLogs = existingLogs.slice(-5000);
      }

      // Write back to file
      fs.writeFileSync(DEV_LOGS_FILE, JSON.stringify(existingLogs, null, 2), 'utf-8');

      res.json({
        received: logs.length,
        total: existingLogs.length,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error storing logs:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  // GET /dev/logs - Retrieve logs for agent/debugging
  app.get('/dev/logs', (req, res) => {
    try {
      const { level, component, since, limit = '100' } = req.query;

      // Read logs from file
      let logs: any[] = [];
      try {
        const data = fs.readFileSync(DEV_LOGS_FILE, 'utf-8');
        logs = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or invalid JSON
        logs = [];
      }

      // Filter logs based on query parameters
      let filteredLogs = logs;

      if (level) {
        filteredLogs = filteredLogs.filter(log => log.level === level);
      }

      if (component) {
        filteredLogs = filteredLogs.filter(log => log.component === component);
      }

      if (since) {
        const sinceTimestamp = parseInt(since as string, 10);
        filteredLogs = filteredLogs.filter(log => log.timestamp >= sinceTimestamp);
      }

      // Apply limit (default 100, max 1000)
      const limitNum = Math.min(parseInt(limit as string, 10), 1000);
      filteredLogs = filteredLogs.slice(-limitNum);

      res.json({
        logs: filteredLogs,
        count: filteredLogs.length,
        total: logs.length,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error retrieving logs:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  // DELETE /dev/logs - Clear all logs
  app.delete('/dev/logs', (req, res) => {
    try {
      fs.writeFileSync(DEV_LOGS_FILE, JSON.stringify([]), 'utf-8');
      res.json({
        message: 'All logs cleared',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error clearing logs:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });
}

// API-005: WebSocket connection handling
setupJobSystemWebSocket(io, sessions);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // API-006: Handle erosion simulation request
  socket.on('simulate', async (params) => {
    try {
      const {
        width = 256,
        height = 256,
        seed = 0,
        heightmapData = null, // Receive current heightmap from frontend
        numParticles = 5000,
        erosionParams = {},
        frameDelay = 150, // Delay between frames in ms (configurable)
        particlesPerFrame = 50 // Particles to simulate per frame
      } = params;

      console.log(`🌊 Starting erosion simulation for ${socket.id}:`, {
        width,
        height,
        seed,
        numParticles,
        frameDelay,
        particlesPerFrame,
        hasHeightmapData: !!heightmapData
      });

      // Use provided heightmap or generate new one
      let heightmap: Float32Array;
      if (heightmapData && Array.isArray(heightmapData)) {
        heightmap = new Float32Array(heightmapData);
        console.log(`✅ Using provided heightmap (${heightmap.length} values)`);
      } else {
        heightmap = generateFbm(width, height, seed, 4, 0.05, 1.0, 0.5, 2.0);
        console.log(`⚠️  No heightmap provided, generated new terrain`);
      }

      // Send initial state
      socket.emit('terrain-frame', {
        frameType: 'initial',
        width,
        height,
        data: Array.from(heightmap),
        particlesSimulated: 0,
        totalParticles: numParticles
      });

      // Small delay after initial frame
      await new Promise(resolve => setTimeout(resolve, frameDelay));

      // Simulate erosion with visible frame updates
      let particlesSimulated = 0;

      while (particlesSimulated < numParticles) {
        // Process a batch of particles
        const particlesToProcess = Math.min(particlesPerFrame, numParticles - particlesSimulated);

        for (let i = 0; i < particlesToProcess; i++) {
          // Random starting position for particle
          const startX = Math.random() * (width - 1);
          const startY = Math.random() * (height - 1);

          // Use C++ physics engine for realistic erosion
          try {
            simulateParticle(heightmap, width, height, startX, startY, {
              maxIterations: erosionParams.maxDropletLifetime || 30,
              inertia: erosionParams.inertia || 0.05,
              sedimentCapacityFactor: erosionParams.sedimentCapacityFactor || 4.0,
              erodeSpeed: erosionParams.erodeSpeed || 0.3,
              depositSpeed: erosionParams.depositSpeed || 0.3,
              evaporateSpeed: erosionParams.evaporateSpeed || 0.01,
              gravity: erosionParams.gravity || 4.0,
              maxDropletSpeed: 10.0,
              erosionRadius: erosionParams.erosionRadius || 3
            });
          } catch (error) {
            console.error('❌ C++ erosion error:', error);
            // Fall back gracefully if C++ binding fails
          }
        }

        particlesSimulated += particlesToProcess;

        // Send update frame
        socket.emit('terrain-frame', {
          frameType: 'update',
          width,
          height,
          data: Array.from(heightmap),
          particlesSimulated,
          totalParticles: numParticles
        });

        console.log(`📊 Frame update: ${particlesSimulated}/${numParticles} particles (${Math.round(particlesSimulated/numParticles*100)}%)`);

        // Delay between frames for visible animation
        await new Promise(resolve => setTimeout(resolve, frameDelay));
      }

      // Send final state
      socket.emit('terrain-frame', {
        frameType: 'final',
        width,
        height,
        data: Array.from(heightmap),
        particlesSimulated: numParticles,
        totalParticles: numParticles
      });

      console.log(`✅ Erosion simulation complete for ${socket.id}`);

    } catch (error) {
      console.error('Error during erosion simulation:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Simulation error'
      });
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🌍 TerrainSim API server running on http://localhost:${PORT}`);
  console.log(`� WebSocket server ready`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /health     - Health check`);
  console.log(`   POST /generate   - Generate heightmap`);
  console.log(`   WS   /           - WebSocket for erosion simulation`);

  if (IS_DEV) {
    console.log(`\n🔧 Development endpoints:`);
    console.log(`   POST   /dev/logs - Receive browser logs`);
    console.log(`   GET    /dev/logs - Retrieve logs (query: level, component, since, limit)`);
    console.log(`   DELETE /dev/logs - Clear all logs`);
    console.log(`   📂 Logs stored in: ${DEV_LOGS_FILE}`);
  }
});
