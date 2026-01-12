/**
 * Test helper utilities for terrain generation integration tests
 */

interface TerrainParameters {
  seed: number;
  frequency: number;
  amplitude: number;
  octaves: number;
}

interface TerrainStatistics {
  min: number;
  max: number;
  mean: number;
  range: number;
}

interface TerrainMeasurements {
  centerPoint: number;
  statistics: TerrainStatistics;
  stdDev: number;
}

const API_BASE_URL = 'http://localhost:3001';

/**
 * Call the terrain generation API with given parameters
 */
export async function callGenerateAPI(params: TerrainParameters): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate standard deviation of heightmap values
 */
export function calculateStdDev(data: number[] | Float32Array, mean: number): number {
  const heightmap = Array.isArray(data) ? data : Array.from(data);
  const variance = heightmap.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / heightmap.length;
  return Math.sqrt(variance);
}

/**
 * Get the height value at the center point of the terrain
 */
export function measureCenterPoint(
  heightmap: number[] | Float32Array,
  width: number,
  height: number
): number {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const centerIndex = centerY * width + centerX;

  return Array.isArray(heightmap) ? heightmap[centerIndex] : heightmap[centerIndex];
}

/**
 * Measure all relevant properties from terrain data
 */
export function measureTerrain(terrainData: any): TerrainMeasurements {
  const { data, width, height, statistics } = terrainData;

  const centerPoint = measureCenterPoint(data, width, height);

  // Calculate mean
  const heightmap = Array.isArray(data) ? data : Array.from(data);
  const sum = heightmap.reduce((acc: number, val: number) => acc + val, 0);
  const mean = sum / heightmap.length;

  const stdDev = calculateStdDev(data, mean);

  return {
    centerPoint,
    statistics: {
      min: statistics.min,
      max: statistics.max,
      mean,
      range: statistics.range,
    },
    stdDev,
  };
}

/**
 * Assert that a value is within tolerance of expected value
 */
export function assertWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number,
  message?: string
): void {
  const diff = Math.abs(actual - expected);
  const maxDiff = Math.abs(expected * tolerance);

  if (diff > maxDiff) {
    const prefix = message ? `${message}: ` : '';
    throw new Error(
      `${prefix}Expected ${actual} to be within ${tolerance * 100}% of ${expected} ` +
      `(max difference: ${maxDiff.toFixed(4)}, actual difference: ${diff.toFixed(4)})`
    );
  }
}

/**
 * Assert that two values are significantly different
 */
export function assertSignificantlyDifferent(
  value1: number,
  value2: number,
  minDifference: number,
  message?: string
): void {
  const diff = Math.abs(value1 - value2);

  if (diff < minDifference) {
    const prefix = message ? `${message}: ` : '';
    throw new Error(
      `${prefix}Expected values to differ by at least ${minDifference}, ` +
      `but difference was only ${diff.toFixed(4)} (${value1} vs ${value2})`
    );
  }
}

/**
 * Wait for API to be ready
 */
export async function waitForAPI(maxRetries = 10, delayMs = 1000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 1, frequency: 0.05, amplitude: 50, octaves: 6 }),
      });

      if (response.ok) {
        return;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(
          `API not available after ${maxRetries} retries. ` +
          `Please ensure the backend is running: pnpm --filter @terrain-sim/api run dev`
        );
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
