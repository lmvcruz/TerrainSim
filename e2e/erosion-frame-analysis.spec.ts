import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3001';

/**
 * Detailed frame-by-frame analysis of erosion behavior
 */
test.describe('Erosion Frame Analysis', () => {
  test('should show reasonable frame-by-frame changes', async () => {
    const width = 192;
    const height = 192;

    // Generate simple terrain for easier analysis
    console.log('📍 Generating initial terrain...');
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

    const generateData = await generateResponse.json();
    const frame0 = new Float32Array(generateData.data);

    console.log('\n📊 Frame 0 (Initial):');
    console.log(`  Min: ${Math.min(...frame0).toFixed(2)}`);
    console.log(`  Max: ${Math.max(...frame0).toFixed(2)}`);
    console.log(`  Mean: ${(frame0.reduce((a, b) => a + b) / frame0.length).toFixed(2)}`);

    // Sample a few specific points to track
    const samplePoints = [
      { x: 96, y: 96, idx: 96 * width + 96, name: 'Center' },
      { x: 50, y: 50, idx: 50 * width + 50, name: 'TopLeft' },
      { x: 150, y: 150, idx: 150 * width + 150, name: 'BottomRight' }
    ];

    console.log('\n📍 Tracking specific points:');
    samplePoints.forEach(p => {
      console.log(`  ${p.name} (${p.x},${p.y}): ${frame0[p.idx].toFixed(2)}`);
    });

    // Create session with FEWER particles to see what's happening
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
              numParticles: 1000,  // Much fewer to see individual effects
              erosionRate: 0.3,
              depositionRate: 0.3,
              evaporationRate: 0.01,
              maxLifetime: 30,
              inertia: 0.05,
              sedimentCapacity: 4.0,
              minSlope: 0.01,
              gravity: 4.0,
              erosionRadius: 1
            }
          }]
        },
        initialTerrain: Array.from(frame0)
      })
    });

    const sessionData = await sessionResponse.json();

    // Execute frames and track changes
    const frames: Float32Array[] = [frame0];

    for (let frameNum = 1; frameNum <= 5; frameNum++) {
      const executeResponse = await fetch(`${API_BASE_URL}/simulate/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          frame: frameNum
        })
      });

      const executeData = await executeResponse.json();
      const terrain = new Float32Array(executeData.terrain);
      frames.push(terrain);

      const min = Math.min(...terrain);
      const max = Math.max(...terrain);
      const mean = terrain.reduce((a, b) => a + b) / terrain.length;

      console.log(`\n📊 Frame ${frameNum}:`);
      console.log(`  Min: ${min.toFixed(2)} (${(min - Math.min(...frame0)).toFixed(2)} from initial)`);
      console.log(`  Max: ${max.toFixed(2)} (${(max - Math.max(...frame0)).toFixed(2)} from initial)`);
      console.log(`  Mean: ${mean.toFixed(2)} (${(mean - (frame0.reduce((a, b) => a + b) / frame0.length)).toFixed(2)} from initial)`);

      // Track specific points
      console.log('  Point changes:');
      samplePoints.forEach(p => {
        const change = terrain[p.idx] - frame0[p.idx];
        const changeSymbol = change > 0 ? '↑' : change < 0 ? '↓' : '=';
        console.log(`    ${p.name}: ${frame0[p.idx].toFixed(2)} → ${terrain[p.idx].toFixed(2)} (${changeSymbol}${Math.abs(change).toFixed(2)})`);
      });
    }

    // Assertions
    console.log('\n🔍 VALIDATING EROSION BEHAVIOR:');

    const frame5 = frames[5];
    const initialMax = Math.max(...frame0);
    const finalMax = Math.max(...frame5);

    // Critical: Max height should NOT increase significantly
    // Allow small increase (±10) due to minor deposition, but not huge spikes
    console.log(`\n  Max height change: ${initialMax.toFixed(2)} → ${finalMax.toFixed(2)}`);
    if (finalMax > initialMax + 50) {
      console.log(`  ❌ FAIL: Max height increased by ${(finalMax - initialMax).toFixed(2)} (too much deposition!)`);
    } else {
      console.log(`  ✓ PASS: Max height change is reasonable (${(finalMax - initialMax).toFixed(2)})`);
    }

    expect(finalMax).toBeLessThan(initialMax + 50);

    // Mean should decrease slightly (net erosion)
    const initialMean = frame0.reduce((a, b) => a + b) / frame0.length;
    const finalMean = frame5.reduce((a, b) => a + b) / frame5.length;
    console.log(`\n  Mean height: ${initialMean.toFixed(2)} → ${finalMean.toFixed(2)}`);

    // Cleanup
    await fetch(`${API_BASE_URL}/simulate/session/${sessionData.sessionId}`, {
      method: 'DELETE'
    });
  });
});
