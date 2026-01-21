/**
 * Spike Diagnosis Test
 *
 * Tracks volume changes and local maxima to identify where spikes originate
 */

// Load the addon
let erosionAddon;
try {
  erosionAddon = require('./libs/core/bindings/node/build/Release/terrain_erosion_native.node');
} catch (err) {
  console.error('❌ Failed to load erosion addon:', err.message);
  process.exit(1);
}

/**
 * Calculate total volume (sum of all heights)
 */
function calculateVolume(terrain) {
  let sum = 0;
  for (let i = 0; i < terrain.length; i++) {
    sum += terrain[i];
  }
  return sum;
}

/**
 * Identify local maximum regions
 * A cell is a local max if it's >= all 8 neighbors
 */
function findLocalMaxima(terrain, width, height) {
  const maxima = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const centerHeight = terrain[idx];

      // Check all 8 neighbors
      let isLocalMax = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const neighborIdx = (y + dy) * width + (x + dx);
          if (terrain[neighborIdx] > centerHeight) {
            isLocalMax = false;
            break;
          }
        }
        if (!isLocalMax) break;
      }

      if (isLocalMax) {
        maxima.push({
          x,
          y,
          idx,
          height: centerHeight
        });
      }
    }
  }

  return maxima;
}

/**
 * Create simple test terrain with known peaks
 */
function createTestTerrain(width, height) {
  const terrain = new Float32Array(width * height);

  // Create a smooth Gaussian-like terrain with clear peaks
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Create a central peak
      const peak1 = Math.exp(-(dist * dist) / 50) * 10;

      // Add secondary peaks
      const dx2 = x - (centerX - 8);
      const dy2 = y - (centerY - 8);
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const peak2 = Math.exp(-(dist2 * dist2) / 30) * 7;

      const dx3 = x - (centerX + 8);
      const dy3 = y - (centerY + 8);
      const dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
      const peak3 = Math.exp(-(dist3 * dist3) / 30) * 7;

      terrain[y * width + x] = peak1 + peak2 + peak3;
    }
  }

  return terrain;
}

/**
 * Apply erosion using the actual C++ addon
 */
function applyErosion(terrain, width, height, numParticles, absoluteMaxHeight) {
  return erosionAddon.simulateErosion(
    terrain,
    width,
    height,
    {
      maxDropletLifetime: 30,
      inertia: 0.05,
      sedimentCapacityFactor: 4.0,
      minSedimentCapacity: 0.01,
      erodeSpeed: 0.25,
      depositSpeed: 0.18,
      evaporateSpeed: 0.01,
      gravity: 4.0,
      maxDropletSpeed: 10.0,
      erosionRadius: 1,
      numParticles: numParticles,
      absoluteMaxElevation: absoluteMaxHeight  // Pass Frame 0 max to prevent progressive frame compounding
    }
  );
}

// ============================================================================
// MAIN TEST
// ============================================================================

console.log('\n🔬 SPIKE DIAGNOSIS TEST\n');
console.log('=' .repeat(70));

const WIDTH = 32;
const HEIGHT = 32;
const NUM_FRAMES = 4;
const PARTICLES_PER_FRAME = 500;

// Initialize terrain
let terrain = createTestTerrain(WIDTH, HEIGHT);
const initialVolume = calculateVolume(terrain);
const initialMaxima = findLocalMaxima(terrain, WIDTH, HEIGHT);
const initialMaxHeight = Math.max(...terrain);  // Store Frame 0 max for progressive frame fix

console.log('\n📊 INITIAL STATE:');
console.log(`  Terrain size: ${WIDTH}x${HEIGHT}`);
console.log(`  Total volume: ${initialVolume.toFixed(2)}`);
console.log(`  Local maxima found: ${initialMaxima.length}`);
console.log(`  Peak heights: ${initialMaxima.map(m => m.height.toFixed(2)).join(', ')}`);
console.log(`  Global max: ${initialMaxHeight.toFixed(6)}`);

// Store maxima tracking
const maximaTracking = initialMaxima.map(m => ({
  x: m.x,
  y: m.y,
  idx: m.idx,
  heights: [m.height]
}));

// Track volume changes
const volumeHistory = [initialVolume];

console.log('\n🔄 RUNNING EROSION FRAMES...\n');

let spikeErrors = 0;
let massGainErrors = 0;

