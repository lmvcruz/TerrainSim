#!/usr/bin/env node
/**
 * Test to verify that heightmapCache contains DIFFERENT data for each frame
 */

async function testFrameCache() {
  console.log('🧪 TESTING HEIGHTMAP CACHE CONTENT');
  console.log('═'.repeat(60));

  try {
    // Step 1: Generate terrain and run simulation
    console.log('\n📡 Step 1: Generate terrain');
    const generateResponse = await fetch('http://localhost:3001/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        width: 256,
        height: 256,
        noiseType: 'perlin',
        seed: 12345,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2.0,
        scale: 100,
        zScale: 80
      })
    });

    const { terrain: initialTerrain } = await generateResponse.json();
    console.log(`   ✅ Generated terrain: ${initialTerrain.length} values`);

    // Step 2: Create session with initial terrain
    console.log('\n📡 Step 2: Create session');
    const createResponse = await fetch('http://localhost:3001/simulate/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: { totalFrames: 10 },
        initialTerrain
      })
    });

    const { sessionId } = await createResponse.json();
    console.log(`   ✅ Session created: ${sessionId}`);

    // Step 3: Execute frames 1-4 and collect terrain data
    console.log('\n📡 Step 3: Execute simulation for frames 1-4');
    const frames = {};

    // Frame 0 = initial terrain
    frames[0] = initialTerrain;

    for (let frame = 1; frame <= 4; frame++) {
      const response = await fetch('http://localhost:3001/simulate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, frame })
      });

      const { terrain, statistics } = await response.json();
      frames[frame] = terrain;

      console.log(`   Frame ${frame}: min=${statistics.min.toFixed(2)}, max=${statistics.max.toFixed(2)}, range=${statistics.range.toFixed(2)}`);
    }

    // Step 4: Compare frames
    console.log('\n📊 FRAME COMPARISON');
    console.log('═'.repeat(60));

    const sampleIndices = [0, 1000, 10000, 32768, 50000, 65000];

    console.log('\nSample values at key indices:');
    console.log('Index'.padEnd(10) + 'Frame0'.padEnd(12) + 'Frame1'.padEnd(12) + 'Frame2'.padEnd(12) + 'Frame3'.padEnd(12) + 'Frame4');
    console.log('─'.repeat(68));

    for (const idx of sampleIndices) {
      const values = [0, 1, 2, 3, 4].map(f => frames[f][idx].toFixed(3).padEnd(11));
      console.log(`${idx}`.padEnd(10) + values.join(' '));
    }

    // Check if frames are identical
    console.log('\n🔍 Frame Difference Analysis:');
    for (let frame = 1; frame <= 4; frame++) {
      let identicalCount = 0;
      let totalDiff = 0;

      for (let i = 0; i < frames[0].length; i++) {
        const diff = Math.abs(frames[frame][i] - frames[0][i]);
        if (diff < 0.0001) {
          identicalCount++;
        }
        totalDiff += diff;
      }

      const percentIdentical = (identicalCount / frames[0].length * 100).toFixed(2);
      const avgDiff = (totalDiff / frames[0].length).toFixed(4);

      console.log(`   Frame 0 vs Frame ${frame}:`);
      console.log(`      Identical values: ${identicalCount} / ${frames[0].length} (${percentIdentical}%)`);
      console.log(`      Average difference: ${avgDiff}`);

      if (percentIdentical === '100.00') {
        console.log(`      ❌ FRAMES ARE IDENTICAL - NO CHANGES!`);
      } else {
        console.log(`      ✅ Frames are different`);
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testFrameCache().catch(console.error);
