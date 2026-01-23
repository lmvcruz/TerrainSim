/**
 * Admin API Routes for TerrainSim
 *
 * Provides administrative endpoints for:
 * - Dynamic log level management
 * - System configuration
 * - Health monitoring
 */

import express from 'express';
import { logger, simulationLogger } from '../utils/logging';

const router = express.Router();

/**
 * POST /admin/log-level
 * Update log level dynamically without restarting the server
 *
 * Body: { level: 'trace' | 'debug' | 'info' | 'warn' | 'error' }
 *
 * Example:
 *   curl -X POST http://localhost:3001/admin/log-level \
 *     -H "Content-Type: application/json" \
 *     -d '{"level":"debug"}'
 */
router.post('/log-level', (req, res) => {
  const { level } = req.body;

  // Validate log level
  const validLevels = ['trace', 'debug', 'info', 'warn', 'error'];
  if (!level || !validLevels.includes(level)) {
    logger.warn('Invalid log level requested', {
      component: 'admin',
      requestedLevel: level,
      validLevels
    });
    return res.status(400).json({
      error: 'Invalid log level',
      message: `Log level must be one of: ${validLevels.join(', ')}`,
      validLevels
    });
  }

  // Store previous level for logging
  const previousLevel = logger.level;

  // Update Winston logger levels dynamically
  logger.level = level;
  simulationLogger.level = level;

  logger.info('Log level updated', {
    component: 'admin',
    previousLevel,
    newLevel: level,
    environment: process.env.NODE_ENV
  });

  res.json({
    success: true,
    message: `Log level updated from ${previousLevel} to ${level}`,
    previousLevel,
    currentLevel: logger.level,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /admin/log-level
 * Get current log level and configuration
 *
 * Example:
 *   curl http://localhost:3001/admin/log-level
 */
router.get('/log-level', (req, res) => {
  const config = {
    currentLevel: logger.level,
    environment: process.env.NODE_ENV || 'development',
    logDir: process.env.LOG_DIR || './logs',
    fileLoggingEnabled: process.env.ENABLE_FILE_LOGGING !== 'false',
    consoleLoggingEnabled: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
    validLevels: ['trace', 'debug', 'info', 'warn', 'error'],
    timestamp: new Date().toISOString()
  };

  logger.debug('Log level queried', {
    component: 'admin',
    currentLevel: config.currentLevel
  });

  res.json(config);
});

/**
 * GET /admin/health
 * Health check endpoint with logging system status
 *
 * Example:
 *   curl http://localhost:3001/admin/health
 */
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    logging: {
      level: logger.level,
      directory: process.env.LOG_DIR || './logs',
      fileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
      consoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== 'false'
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };

  res.json(health);
});

export default router;
