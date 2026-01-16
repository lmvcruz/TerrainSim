/**
 * ES module wrapper for the terrain-erosion-native CommonJS binding
 *
 * This allows TypeScript/ES modules to use the C++ binding
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Path to the native binding
const bindingPath = join(__dirname, '../../../libs/core/bindings/node/index.js');

// Load the native addon
const erosion = require(bindingPath);

// Only export what's actually used
export const simulateParticle = erosion.simulateParticle;
export const executeFrame = erosion.executeFrame;
