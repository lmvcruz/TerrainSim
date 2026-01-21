const addon = require('./libs/core/bindings/node/build/Release/terrain_erosion_native.node');

const terrain = new Float32Array(100);
for (let i = 0; i < 100; i++) {
  terrain[i] = Math.random() * 100;
}

console.log('Before erosion:');
console.log('  Sample values:', terrain.slice(0, 5));

const params = {
  numParticles: 1000,
  erosionRadius: 1,
  maxIterations: 30,
  inertia: 0.05,
  sedimentCapacityFactor: 4.0,
  minSedimentCapacity: 0.01,
  erodeSpeed: 0.3,
  depositSpeed: 0.3,
  evaporateSpeed: 0.01,
  gravity: 4.0,
  maxDropletSpeed: 10.0
};

const result = addon.simulateErosion(terrain, 10, 10, params);

console.log('\nAfter erosion:');
console.log('  Sample values:', result.slice(0, 5));
console.log('  Same array?', result === terrain);

// Check if ANY value changed
let changed = false;
for (let i = 0; i < terrain.length; i++) {
  if (Math.abs(terrain[i] - result[i]) > 0.0001) {
    changed = true;
    break;
  }
}
console.log('  Values changed?', changed);
