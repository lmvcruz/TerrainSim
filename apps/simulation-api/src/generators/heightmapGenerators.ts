import { PerlinNoise } from '../noise/PerlinNoise.js';
import { logger } from '../utils/logger.js';

const log = logger.withContext('heightmapGenerators');

/**
 * Generate a heightmap using Perlin noise
 */
export function generatePerlinNoise(
  width: number,
  height: number,
  seed: number = 0,
  frequency: number = 0.05,
  amplitude: number = 1.0
): Float32Array {
  log.trace('generatePerlinNoise called', { width, height, seed, frequency, amplitude });
  const startTime = Date.now();

  // Parameter validation
  if (width <= 0 || height <= 0) {
    throw new Error('Width and height must be greater than 0');
  }
  if (frequency <= 0) {
    throw new Error('Frequency must be greater than 0');
  }
  if (!isFinite(frequency)) {
    throw new Error('Frequency must be a finite number');
  }
  if (!isFinite(amplitude)) {
    throw new Error('Amplitude must be a finite number');
  }

  const totalCells = width * height;
  log.trace('Creating heightmap array', { totalCells, sizeBytes: totalCells * 4 });

  const heightmap = new Float32Array(width * height);

  log.trace('Creating PerlinNoise instance', { seed });
  const perlin = new PerlinNoise(seed);

  log.trace('Starting generation loop', { totalCells });

  let processedCells = 0;
  const reportInterval = Math.max(Math.floor(totalCells / 10), 1); // Report every 10%

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x * frequency;
      const ny = y * frequency;

      const noiseValue = perlin.noise(nx, ny);
      const elevation = noiseValue * amplitude;

      heightmap[y * width + x] = elevation;

      processedCells++;

      // Log progress every 10%
      if (processedCells % reportInterval === 0) {
        const percentComplete = Math.round((processedCells / totalCells) * 100);
        log.trace('Generation progress', {
          processed: processedCells,
          total: totalCells,
          percentComplete
        });
      }
    }
  }

  // Calculate statistics
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < heightmap.length; i++) {
    const value = heightmap[i];
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }

  const mean = sum / heightmap.length;
  const duration = Date.now() - startTime;

  log.trace('Heightmap generation complete', {
    width,
    height,
    min,
    max,
    mean,
    duration
  });

  return heightmap;
}

/**
 * Generate a heightmap using Fractional Brownian Motion (fBm)
 */
export function generateFbm(
  width: number,
  height: number,
  seed: number = 0,
  octaves: number = 4,
  frequency: number = 0.05,
  amplitude: number = 1.0,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): Float32Array {
  log.trace('generateFbm called', {
    width,
    height,
    seed,
    octaves,
    frequency,
    amplitude,
    persistence,
    lacunarity
  });
  const startTime = Date.now();

  // Parameter validation
  if (width <= 0 || height <= 0) {
    throw new Error('Width and height must be greater than 0');
  }
  if (octaves < 1) {
    throw new Error('Octaves must be at least 1');
  }
  if (octaves > 16) {
    throw new Error('Octaves must not exceed 16 (performance limit)');
  }
  if (frequency <= 0 || amplitude <= 0 || persistence <= 0 || lacunarity <= 0) {
    throw new Error('Frequency, amplitude, persistence, and lacunarity must be greater than 0');
  }
  if (!isFinite(frequency) || !isFinite(amplitude) || !isFinite(persistence) || !isFinite(lacunarity)) {
    throw new Error('All parameters must be finite numbers');
  }

  const totalCells = width * height;
  log.trace('Creating heightmap array', { totalCells, octaves });

  const heightmap = new Float32Array(width * height);
  const perlin = new PerlinNoise(seed);

  log.trace('Starting fBm generation loop');

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      let freq = frequency;
      let amp = amplitude;

      // Accumulate noise from multiple octaves
      for (let octave = 0; octave < octaves; octave++) {
        const nx = x * freq;
        const ny = y * freq;
        value += perlin.noise(nx, ny) * amp;
        freq *= lacunarity;
        amp *= persistence;
      }

      heightmap[y * width + x] = value;
    }
  }

  // Calculate statistics
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < heightmap.length; i++) {
    const value = heightmap[i];
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }

  const mean = sum / heightmap.length;
  const duration = Date.now() - startTime;

  log.trace('fBm generation complete', {
    width,
    height,
    octaves,
    min,
    max,
    mean,
    duration
  });

  return heightmap;
}