// Run erosion for N frames
for (let frame = 1; frame <= NUM_FRAMES; frame++) {
  // Apply erosion (progressive - builds on previous frame)
  terrain = applyErosion(terrain, WIDTH, HEIGHT, PARTICLES_PER_FRAME, initialMaxHeight);

  const volume = calculateVolume(terrain);
  volumeHistory.push(volume);

  const volumeChange = volume - volumeHistory[frame - 1];
  const volumeChangePercent = (volumeChange / volumeHistory[frame - 1]) * 100;

  console.log(`Frame ${frame}:`);
  console.log(`  Volume: ${volume.toFixed(2)} (Δ${volumeChange >= 0 ? '+' : ''}${volumeChange.toFixed(4)}, ${volumeChangePercent >= 0 ? '+' : ''}${volumeChangePercent.toFixed(3)}%)`);

  // Check for mass gain (should not increase!)
  if (volumeChange > 0.01) {
    console.log(`  ❌ MASS GAIN DETECTED! Volume increased by ${volumeChange.toFixed(4)}`);
    massGainErrors++;
  }

  // Check each original local maximum
  let frameHasSpikes = false;
  maximaTracking.forEach((maxPoint, i) => {
    const currentHeight = terrain[maxPoint.idx];
    const previousHeight = maxPoint.heights[maxPoint.heights.length - 1];
    const initialHeight = maxPoint.heights[0];
    const heightChange = currentHeight - previousHeight;

    maxPoint.heights.push(currentHeight);

    if (heightChange > 0.001) {
      console.log(`  ❌ SPIKE at maxima #${i + 1} (${maxPoint.x},${maxPoint.y}):`);
      console.log(`     Initial: ${initialHeight.toFixed(6)} → Now: ${currentHeight.toFixed(6)}`);
      console.log(`     Change: +${heightChange.toFixed(6)} (SHOULD NOT INCREASE!)`);
      frameHasSpikes = true;
      spikeErrors++;
    }
  });

  if (!frameHasSpikes && volumeChange <= 0.01) {
    console.log(`  ✅ No spikes detected, mass conserved`);
  }

  console.log('');
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('=' .repeat(70));
console.log('📋 SUMMARY\n');

console.log('Volume History:');
volumeHistory.forEach((vol, i) => {
  const change = i > 0 ? vol - volumeHistory[i - 1] : 0;
  console.log(`  Frame ${i}: ${vol.toFixed(2)} (${i > 0 ? (change >= 0 ? '+' : '') + change.toFixed(4) : 'initial'})`);
});

const totalVolumeChange = volumeHistory[volumeHistory.length - 1] - initialVolume;
console.log(`\nTotal volume change: ${totalVolumeChange >= 0 ? '+' : ''}${totalVolumeChange.toFixed(4)}`);

console.log('\nLocal Maxima Tracking:');
maximaTracking.forEach((maxPoint, i) => {
  console.log(`  Peak #${i + 1} at (${maxPoint.x},${maxPoint.y}):`);
  console.log(`    Heights: ${maxPoint.heights.map(h => h.toFixed(3)).join(' → ')}`);
  const totalChange = maxPoint.heights[maxPoint.heights.length - 1] - maxPoint.heights[0];
  console.log(`    Total change: ${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(6)}`);
});

console.log('\n🎯 DIAGNOSTIC RESULTS:');
if (massGainErrors > 0) {
  console.log(`  ❌ Mass gain detected in ${massGainErrors} frame(s)`);
  console.log(`     → Deposition is adding more material than erosion removes`);
}
if (spikeErrors > 0) {
  console.log(`  ❌ Spikes detected at ${spikeErrors} local maxima occurrence(s)`);
  console.log(`     → Local peaks are gaining height (should only erode)`);
}
if (massGainErrors === 0 && spikeErrors === 0) {
  console.log(`  ✅ No issues detected - mass conserved, no spikes`);
} else {
  console.log('\n💡 DIAGNOSIS:');
  if (massGainErrors > 0 && spikeErrors > 0) {
    console.log('  → Both mass gain AND spikes suggest deposition is exceeding constraints');
  } else if (spikeErrors > 0 && massGainErrors === 0) {
    console.log('  → Spikes without mass gain = erosion blocked at peaks, deposition happening elsewhere');
  } else if (massGainErrors > 0 && spikeErrors === 0) {
    console.log('  → Mass gain without spikes = deposition in valleys but too much');
  }
}

console.log('\n');
