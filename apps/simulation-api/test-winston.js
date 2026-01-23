#!/usr/bin/env node
/**
 * Test script for Winston logging infrastructure
 * Tests different log levels, rotation, and log file creation
 */

import { logger, simulationLogger, createLogger, setLogLevel } from './src/utils/logging.js';

console.log('🧪 Winston Logging Test Script\n');
console.log('=' .repeat(60));

// Test 1: Log levels
console.log('\n📊 Test 1: Different Log Levels');
console.log('-'.repeat(60));

logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message', { errorCode: 500 });
logger.debug('This is a debug message (should appear in development)');

// Test 2: Component loggers
console.log('\n📊 Test 2: Component-specific Loggers');
console.log('-'.repeat(60));

const testLogger = createLogger('test-component');
testLogger.info('Component logger test', { feature: 'logging', status: 'active' });

const apiLogger = createLogger('api-endpoint');
apiLogger.info('API request received', {
  method: 'POST',
  endpoint: '/generate',
  duration: 150
});

// Test 3: Simulation logger
console.log('\n📊 Test 3: Simulation Logger');
console.log('-'.repeat(60));

simulationLogger.info('Simulation started', {
  particles: 1000,
  terrain: '256x256',
  algorithm: 'hydraulic-erosion'
});

simulationLogger.debug('Simulation progress', {
  particlesProcessed: 500,
  progress: 0.5
});

// Test 4: Error with stack trace
console.log('\n📊 Test 4: Error with Stack Trace');
console.log('-'.repeat(60));

try {
  throw new Error('Simulated error for testing');
} catch (error) {
  logger.error('Caught an error', {
    error: error.message,
    stack: error.stack
  });
}

// Test 5: Complex metadata
console.log('\n📊 Test 5: Complex Metadata');
console.log('-'.repeat(60));

logger.info('User action', {
  userId: 'user123',
  action: 'generate-terrain',
  parameters: {
    width: 512,
    height: 512,
    method: 'fbm',
    seed: 12345
  },
  performance: {
    duration: 234,
    memory: '45MB'
  }
});

// Test 6: Dynamic log level change
console.log('\n📊 Test 6: Dynamic Log Level Change');
console.log('-'.repeat(60));

console.log('Current log level:', logger.level);
logger.debug('This debug message should appear');

setLogLevel('info');
console.log('Changed log level to: info');
logger.debug('This debug message should NOT appear');
logger.info('This info message should still appear');

// Restore debug level
setLogLevel('debug');

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ Winston Logging Test Complete!');
console.log('='.repeat(60));
console.log('\n📁 Check log files in: apps/simulation-api/logs/');
console.log('   - app-YYYY-MM-DD.log');
console.log('   - error-YYYY-MM-DD.log');
console.log('   - simulation-YYYY-MM-DD.log');
console.log('\n💡 Tips:');
console.log('   - Logs are in JSON format for easy parsing');
console.log('   - Error logs are in a separate file');
console.log('   - Logs rotate daily and compress automatically');
console.log('   - Use jq to parse: cat app-*.log | jq .');
console.log('');
