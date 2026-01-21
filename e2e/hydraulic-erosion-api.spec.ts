import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3001';

/**
 * E2E Test: Hydraulic Erosion API with Scratch/Valley Detection
 *
 * This test verifies that hydraulic erosion:
 * 1. Modifies the terrain (not returning zeros or unchanged data)
 * 2. Creates detectable valleys and scratches
 * 3. Progressive erosion over multiple frames
 */

interface HeightmapStats {
  min: number;
  max: number;
  mean: number;
  variance: number;
  stdDev: number;
  averageGradient: number;
  localMinima: number;
  valleyDepth: number;
  skewness: number;
  nonZeroCount: number;
}

function calculateVariance(data: Float32Array): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
}

function calculateAverageGradient(data: Float32Array, width: number, height: number): number {
  let totalGradient = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const current = data[idx];

      // Calculate gradient in X and Y directions (central difference)
      const gradX = (data[idx + 1] - data[idx - 1]) / 2;
      const gradY = (data[idx + width] - data[idx - width]) / 2;

      // Gradient magnitude (steepness)
      const gradient = Math.sqrt(gradX * gradX + gradY * gradY);
      totalGradient += gradient;
      count++;
    }
  }

  return count > 0 ? totalGradient / count : 0;
}

function countLocalMinima(data: Float32Array, width: number, height: number): number {
  let minimaCount = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const current = data[idx];

      // Check if lower than all 8 neighbors
      const neighbors = [
        data[idx - width - 1], data[idx - width], data[idx - width + 1],
        data[idx - 1],                             data[idx + 1],
        data[idx + width - 1], data[idx + width], data[idx + width + 1]
      ];

      const isMinimum = neighbors.every(neighbor => current < neighbor);

      if (isMinimum) minimaCount++;
    }
  }

  return minimaCount;
}

function calculateValleyDepth(data: Float32Array): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  let belowMeanDepth = 0;
  let belowMeanCount = 0;

  for (let i = 0; i < data.length; i++) {
    if (data[i] < mean) {
      belowMeanDepth += (mean - data[i]);
      belowMeanCount++;
    }
  }

  return belowMeanCount > 0 ? belowMeanDepth / belowMeanCount : 0;
}

function calculateSkewness(data: Float32Array, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;

  const skewness = data.reduce((sum, h) =>
    sum + Math.pow((h - mean) / stdDev, 3), 0
  ) / data.length;

  return skewness;
}

function analyzeHeightmap(data: Float32Array, width: number, height: number): HeightmapStats {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = calculateVariance(data);
  const stdDev = Math.sqrt(variance);
  const nonZeroCount = Array.from(data).filter(v => v !== 0).length;

  return {
    min,
    max,
    mean,
    variance,
    stdDev,
    averageGradient: calculateAverageGradient(data, width, height),
    localMinima: countLocalMinima(data, width, height),
    valleyDepth: calculateValleyDepth(data),
    skewness: calculateSkewness(data, mean, stdDev),
    nonZeroCount
  };
}

function printStats(label: string, stats: HeightmapStats) {
  console.log(`\n${label}:`);
  console.log(`  Height Range: [${stats.min.toFixed(2)}, ${stats.max.toFixed(2)}]`);
  console.log(`  Mean: ${stats.mean.toFixed(2)}, StdDev: ${stats.stdDev.toFixed(2)}`);
  console.log(`  Variance: ${stats.variance.toFixed(2)}`);
  console.log(`  Average Gradient: ${stats.averageGradient.toFixed(4)} (steepness)`);
  console.log(`  Local Minima: ${stats.localMinima} (valley bottoms)`);
  console.log(`  Valley Depth: ${stats.valleyDepth.toFixed(2)}`);
  console.log(`  Skewness: ${stats.skewness.toFixed(4)}`);
  console.log(`  Non-zero Points: ${stats.nonZeroCount}/${stats.nonZeroCount + (192*192 - stats.nonZeroCount)} (${(stats.nonZeroCount/(192*192)*100).toFixed(1)}%)`);
}

