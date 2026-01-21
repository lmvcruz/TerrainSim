/**
 * Test to check if erosion produces reasonable values
 */
const addon = require('./libs/core/bindings/node/build/Release/terrain_erosion_native.node');

const width = 192;
const height = 192;

// Generate simple terrain (plane with some variation)
const terrain = new Float32Array(width * height);
for (let i = 0; i < terrain.length; i++) {
  // Use a gentler terrain: base height 50 + small random variation
  terrain[i] = 50 + (Math.random() - 0.5) * 20; // Range: 40-60
}

// Calculate initial stats
const calcStats = (data) => {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
    sum += data[i];
  }

  const mean = sum / data.length;

  return { min, max, mean, range: max - min };
};

const stats0 = calcStats(terrain);
console.log('\n📊 Before erosion:');
console.log(`  Min: ${stats0.min.toFixed(2)}`);
console.log(`  Max: ${stats0.max.toFixed(2)}`);
console.log(`  Mean: ${stats0.mean.toFixed(2)}`);
console.log(`  Range: ${stats0.range.toFixed(2)}`);

// Apply erosion with the ACTUAL parameters from the frontend
const params = {
  numParticles: 50000,
  maxIterations: 30,
  inertia: 0.05,
  sedimentCapacityFactor: 4.0,
  minSedimentCapacity: 0.01,
  erodeSpeed: 0.3,
  depositSpeed: 0.3,
  evaporateSpeed: 0.01,
  gravity: 4.0,
  maxDropletSpeed: 10.0,
  erosionRadius: 1
};

console.log('\n⚙️  Applying erosion with 50,000 particles, radius=1...');
const result = addon.simulateErosion(terrain, width, height, params);

const stats1 = calcStats(result);
console.log('\n📊 After erosion:');
console.log(`  Min: ${stats1.min.toFixed(2)}`);
console.log(`  Max: ${stats1.max.toFixed(2)}`);
console.log(`  Mean: ${stats1.mean.toFixed(2)}`);
console.log(`  Range: ${stats1.range.toFixed(2)}`);

console.log('\n📈 Changes:');
console.log(`  Min change: ${(stats1.min - stats0.min).toFixed(2)}`);
console.log(`  Max change: ${(stats1.max - stats0.max).toFixed(2)}`);
console.log(`  Mean change: ${(stats1.mean - stats0.mean).toFixed(2)}`);
console.log(`  Range change: ${(stats1.range - stats0.range).toFixed(2)}`);

// Check if values are reasonable (not exploding)
const minReasonable = stats1.min > -500;
const maxReasonable = stats1.max < 500;
const rangeReasonable = stats1.range < 300;

console.log('\n✅ Sanity checks:');
console.log(`  Min > -500: ${minReasonable ? '✓' : '✗'} (${stats1.min.toFixed(2)})`);
console.log(`  Max < 500: ${maxReasonable ? '✓' : '✗'} (${stats1.max.toFixed(2)})`);
console.log(`  Range < 300: ${rangeReasonable ? '✓' : '✗'} (${stats1.range.toFixed(2)})`);

if (!minReasonable || !maxReasonable || !rangeReasonable) {
  console.log('\n❌ EROSION VALUES ARE TOO EXTREME!\n');
  process.exit(1);
} else {
  console.log('\n✅ Erosion values are reasonable\n');
}
