#!/usr/bin/env node
/**
 * Test the ACTUAL data returned by backend for different frames
 */

async function testBackendFrames() {
  console.log('🧪 TESTING BACKEND FRAME DATA');
  console.log('═'.repeat(60));

  try {
    // Step 1: Generate terrain
    console.log('\n📡 Step 1: Generate terrain');
    const generateResponse = await fetch('http://localhost:3001/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        width: 256,
        height: 256,
        noiseType: 'perlin',
        seed: 12345
      })
    });

    const generateData = await generateResponse.json();
    const initialTerrain = generateData.data; // It's 'data', not 'terrain'
    console.log(`   ✅ Generated terrain: ${initialTerrain.length} values`);
    console.log(`   Statistics: min=${generateData.statistics.min.toFixed(2)}, max=${generateData.statistics.max.toFixed(2)}`);

    // Step 2: Create session
    console.log('\n📡 Step 2: Create session with initial terrain');
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

    // Step 3: Execute frames and collect data
    console.log('\n📡 Step 3: Execute frames 1-4');
    const frames = {};
    frames[0] = initialTerrain;

    for (let frame = 1; frame <= 4; frame++) {
      const response = await fetch('http://localhost:3001/simulate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, frame })
      });

      const data = await response.json();
      frames[frame] = data.terrain;

      console.log(`   Frame ${frame}: min=${data.statistics.min.toFixed(2)}, max=${data.statistics.max.toFixed(2)}, range=${data.statistics.range.toFixed(2)}`);
    }

    // Step 4: Compare values at specific indices
    console.log('\n📊 SAMPLE VALUES AT KEY INDICES');
    console.log('═'.repeat(80));
    const sampleIndices = [0, 1000, 10000, 32768, 50000, 65000];

    console.log('Index'.padEnd(10) + 'Frame0'.padEnd(14) + 'Frame1'.padEnd(14) + 'Frame2'.padEnd(14) + 'Frame3'.padEnd(14) + 'Frame4');
    console.log('─'.repeat(80));

    for (const idx of sampleIndices) {
      const row = [idx.toString().padEnd(10)];
      for (let f = 0; f <= 4; f++) {
        row.push(frames[f][idx].toFixed(4).padEnd(13));
      }
      console.log(row.join(' '));
    }

    // Step 5: Calculate differences
    console.log('\n🔍 FRAME DIFFERENCE ANALYSIS');
    console.log('═'.repeat(60));

    for (let frame = 1; frame <= 4; frame++) {
      let identicalCount = 0;
      let changedCount = 0;
      let totalDiff = 0;
      let maxDiff = 0;

      for (let i = 0; i < frames[0].length; i++) {
        const diff = Math.abs(frames[frame][i] - frames[0][i]);
        totalDiff += diff;
        maxDiff = Math.max(maxDiff, diff);

        if (diff < 0.0001) {
          identicalCount++;
        } else {
          changedCount++;
        }
      }

      const percentIdentical = (identicalCount / frames[0].length * 100).toFixed(2);
      const avgDiff = (totalDiff / frames[0].length).toFixed(6);

      console.log(`\nFrame 0 → Frame ${frame}:`);
      console.log(`   Identical values: ${identicalCount.toLocaleString()} / ${frames[0].length.toLocaleString()} (${percentIdentical}%)`);
      console.log(`   Changed values: ${changedCount.toLocaleString()} (${(100 - parseFloat(percentIdentical)).toFixed(2)}%)`);
      console.log(`   Average difference: ${avgDiff}`);
      console.log(`   Maximum difference: ${maxDiff.toFixed(6)}`);

      if (changedCount === 0) {
        console.log(`   ❌ FRAMES ARE IDENTICAL - NO SIMULATION HAPPENING!`);
      } else {
        console.log(`   ✅ Frames ARE different`);
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testBackendFrames().catch(console.error);
