/**
 * ES module wrapper for the terrain-job-system-native CommonJS binding
 *
 * This allows TypeScript/ES modules to use the C++ job system binding
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Path to the native binding
const bindingPath = join(__dirname, '../../../libs/core/bindings/node/job-system.js');

// Load the native addon
const jobSystem = require(bindingPath);

export const validateConfig = jobSystem.validateConfig;
export const executeFrame = jobSystem.executeFrame;

export default jobSystem;