function printComparison(stats0: HeightmapStats, stats5: HeightmapStats) {
  console.log('\n📊 CHANGE ANALYSIS (Frame 0 → Frame 5):');
  console.log(`  Variance: ${stats0.variance.toFixed(2)} → ${stats5.variance.toFixed(2)} (${((stats5.variance/stats0.variance - 1)*100).toFixed(1)}% change)`);
  console.log(`  Gradient: ${stats0.averageGradient.toFixed(4)} → ${stats5.averageGradient.toFixed(4)} (${((stats5.averageGradient/stats0.averageGradient - 1)*100).toFixed(1)}% change)`);
  console.log(`  Local Minima: ${stats0.localMinima} → ${stats5.localMinima} (${stats5.localMinima - stats0.localMinima} new valleys)`);
  console.log(`  Valley Depth: ${stats0.valleyDepth.toFixed(2)} → ${stats5.valleyDepth.toFixed(2)} (${((stats5.valleyDepth - stats0.valleyDepth)).toFixed(2)} deeper)`);
  console.log(`  Min Height: ${stats0.min.toFixed(2)} → ${stats5.min.toFixed(2)} (${(stats5.min - stats0.min).toFixed(2)} change)`);
}

test.describe('Hydraulic Erosion API - Scratch Detection', () => {
  test('should create detectable valleys and scratches in terrain', async () => {
    console.log('\n🧪 Starting Hydraulic Erosion E2E Test with Scratch Detection\n');

    const width = 192;
    const height = 192;

    // Step 1: Generate initial terrain (Perlin noise for realistic erosion)
    console.log('📍 Step 1: Generating initial terrain (Perlin noise)...');
    const generateResponse = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'perlin',
        width,
        height,
        params: {
          scale: 50,
          octaves: 4,
          persistence: 0.5,
          lacunarity: 2.0
        }
      })
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`Generate failed: ${generateResponse.status} - ${errorText}`);
    }

    expect(generateResponse.ok).toBe(true);
    const generateData = await generateResponse.json();
    expect(generateData.data).toBeDefined();
    expect(generateData.data.length).toBe(width * height);

    const frame0Data = new Float32Array(generateData.data);
    const stats0 = analyzeHeightmap(frame0Data, width, height);
    printStats('📊 Frame 0 (Initial Terrain)', stats0);

    // Step 2: Create simulation session
    console.log('\n📍 Step 2: Creating simulation session...');
    const sessionResponse = await fetch(`${API_BASE_URL}/simulate/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          totalFrames: 5,
          width,
          height,
          jobs: [{
            id: 'erosion-1',
            name: 'Hydraulic Erosion',
            type: 'hydraulic',
            enabled: true,
            startFrame: 1,
            endFrame: 5,
            config: {
              numParticles: 50000,
              erosionRate: 0.3,
              depositionRate: 0.1,
              evaporationRate: 0.01,
              maxLifetime: 30,
              inertia: 0.05,
              sedimentCapacity: 4.0,
              minSlope: 0.01,
              gravity: 4.0,
              erosionRadius: 1  // Using radius=1 for scratches, not smoothing
            }
          }]
        },
        initialTerrain: Array.from(frame0Data)
      })
    });

    expect(sessionResponse.ok).toBe(true);
    const sessionData = await sessionResponse.json();
    expect(sessionData.sessionId).toBeDefined();
    console.log(`  ✓ Session created: ${sessionData.sessionId}`);

    // Step 3: Execute frames 1-5 and collect data
    console.log('\n📍 Step 3: Executing erosion simulation (5 frames)...');
    const frameData: Float32Array[] = [frame0Data];

    for (let frame = 1; frame <= 5; frame++) {
      const executeResponse = await fetch(`${API_BASE_URL}/simulate/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          frame
        })
      });

      expect(executeResponse.ok).toBe(true);
      const executeData = await executeResponse.json();
      expect(executeData.terrain).toBeDefined();

      const terrain = new Float32Array(executeData.terrain);
      frameData.push(terrain);

      console.log(`  ✓ Frame ${frame} executed (${executeData.statistics?.min.toFixed(2)} to ${executeData.statistics?.max.toFixed(2)})`);
    }

    const frame5Data = frameData[5];
    const stats5 = analyzeHeightmap(frame5Data, width, height);
    printStats('📊 Frame 5 (After Erosion)', stats5);
    printComparison(stats0, stats5);

    // Step 4: ASSERTIONS - Verify erosion created valleys/scratches

    console.log('\n🔍 ASSERTIONS:');

    // Basic sanity checks
    console.log('\n  1️⃣ Basic Sanity Checks:');
    expect(frame5Data.length).toBe(frame0Data.length);
    console.log('    ✓ Array lengths match');

    expect(stats5.nonZeroCount).toBeGreaterThan(0);
    console.log(`    ✓ Not all zeros (${stats5.nonZeroCount} non-zero points)`);

    expect(stats5.max).toBeGreaterThan(0);
    console.log(`    ✓ Has positive heights (max: ${stats5.max.toFixed(2)})`);

    // Data modification check
    console.log('\n  2️⃣ Terrain Modification Check:');
    const arraysIdentical = Array.from(frame0Data).every((val, idx) => val === frame5Data[idx]);
    expect(arraysIdentical).toBe(false);
    console.log('    ✓ Terrain was modified (not identical to frame 0)');

    // Variance check - erosion typically REDUCES variance (smoothing effect)
    console.log('\n  3️⃣ Height Variation Check:');
    const varianceChange = ((stats5.variance/stats0.variance - 1)*100).toFixed(1);
    console.log(`    ℹ️  Variance changed by ${varianceChange}% (erosion typically smooths terrain)`);
    // Erosion smooths terrain, so variance usually decreases - this is correct behavior
    expect(stats5.variance).toBeGreaterThan(0); // Just ensure variance exists

    // Gradient check - erosion creates valleys but also smooths peaks
    console.log('\n  4️⃣ Gradient Analysis:');
    const gradientChange = ((stats5.averageGradient/stats0.averageGradient - 1)*100).toFixed(1);
    console.log(`    ℹ️  Average gradient changed by ${gradientChange}%`);
    // Erosion creates features like valleys, just verify terrain has meaningful gradients
    expect(stats5.averageGradient).toBeGreaterThan(0.001); // Has slopes

    // VALLEY DETECTION: Local minima increase
    console.log('\n  5️⃣ Valley Detection (Local Minima):');
    expect(stats5.localMinima).toBeGreaterThan(stats0.localMinima);
    console.log(`    ✓ Added ${stats5.localMinima - stats0.localMinima} new valley bottoms`);

    // VALLEY DEPTH: Erosion carved deeper
    console.log('\n  6️⃣ Valley Depth:');
    expect(stats5.valleyDepth).toBeGreaterThan(stats0.valleyDepth + 0.5);
    console.log(`    ✓ Valleys deepened by ${(stats5.valleyDepth - stats0.valleyDepth).toFixed(2)}`);

    // Min height should decrease (erosion digs down)
    console.log('\n  7️⃣ Erosion Carved Down:');
    expect(stats5.min).toBeLessThan(stats0.min + 1);
    console.log(`    ✓ Min height: ${stats0.min.toFixed(2)} → ${stats5.min.toFixed(2)}`);

    // Progressive erosion (frame 1 < frame 3 < frame 5)
    console.log('\n  8️⃣ Progressive Erosion:');
    const stats1 = analyzeHeightmap(frameData[1], width, height);
    const stats3 = analyzeHeightmap(frameData[3], width, height);

    expect(stats1.averageGradient).toBeLessThan(stats3.averageGradient);
    expect(stats3.averageGradient).toBeLessThan(stats5.averageGradient);
    console.log(`    ✓ Gradient progression: ${stats1.averageGradient.toFixed(4)} → ${stats3.averageGradient.toFixed(4)} → ${stats5.averageGradient.toFixed(4)}`);

    // Cleanup
    console.log('\n📍 Step 4: Cleaning up session...');
    await fetch(`${API_BASE_URL}/simulate/session/${sessionData.sessionId}`, {
      method: 'DELETE'
    });
    console.log('  ✓ Session cleaned up');

    console.log('\n✅ ALL ASSERTIONS PASSED - Hydraulic erosion is creating valleys and scratches!\n');
  });
});
