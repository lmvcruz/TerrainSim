import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { generatePerlinNoise, generateFbm } from './generators/heightmapGenerators.js';
import { simulateParticle } from './erosion-binding.js';
import { jobSystemRouter, sessions } from './routes/jobSystem.js';
import frontendLogsRouter from './routes/frontend-logs.js';
import adminRouter from './routes/admin.js';
import logsRouter from './routes/logs.js';
import { setupJobSystemWebSocket } from './websocket/jobSystemEvents.js';
import { logService } from './services/LogService.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { logger, setCorrelationId } from './utils/logger.js';
import type { LogLevel } from './types/logging.js';
// Winston logging infrastructure
import { logger as winstonLogger, simulationLogger, createLogger } from './utils/logging.js';

const endpointLogger = logger.withContext('/generate');
const winstonEndpointLogger = createLogger('generate-endpoint');

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
  if (IS_DEV) return true; // Allow all origins in development mode
  if (allowedOrigins.includes(origin)) return true;
  // Allow all Cloudflare Pages URLs: *.terrainsim.pages.dev (preview and production)
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

// Increase body size limit to handle heightmap arrays (256x256 floats = ~1MB)
app.use(express.json({ limit: '10mb' }));

// Add correlation ID middleware
app.use(correlationIdMiddleware);

// Mount job system routes
app.use(jobSystemRouter);

// Mount frontend logs route
app.use('/api/logs', frontendLogsRouter);

// Mount admin routes (log level management, health)
app.use('/admin', adminRouter);

