/**
 * Generate expected values for terrain generation integration tests
 *
 * This script calls the backend API with specific parameter sets and
 * saves the resulting terrain properties to a JSON file for test validation.
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

interface TestCase {
  parameters: TerrainParameters;
  measurements: TerrainMeasurements;
}

interface TestExpectations {
  gridSize: { width: number; height: number };
  testCases: {
    frequencyVariation: TestCase[];
    amplitudeVariation: TestCase[];
    octavesVariation: TestCase[];
    seedVariation: TestCase[];
  };
  generatedAt: string;
}

const API_BASE_URL = 'http://localhost:3001';

async function generateTerrain(params: TerrainParameters): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

function calculateStdDev(data: number[], mean: number): number {
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

function measureTerrain(terrainData: any): TerrainMeasurements {
  const { data, width, height, statistics } = terrainData;

  // Convert to regular array if needed
  const heightmap = Array.isArray(data) ? data : Array.from(data);

  // Get center point (128, 128 for 256x256 grid)
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const centerIndex = centerY * width + centerX;
  const centerPoint = heightmap[centerIndex];

  // Calculate mean
  const sum = heightmap.reduce((acc, val) => acc + val, 0);
  const mean = sum / heightmap.length;

  // Calculate standard deviation
  const stdDev = calculateStdDev(heightmap, mean);

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

async function generateTestCase(params: TerrainParameters): Promise<TestCase> {
  console.log(`Generating terrain with params:`, params);
  const terrainData = await generateTerrain(params);

  // Debug: log the response structure
  console.log(`  Response keys:`, Object.keys(terrainData));

  const measurements = measureTerrain(terrainData);

  console.log(`  Center point: ${measurements.centerPoint.toFixed(2)}`);
  console.log(`  Mean: ${measurements.statistics?.mean?.toFixed(2) ?? 'N/A'}`);
  console.log(`  Std Dev: ${measurements.stdDev.toFixed(2)}`);
  console.log(`  Range: ${measurements.statistics?.range?.toFixed(2) ?? 'N/A'}`);

  return { parameters: params, measurements };
}

async function main() {
  console.log('🚀 Generating test expectations...\n');

  try {
    // Test if API is running
    const healthCheck = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed: 1, frequency: 0.05, amplitude: 50, octaves: 6 }),
    });

    if (!healthCheck.ok) {
      throw new Error('Backend API is not responding. Please start the API server first.');
    }
  } catch (error) {
    console.error('❌ Error: Backend API is not available.');
    console.error('   Please run: pnpm --filter @terrain-sim/api run dev');
    process.exit(1);
  }

  const expectations: TestExpectations = {
    gridSize: { width: 256, height: 256 },
    testCases: {
      frequencyVariation: [],
      amplitudeVariation: [],
      octavesVariation: [],
      seedVariation: [],
    },
    generatedAt: new Date().toISOString(),
  };

  // Test Suite 1: Frequency Variation
  console.log('📊 Test Suite 1: Frequency Variation');
  expectations.testCases.frequencyVariation.push(
    await generateTestCase({ seed: 42, frequency: 0.05, amplitude: 50, octaves: 6 })
  );
  expectations.testCases.frequencyVariation.push(
    await generateTestCase({ seed: 42, frequency: 0.08, amplitude: 50, octaves: 6 })
  );
  console.log('');

  // Test Suite 2: Amplitude Variation
  console.log('📊 Test Suite 2: Amplitude Variation');
  expectations.testCases.amplitudeVariation.push(
    await generateTestCase({ seed: 42, frequency: 0.05, amplitude: 30, octaves: 6 })
  );
  expectations.testCases.amplitudeVariation.push(
    await generateTestCase({ seed: 42, frequency: 0.05, amplitude: 70, octaves: 6 })
  );
  console.log('');

  // Test Suite 3: Octaves Variation
  console.log('📊 Test Suite 3: Octaves Variation');
  expectations.testCases.octavesVariation.push(
    await generateTestCase({ seed: 42, frequency: 0.05, amplitude: 50, octaves: 3 })
  );
  expectations.testCases.octavesVariation.push(
    await generateTestCase({ seed: 42, frequency: 0.05, amplitude: 50, octaves: 8 })
  );
  console.log('');

  // Test Suite 4: Seed Variation
  console.log('📊 Test Suite 4: Seed Variation');
  expectations.testCases.seedVariation.push(
    await generateTestCase({ seed: 42, frequency: 0.05, amplitude: 50, octaves: 6 })
  );
  expectations.testCases.seedVariation.push(
    await generateTestCase({ seed: 123, frequency: 0.05, amplitude: 50, octaves: 6 })
  );
  expectations.testCases.seedVariation.push(
    await generateTestCase({ seed: 999, frequency: 0.05, amplitude: 50, octaves: 6 })
  );
  console.log('');

  // Save to file
  const outputPath = 'apps/web/src/tests/integration/test-expectations.json';
  const fs = await import('fs');
  fs.writeFileSync(outputPath, JSON.stringify(expectations, null, 2));

  console.log('✅ Test expectations generated successfully!');
  console.log(`📄 Saved to: ${outputPath}`);
}

main().catch(console.error);
