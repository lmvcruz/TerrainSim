#!/usr/bin/env node
/**
 * Test to calculate expected terrain bounds and optimal camera position
 */

console.log('🧪 TERRAIN BOUNDS ANALYSIS');
console.log('═'.repeat(60));

// Terrain Configuration
const HEIGHTMAP_SIZE = 256; // 256x256 grid
const MESH_WIDTH = 10;      // Physical width in world units
const MESH_DEPTH = 10;      // Physical depth in world units

// Default semi-sphere parameters
const RADIUS_GRID = 80;     // Radius in grid cells
const CENTER_GRID_X = 128;  // Center X in grid cells
const CENTER_GRID_Z = 128;  // Center Z in grid cells

console.log('\n📊 Terrain Configuration:');
console.log(`   Heightmap Size: ${HEIGHTMAP_SIZE}x${HEIGHTMAP_SIZE} grid cells`);
console.log(`   Mesh Physical Size: ${MESH_WIDTH}x${MESH_DEPTH} world units`);
console.log(`   Semi-sphere Radius: ${RADIUS_GRID} grid cells`);
console.log(`   Semi-sphere Center: [${CENTER_GRID_X}, ${CENTER_GRID_Z}] grid cells`);

// Calculate world scale
const worldScale = MESH_WIDTH / HEIGHTMAP_SIZE;
console.log(`\n🔬 World Scale: ${worldScale.toFixed(6)} world units per grid cell`);

// Mesh is centered at origin [0, 0, 0] and extends from -meshWidth/2 to +meshWidth/2
const meshMinX = -MESH_WIDTH / 2;
const meshMaxX = MESH_WIDTH / 2;
const meshMinZ = -MESH_DEPTH / 2;
const meshMaxZ = MESH_DEPTH / 2;

console.log('\n📐 Mesh Bounds (in world coordinates):');
console.log(`   X: ${meshMinX.toFixed(2)} to ${meshMaxX.toFixed(2)}`);
console.log(`   Z: ${meshMinZ.toFixed(2)} to ${meshMaxZ.toFixed(2)}`);
console.log(`   Center: [0, 0, 0]`);

// Calculate maximum height
// Max height = radius in world units
const maxHeightGrid = RADIUS_GRID; // In grid cells
const maxHeightWorld = maxHeightGrid * worldScale;

console.log('\n⛰️  Terrain Height:');
console.log(`   Max Height (grid): ${maxHeightGrid.toFixed(2)} grid cells`);
console.log(`   Max Height (world): ${maxHeightWorld.toFixed(6)} world units`);

// Calculate semi-sphere center in world coordinates
// The mesh goes from -5 to +5 in both X and Z
// Grid cell 0 maps to world X = -5
// Grid cell 128 maps to world X = 0
// Grid cell 256 maps to world X = +5
const semisphereWorldX = meshMinX + (CENTER_GRID_X / HEIGHTMAP_SIZE) * MESH_WIDTH;
const semisphereWorldZ = meshMinZ + (CENTER_GRID_Z / HEIGHTMAP_SIZE) * MESH_DEPTH;

console.log('\n🎯 Semi-sphere World Position:');
console.log(`   Center: [${semisphereWorldX.toFixed(2)}, 0, ${semisphereWorldZ.toFixed(2)}]`);
console.log(`   Radius (world): ${(RADIUS_GRID * worldScale).toFixed(6)} world units`);

// Current camera configuration
const currentCamera = [0, 120, 180];
const currentTarget = [128, 0, 128];

console.log('\n📷 CURRENT Camera Configuration:');
console.log(`   Position: [${currentCamera.join(', ')}]`);
console.log(`   Target: [${currentTarget.join(', ')}]  ⚠️  IN GRID COORDINATES (WRONG!)`);

const distanceCurrent = Math.sqrt(
  currentCamera[0]**2 + currentCamera[1]**2 + currentCamera[2]**2
);
console.log(`   Distance from origin: ${distanceCurrent.toFixed(2)} units`);

// RECOMMENDED camera configuration
console.log('\n✅ RECOMMENDED Camera Configuration:');
console.log(`   Target: [${semisphereWorldX.toFixed(2)}, 0, ${semisphereWorldZ.toFixed(2)}]  (terrain center)`);

// Camera should be positioned to view the entire mesh
// Mesh is 10x10, so diagonal is ~14.14 units
// With max height of ~3.125, we need to see a volume of roughly 14x14x3
// Good camera distance = 1.5 * diagonal = 1.5 * sqrt(10^2 + 10^2 + 3.125^2) ≈ 22 units

const meshDiagonal = Math.sqrt(MESH_WIDTH**2 + MESH_DEPTH**2 + maxHeightWorld**2);
const recommendedDistance = meshDiagonal * 1.5;

console.log(`   Mesh Diagonal: ${meshDiagonal.toFixed(2)} units`);
console.log(`   Recommended Distance: ${recommendedDistance.toFixed(2)} units`);

// Position camera at 45-degree angle for good perspective
const cameraX = semisphereWorldX;
const cameraY = recommendedDistance * 0.7; // Height
const cameraZ = semisphereWorldZ + recommendedDistance * 0.7; // Distance back

console.log(`   Position: [${cameraX.toFixed(2)}, ${cameraY.toFixed(2)}, ${cameraZ.toFixed(2)}]`);
console.log(`   minDistance: ${(recommendedDistance * 0.3).toFixed(2)}`);
console.log(`   maxDistance: ${(recommendedDistance * 3).toFixed(2)}`);

console.log('\n🔧 PROPOSED FIX:');
console.log('━'.repeat(60));
console.log('Camera position: [0, 10, 15]');
console.log('OrbitControls target: [0, 0, 0]');
console.log('minDistance: 5');
console.log('maxDistance: 50');
console.log('━'.repeat(60));

console.log('\n❌ PROBLEM IDENTIFIED:');
console.log('The OrbitControls target is set to [128, 0, 128], which are');
console.log('GRID COORDINATES, not world coordinates!');
console.log('Grid coordinate 128 = world coordinate 0 (the center).');
console.log('So the camera is trying to look at a point FAR OUTSIDE the mesh.');
console.log('\n');
