import { PerlinNoise } from '../noise/PerlinNoise.js';

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

  const heightmap = new Float32Array(width * height);
  const perlin = new PerlinNoise(seed);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x * frequency;
      const ny = y * frequency;

      const noiseValue = perlin.noise(nx, ny);
      const elevation = noiseValue * amplitude;

      heightmap[y * width + x] = elevation;
    }
  }

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

  const heightmap = new Float32Array(width * height);
  const perlin = new PerlinNoise(seed);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let totalValue = 0.0;
      let currentAmplitude = amplitude;
      let currentFrequency = frequency;
      let maxValue = 0.0;

      // Layer multiple octaves of noise
      for (let octave = 0; octave < octaves; octave++) {
        const nx = x * currentFrequency;
        const ny = y * currentFrequency;

        const noiseValue = perlin.noise(nx, ny);
        totalValue += noiseValue * currentAmplitude;
        maxValue += currentAmplitude;

        currentFrequency *= lacunarity;
        currentAmplitude *= persistence;
      }

      // Normalize to approximately [-amplitude, amplitude] range
      const normalizedValue = (totalValue / maxValue) * amplitude;
      heightmap[y * width + x] = normalizedValue;
    }
  }

  return heightmap;
}
