/**
 * Node.js wrapper for TerrainSim hydraulic erosion native addon
 *
 * This module provides a JavaScript interface to the C++ hydraulic erosion engine.
 */

const addon = require('./build/Release/terrain_erosion_native.node');

/**
 * Default erosion parameters matching C++ defaults
 */
const DEFAULT_PARAMS = {
    numParticles: 10000,
    maxIterations: 30,
    inertia: 0.05,
    sedimentCapacityFactor: 4.0,
    minSedimentCapacity: 0.01,
    erodeSpeed: 0.3,
    depositSpeed: 0.3,
    evaporateSpeed: 0.01,
    gravity: 4.0,
    maxDropletSpeed: 10.0,
    erosionRadius: 3
};

/**
 * Simulate hydraulic erosion on a heightmap
 *
 * @param {Float32Array} heightmap - Heightmap data (row-major order)
 * @param {number} width - Width of the heightmap
 * @param {number} height - Height of the heightmap
 * @param {Object} params - Erosion parameters (optional)
 * @returns {Float32Array} - Modified heightmap (same array, modified in-place)
 */
function simulateErosion(heightmap, width, height, params = {}) {
    // Validate inputs
    if (!(heightmap instanceof Float32Array)) {
        throw new TypeError('heightmap must be a Float32Array');
    }
    if (typeof width !== 'number' || typeof height !== 'number') {
        throw new TypeError('width and height must be numbers');
    }
    if (width * height !== heightmap.length) {
        throw new Error(`Heightmap size (${heightmap.length}) doesn't match width * height (${width * height})`);
    }

    // Merge with defaults
    const mergedParams = { ...DEFAULT_PARAMS, ...params };

    // Call native addon
    return addon.simulateErosion(heightmap, width, height, mergedParams);
}

/**
 * Simulate a single erosion particle (for frame-by-frame animation)
 *
 * @param {Float32Array} heightmap - Heightmap data (row-major order)
 * @param {number} width - Width of the heightmap
 * @param {number} height - Height of the heightmap
 * @param {number} startX - Particle starting X position (0 to width-1)
 * @param {number} startY - Particle starting Y position (0 to height-1)
 * @param {Object} params - Erosion parameters (optional)
 * @returns {Float32Array} - Modified heightmap (same array, modified in-place)
 */
function simulateParticle(heightmap, width, height, startX, startY, params = {}) {
    // Validate inputs
    if (!(heightmap instanceof Float32Array)) {
        throw new TypeError('heightmap must be a Float32Array');
    }
    if (typeof width !== 'number' || typeof height !== 'number') {
        throw new TypeError('width and height must be numbers');
    }
    if (typeof startX !== 'number' || typeof startY !== 'number') {
        throw new TypeError('startX and startY must be numbers');
    }
    if (width * height !== heightmap.length) {
        throw new Error(`Heightmap size (${heightmap.length}) doesn't match width * height (${width * height})`);
    }

    // Merge with defaults
    const mergedParams = { ...DEFAULT_PARAMS, ...params };

    // Call native addon
    return addon.simulateParticle(heightmap, width, height, startX, startY, mergedParams);
}

/**
 * Get version information about the native addon
 *
 * @returns {Object} - Version information
 */
function getVersion() {
    return addon.getVersion();
}

module.exports = {
    simulateErosion,
    simulateParticle,
    getVersion,
    DEFAULT_PARAMS
};
