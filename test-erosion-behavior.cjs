/**
 * Test 2.1: Simple Terrain Behavior
 *
 * Tests erosion on extremely simple terrain to understand the algorithm behavior.
 * Uses a single peak or flat terrain to isolate deposition mechanics.
 */

const path = require('path');

// Find the addon
let erosionAddon;
try {
  // Try direct path to the actual addon location
  erosionAddon = require('./libs/core/bindings/node/build/Release/terrain_erosion_native.node');
} catch (err) {
  console.error('❌ Failed to load erosion addon:', err.message);
  console.error('   Tried: ./libs/core/bindings/node/build/Release/terrain_erosion_native.node');
  process.exit(1);
}

function analyzeHeightmap(data, label = '') {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const mean = data.reduce((a, b) => a + b) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  console.log(`\n📊 ${label}:`);
  console.log(`  Min:    ${min.toFixed(6)}`);
  console.log(`  Max:    ${max.toFixed(6)}`);
  console.log(`  Mean:   ${mean.toFixed(6)}`);
  console.log(`  StdDev: ${stdDev.toFixed(6)}`);
  console.log(`  Range:  ${(max - min).toFixed(6)}`);

  return { min, max, mean, variance, stdDev };
}

function countValuesAbove(data, threshold) {
  return data.filter(v => v > threshold).length;
}

function countValuesBelow(data, threshold) {
  return data.filter(v => v < threshold).length;
}

console.log('\n🧪 Test 2.1: Simple Terrain Behavior\n');
console.log('=' .repeat(60));

// Test 1: Single Peak in Center
console.log('\n\n📍 TEST 1: Single Peak (Should only erode, not add height)');
console.log('-'.repeat(60));

const width = 64;
const height = 64;
const size = width * height;

// Create terrain with single peak at center
const singlePeak = new Float32Array(size);
const centerX = Math.floor(width / 2);
const centerY = Math.floor(height / 2);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 20;

    // Gaussian peak
    singlePeak[y * width + x] = Math.max(0, Math.exp(-(dist * dist) / (maxDist * maxDist)) * 10);
  }
}

const before1 = analyzeHeightmap(singlePeak, 'Before Erosion');

// Apply erosion with few particles
const eroded1 = erosionAddon.simulateErosion(
  singlePeak,  // Already Float32Array
  width,
  height,
  {
    maxDropletLifetime: 30,
    inertia: 0.05,
    sedimentCapacityFactor: 4.0,
    minSedimentCapacity: 0.01,
    erodeSpeed: 0.3,
    depositSpeed: 0.3,
    evaporateSpeed: 0.01,
    gravity: 4.0,
    maxDropletSpeed: 10.0,
    erosionRadius: 1,
    numParticles: 500
  }
);

const after1 = analyzeHeightmap(eroded1, 'After Erosion (500 particles)');

console.log('\n🔍 Analysis:');
const maxIncrease1 = after1.max - before1.max;
const minDecrease1 = after1.min - before1.min;

if (maxIncrease1 > 0.1) {
  console.log(`  ❌ FAIL: Max increased by ${maxIncrease1.toFixed(6)} (should not increase!)`);
} else {
  console.log(`  ✅ PASS: Max changed by ${maxIncrease1.toFixed(6)}`);
}

if (minDecrease1 < 0) {
  console.log(`  ✅ PASS: Min decreased by ${Math.abs(minDecrease1).toFixed(6)} (erosion working)`);
} else {
  console.log(`  ⚠️  WARNING: Min increased by ${minDecrease1.toFixed(6)}`);
}

const pointsAboveOriginalMax = countValuesAbove(eroded1, before1.max);
console.log(`  Points above original max: ${pointsAboveOriginalMax} / ${size} (${(pointsAboveOriginalMax / size * 100).toFixed(2)}%)`);

if (pointsAboveOriginalMax > 0) {
  console.log(`  ❌ CRITICAL: Deposition created ${pointsAboveOriginalMax} points higher than original peak!`);
}

// Test 2: Flat Terrain
console.log('\n\n📍 TEST 2: Flat Terrain (Should remain mostly flat)');
console.log('-'.repeat(60));

const flatTerrain = new Float32Array(size).fill(5.0);  // Perfectly flat at elevation 5
const before2 = analyzeHeightmap(flatTerrain, 'Before Erosion');

const eroded2 = erosionAddon.simulateErosion(
  flatTerrain,  // Already Float32Array
  width,
  height,
  {
    maxDropletLifetime: 30,
    inertia: 0.05,
    sedimentCapacityFactor: 4.0,
    minSedimentCapacity: 0.01,
    erodeSpeed: 0.3,
    depositSpeed: 0.3,
    evaporateSpeed: 0.01,
    gravity: 4.0,
    maxDropletSpeed: 10.0,
    erosionRadius: 1,
    numParticles: 500
  }
);