// Mount logs API routes (filtering, search, stats)
app.use('/api/logs', logsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API-002: /generate endpoint accepting noise parameters
app.post('/generate', (req, res) => {
  const requestStartTime = Date.now();

  try {
    // Set correlation ID for this request
    setCorrelationId(req.correlationId);

    // Winston logging - request received
    winstonEndpointLogger.info('Heightmap generation request', {
      correlationId: req.correlationId,
      method: req.body.method || 'perlin',
      dimensions: `${req.body.width || 256}x${req.body.height || 256}`,
    });

    endpointLogger.trace('Request received', {
      correlationId: req.correlationId,
      bodyKeys: Object.keys(req.body),
      rawMethod: req.body.method
    });

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

    endpointLogger.trace('Parameters parsed', {
      method,
      width,
      height,
      seed,
      frequency,
      amplitude,
      ...(method === 'fbm' && { octaves, persistence, lacunarity })
    });

    // Validate basic parameters
    if (typeof width !== 'number' || typeof height !== 'number') {
      winstonEndpointLogger.warn('Invalid parameter types', {
        correlationId: req.correlationId,
        widthType: typeof width,
        heightType: typeof height
      });
      endpointLogger.warn('Invalid parameter types', {
        widthType: typeof width,
        heightType: typeof height
      });
      return res.status(400).json({ error: 'Width and height must be numbers' });
    }

    if (width < 1 || width > 2048 || height < 1 || height > 2048) {
      winstonEndpointLogger.warn('Parameters out of range', {
        correlationId: req.correlationId,
        width,
        height
      });
      endpointLogger.warn('Parameters out of range', { width, height });
      return res.status(400).json({
        error: 'Width and height must be between 1 and 2048'
      });
    }

    endpointLogger.trace('Validation passed', { method, width, height });
    endpointLogger.trace(`Selected generation method: ${method}`);

    let heightmap: Float32Array;
    const generationStartTime = Date.now();

    // API-003: Generate heightmap and serialize to Float32Array
    if (method === 'perlin') {
      endpointLogger.trace('Calling generatePerlinNoise', { width, height, seed, frequency, amplitude });
      heightmap = generatePerlinNoise(width, height, seed, frequency, amplitude);
      endpointLogger.trace('generatePerlinNoise returned', {
        arrayLength: heightmap.length,
        expectedLength: width * height,
        generationDuration: Date.now() - generationStartTime
      });
    } else if (method === 'fbm') {
      endpointLogger.trace('Calling generateFbm', { width, height, seed, octaves, frequency, amplitude, persistence, lacunarity });
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
      endpointLogger.trace('generateFbm returned', {
        arrayLength: heightmap.length,
        expectedLength: width * height,
        generationDuration: Date.now() - generationStartTime
      });
    } else {
      endpointLogger.warn('Invalid method specified', { method });
      return res.status(400).json({
        error: 'Invalid method. Use "perlin" or "fbm"'
      });
    }

    // Calculate statistics
    endpointLogger.trace('Calculating response statistics');
    const statsStartTime = Date.now();
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < heightmap.length; i++) {
      if (heightmap[i] < min) min = heightmap[i];
      if (heightmap[i] > max) max = heightmap[i];
    }
    endpointLogger.trace('Statistics calculated', {
      min,
      max,
      range: max - min,
      statsDuration: Date.now() - statsStartTime
    });

    // API-003: Serialize Heightmap to Float32Array in response
    endpointLogger.trace('Converting Float32Array to array for JSON serialization', {
      sourceLength: heightmap.length
    });
    const conversionStartTime = Date.now();
    const dataArray = Array.from(heightmap);
    endpointLogger.trace('Conversion complete', {
      dataLength: dataArray.length,
      conversionDuration: Date.now() - conversionStartTime
    });

    const responseData = {
      width,
      height,
      data: dataArray,
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
    };

    endpointLogger.trace('Sending response', {
      dataSize: dataArray.length,
      responseKeys: Object.keys(responseData),
      totalDuration: Date.now() - requestStartTime
    });

    res.json(responseData);

    const totalDuration = Date.now() - requestStartTime;

    // Winston logging - successful response
    winstonEndpointLogger.info('Heightmap generated successfully', {
      correlationId: req.correlationId,
      method,
      dimensions: `${width}x${height}`,
      duration: totalDuration,
      dataPoints: dataArray.length,
    });

    endpointLogger.trace('Response sent successfully', {
      totalDuration
    });

  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;

    // Winston logging - error
    winstonEndpointLogger.error('Heightmap generation failed', {
      correlationId: req.correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: errorDuration,
    });

    endpointLogger.error('Error generating terrain', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      duration: errorDuration
    });

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Unified logging endpoints (enabled in both dev and production)
// POST /logs - Receive logs from frontend
app.post('/logs', (req, res) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Logs must be an array' });
    }

    // Add logs to the service
    logService.addLogs(logs);

    const stats = logService.getStats();

    res.json({
      received: logs.length,
      total: stats.totalLogs,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error storing logs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// GET /logs - Query logs with filters
app.get('/logs', (req, res) => {
  try {
    const {
      correlationId,
      level,
      source,
      component,
      since,
      until,
      limit = '100'
    } = req.query;

    const logs = logService.query({
      correlationId: correlationId as string,
      level: level as LogLevel,
      source: source as 'frontend' | 'backend',
      component: component as string,
      since: since ? parseInt(since as string, 10) : undefined,
      until: until ? parseInt(until as string, 10) : undefined,
      limit: parseInt(limit as string, 10),
    });

    const stats = logService.getStats();

    res.json({
      logs,
      count: logs.length,
      total: stats.totalLogs,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// GET /logs/latest - Get recent operations
app.get('/logs/latest', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const operations = logService.getLatestOperations(limit);

    res.json({
      operations,
      count: operations.length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error retrieving latest operations:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// GET /logs/stats - Get system statistics
app.get('/logs/stats', (req, res) => {
  try {
    const stats = logService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error retrieving stats:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// POST /logs/config - Change log level
app.post('/logs/config', (req, res) => {
  try {
    const { level } = req.body;

    if (!level || !['info', 'debug', 'trace', 'warn', 'error'].includes(level)) {
      return res.status(400).json({
        error: 'Invalid log level. Must be one of: info, debug, trace, warn, error'
      });
    }

    logService.setLogLevel(level);

    res.json({
      success: true,
      level: logService.getLogLevel(),
      message: `Log level set to ${level}`
    });

  } catch (error) {
    console.error('Error setting log level:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// DELETE /logs - Clear all logs
app.delete('/logs', (req, res) => {
  try {
    logService.clearLogs();
    res.json({
      success: true,
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

// GET /logs/export - Export all logs
app.get('/logs/export', (req, res) => {
  try {
    const logs = logService.getAllLogs();
    res.json({
      logs,
      count: logs.length,
      timestamp: Date.now(),
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

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
  const startupInfo = {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    logLevel: logService.getLogLevel(),
    winstonLogLevel: winstonLogger.level,
    logDir: process.env.LOG_DIR || './logs',
  };

  // Winston logging
  winstonLogger.info('TerrainSim API server started', startupInfo);

  // Console output
  console.log(`🌍 TerrainSim API server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /health     - Health check`);
  console.log(`   POST /generate   - Generate heightmap`);
  console.log(`   WS   /           - WebSocket for erosion simulation`);
  console.log(`\n📝 Unified Logging Endpoints (Production & Development):`);
  console.log(`   POST   /logs        - Receive logs from frontend`);
  console.log(`   GET    /logs        - Query logs (correlationId, level, source, component, limit)`);
  console.log(`   GET    /logs/latest - Get recent operations`);
  console.log(`   GET    /logs/stats  - Get system statistics`);
  console.log(`   GET    /logs/export - Export all logs`);
  console.log(`   POST   /logs/config - Change log level (info/debug/trace)`);
  console.log(`   DELETE /logs        - Clear all logs`);
  console.log(`\n🎚️  Current log level: ${logService.getLogLevel()}`);
  console.log(`🎚️  Winston log level: ${winstonLogger.level}`);
  console.log(`📂 Logs stored in: ${path.join(process.cwd(), '.logs')}`);
});
