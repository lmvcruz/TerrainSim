#!/usr/bin/env node
/**
 * Test to verify session is created with generated terrain
 */

async function testSessionCreation() {
  console.log('🧪 TESTING SESSION CREATION WITH GENERATED TERRAIN');
  console.log('═'.repeat(60));

  try {
    // Step 1: Generate terrain
    console.log('\n📋 Step 1: Generate Terrain');
    const generateResponse = await fetch('http://localhost:3001/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'perlin',
        width: 256,
        height: 256,
        seed: 12345,
        frequency: 0.05,
        amplitude: 50,
      }),
    });

    if (!generateResponse.ok) {
      throw new Error(`Generate failed: ${generateResponse.status}`);
    }

    const generateData = await generateResponse.json();
    console.log(`   ✅ Terrain generated (${generateData.data.length} points)`);
    console.log(`   📊 Statistics:`, generateData.statistics);

    // Step 2: Create session with generated terrain
    console.log('\n📋 Step 2: Create Session with Generated Terrain');
    const sessionResponse = await fetch('http://localhost:3001/simulate/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          step0: { method: 'perlin', seed: 12345, frequency: 0.05, amplitude: 50 },
          totalFrames: 10,
          jobs: [],
          width: 256,
          height: 256,
        },
        initialTerrain: generateData.data,
      }),
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json().catch(() => ({}));
      throw new Error(`Session creation failed: ${errorData.error || sessionResponse.statusText}`);
    }

    const sessionData = await sessionResponse.json();
    console.log(`   ✅ Session created: ${sessionData.sessionId}`);
    console.log(`   📐 Dimensions: ${sessionData.width}x${sessionData.height}`);
    console.log(`   📊 Initial terrain points: ${sessionData.initialTerrain.length}`);

    // Step 3: Verify terrain matches
    console.log('\n📋 Step 3: Verify Terrain Integrity');
    let matchCount = 0;
    let mismatchCount = 0;
    const sampleSize = Math.min(1000, generateData.data.length);

    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * generateData.data.length);
      if (Math.abs(generateData.data[idx] - sessionData.initialTerrain[idx]) < 0.0001) {
        matchCount++;
      } else {
        mismatchCount++;
      }
    }

    const matchPercentage = (matchCount / sampleSize) * 100;
    console.log(`   Sampled ${sampleSize} points:`);
    console.log(`   ✅ Matches: ${matchCount} (${matchPercentage.toFixed(1)}%)`);
    console.log(`   ❌ Mismatches: ${mismatchCount}`);

    // Final validation
    console.log('\n📊 VALIDATION RESULTS');
    console.log('═'.repeat(60));

    const validations = {
      'Terrain generated': generateData.data.length === 65536,
      'Session created': !!sessionData.sessionId,
      'Session has terrain': sessionData.initialTerrain.length === 65536,
      'Terrain integrity': matchPercentage > 99,
    };

    let allPassed = true;
    for (const [check, passed] of Object.entries(validations)) {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
      if (!passed) allPassed = false;
    }

    console.log('═'.repeat(60));
    console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

    return allPassed;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

testSessionCreation().catch(console.error);