const after2 = analyzeHeightmap(eroded2, 'After Erosion (500 particles)');

console.log('\n🔍 Analysis:');
const maxChange2 = after2.max - before2.max;
const minChange2 = after2.min - before2.min;

console.log(`  Max change: ${maxChange2 >= 0 ? '+' : ''}${maxChange2.toFixed(6)}`);
console.log(`  Min change: ${minChange2 >= 0 ? '+' : ''}${minChange2.toFixed(6)}`);
console.log(`  StdDev: ${before2.stdDev.toFixed(6)} → ${after2.stdDev.toFixed(6)}`);

if (Math.abs(maxChange2) < 1.0 && Math.abs(minChange2) < 1.0) {
  console.log(`  ✅ PASS: Flat terrain remained relatively flat`);
} else {
  console.log(`  ❌ FAIL: Flat terrain developed significant variation`);
}

// Test 3: Valley (low area between two ridges)
console.log('\n\n📍 TEST 3: Valley Between Ridges (Should fill valley, not raise ridges)');
console.log('-'.repeat(60));

const valleyTerrain = new Float32Array(size);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (x < 20 || x > 44) {
      valleyTerrain[y * width + x] = 10.0;  // Ridges at height 10
    } else {
      valleyTerrain[y * width + x] = 2.0;   // Valley at height 2
    }
  }
}

const before3 = analyzeHeightmap(valleyTerrain, 'Before Erosion');
const ridgeHeight = 10.0;

const eroded3 = erosionAddon.simulateErosion(
  valleyTerrain,  // Already Float32Array
  width,
  height,
  {
    maxDropletLifetime: 30,
    inertia: 0.05,
    sedimentCapacityFactor: 4.0,
    minSedimentCapacity: 0.01,
    erodeSpeed: 0.3,
    depositSpeed: 0.3,
    evaporateSpeed: 0.01,
    gravity: 4.0,
    maxDropletSpeed: 10.0,
    erosionRadius: 1,
    numParticles: 1000
  }
);

const after3 = analyzeHeightmap(eroded3, 'After Erosion (1000 particles)');

console.log('\n🔍 Analysis:');
const ridgePointsAbove = countValuesAbove(eroded3, ridgeHeight);
const valleyPointsAbove = countValuesAbove(eroded3, before3.mean);

console.log(`  Points above original ridge height (${ridgeHeight}): ${ridgePointsAbove}`);
console.log(`  Mean elevation: ${before3.mean.toFixed(2)} → ${after3.mean.toFixed(2)}`);

if (ridgePointsAbove > 0) {
  console.log(`  ❌ CRITICAL: ${ridgePointsAbove} points now exceed ridge height!`);
  console.log(`  ❌ Deposition should not raise terrain above existing peaks`);
} else {
  console.log(`  ✅ PASS: No points exceed original ridge height`);
}

if (after3.mean > before3.mean + 0.5) {
  console.log(`  ❌ FAIL: Mean elevation increased significantly (${(after3.mean - before3.mean).toFixed(2)})`);
} else {
  console.log(`  ✅ PASS: Mean elevation roughly conserved`);
}

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('📋 SUMMARY');
console.log('='.repeat(60));

console.log('\n🎯 Expected Behavior:');
console.log('  1. Erosion should NEVER increase max elevation above original');
console.log('  2. Flat terrain should remain mostly flat (low variance)');
console.log('  3. Valleys should fill but ridges should not grow');
console.log('  4. Mean elevation should be roughly conserved');

console.log('\n🔬 Observed Behavior:');
console.log(`  1. Single Peak: Max ${maxIncrease1 > 0.1 ? 'INCREASED' : 'decreased'} by ${Math.abs(maxIncrease1).toFixed(2)}`);
console.log(`  2. Flat Terrain: StdDev ${after2.stdDev > before2.stdDev * 2 ? 'INCREASED' : 'stable'} (${before2.stdDev.toFixed(2)} → ${after2.stdDev.toFixed(2)})`);
console.log(`  3. Valley: ${ridgePointsAbove > 0 ? 'Ridges RAISED' : 'Ridges preserved'}`);

const allTestsPassed = (
  maxIncrease1 <= 0.1 &&
  Math.abs(maxChange2) < 1.0 &&
  Math.abs(minChange2) < 1.0 &&
  ridgePointsAbove === 0
);

if (allTestsPassed) {
  console.log('\n✅ ALL TESTS PASSED - Algorithm behaves correctly');
} else {
  console.log('\n❌ TESTS FAILED - Algorithm has fundamental issues');
  console.log('\n💡 Recommended Fixes:');
  console.log('   1. Add global max elevation constraint to deposition');
  console.log('   2. Only allow deposition in cells below median/mean elevation');
  console.log('   3. Reduce depositionRate parameter');
  console.log('   4. Implement sediment capacity based on local slope');
}

console.log('\n');
