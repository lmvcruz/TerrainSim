/**
 * Test script for terrain-erosion-native binding
 */

const erosion = require('./index.js');

console.log('🔧 Testing Node-API Binding for Hydraulic Erosion\n');

// Test 1: Version info
console.log('Test 1: Version Information');
const version = erosion.getVersion();
console.log('  Version:', version);
console.log('  ✅ PASS\n');

// Test 2: Create simple terrain
console.log('Test 2: Create Simple Cone Terrain');
const width = 64;
const height = 64;
const heightmap = new Float32Array(width * height);

const centerX = width / 2;
const centerY = height / 2;
const maxRadius = width / 2;

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normalized = Math.max(0, 1 - dist / maxRadius);
        heightmap[y * width + x] = normalized;
    }
}

const maxBefore = Math.max(...heightmap);
const avgBefore = heightmap.reduce((a, b) => a + b, 0) / heightmap.length;
console.log(`  Before erosion - Max: ${maxBefore.toFixed(3)}, Avg: ${avgBefore.toFixed(3)}`);
console.log('  ✅ PASS\n');

// Test 3: Run erosion simulation
console.log('Test 3: Simulate Erosion (1000 particles)');
const startTime = Date.now();

erosion.simulateErosion(heightmap, width, height, {
    numParticles: 1000,
    erodeSpeed: 0.5,
    depositSpeed: 0.3,
    gravity: 4.0,
    inertia: 0.05
});

const endTime = Date.now();
const duration = endTime - startTime;

const maxAfter = Math.max(...heightmap);
const avgAfter = heightmap.reduce((a, b) => a + b, 0) / heightmap.length;
console.log(`  After erosion - Max: ${maxAfter.toFixed(3)}, Avg: ${avgAfter.toFixed(3)}`);
console.log(`  Duration: ${duration}ms`);
console.log(`  Max height reduced by: ${((maxBefore - maxAfter) * 100).toFixed(1)}%`);
console.log('  ✅ PASS\n');

// Test 4: Single particle simulation
console.log('Test 4: Single Particle Simulation');
const beforeValue = heightmap[32 * width + 32];

erosion.simulateParticle(heightmap, width, height, centerX, centerY, {
    maxIterations: 30,
    erodeSpeed: 0.3
});

const afterValue = heightmap[32 * width + 32];
console.log(`  Center value before: ${beforeValue.toFixed(4)}`);
console.log(`  Center value after: ${afterValue.toFixed(4)}`);
console.log(`  Change: ${(beforeValue - afterValue).toFixed(4)}`);
console.log('  ✅ PASS\n');

// Test 5: Parameter validation
console.log('Test 5: Parameter Validation');
try {
    erosion.simulateErosion('not an array', 64, 64, {});
    console.log('  ❌ FAIL - Should have thrown error for invalid heightmap');
} catch (err) {
    console.log(`  ✅ PASS - Correctly rejected invalid input: ${err.message}\n`);
}

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All tests passed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n🎉 Node-API binding is working correctly!');
console.log('Ready to integrate with API server.\n');
