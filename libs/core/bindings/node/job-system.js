/**
 * CommonJS wrapper for terrain-job-system-native Node-API addon
 */

const path = require('path');
const bindingPath = path.join(__dirname, 'build/Release/terrain_job_system_native.node');

try {
  const binding = require(bindingPath);
  module.exports = binding;
} catch (error) {
  console.error('Failed to load terrain-job-system-native binding:', error.message);
  console.error('  Expected path:', bindingPath);
  console.error('  You may need to build the native addon first:');
  console.error('    cd libs/core/bindings/node');
  console.error('    cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE=CMakeLists-job-system.txt');
  console.error('    cmake --build build --config Release');
  throw error;
}
