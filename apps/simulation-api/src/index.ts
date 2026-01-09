import express from 'express';
import cors from 'cors';
import { generatePerlinNoise, generateFbm } from './generators/heightmapGenerators.js';

const app = express();
const PORT = process.env.PORT || 3001;

// API-004: CORS support for local development
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`🌍 TerrainSim API server running on http://localhost:${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /health     - Health check`);
  console.log(`   POST /generate   - Generate heightmap`);
});
