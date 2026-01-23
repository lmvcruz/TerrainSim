/**
 * Winston-based logging infrastructure for TerrainSim API
 *
 * Features:
 * - Daily log rotation with retention policies
 * - Separate log files for app, errors, and simulations
 * - Environment-based configuration
 * - Console transport with colors
 * - Automatic log archiving
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Environment-based configuration
const LOG_DIR = process.env.LOG_DIR || (process.env.NODE_ENV === 'production'
  ? '/var/log/terrainsim'
  : path.join(process.cwd(), 'logs'));
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const ENABLE_FILE_LOGGING = process.env.ENABLE_FILE_LOGGING !== 'false';
const ENABLE_CONSOLE_LOGGING = process.env.ENABLE_CONSOLE_LOGGING !== 'false';

// Ensure log directory exists
if (ENABLE_FILE_LOGGING && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`📁 Created log directory: ${LOG_DIR}`);
}

// Custom format for file logging (JSON with pretty print)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Custom format for console logging (colorized and simple)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, component, ...metadata }) => {
    let msg = `${timestamp} [${level}]`;
    if (component) {
      msg += ` [${component}]`;
    }
    msg += `: ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      // Filter out timestamp and level which are already displayed
      const relevantMeta = { ...metadata };
      delete relevantMeta.timestamp;
      delete relevantMeta.level;
      delete relevantMeta.service;

      if (Object.keys(relevantMeta).length > 0) {
        msg += ` ${JSON.stringify(relevantMeta)}`;
      }
    }

    return msg;
  })
);

// Transport for general application logs
const appLogTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // Keep 14 days
  zippedArchive: true,
  format: fileFormat,
});

// Transport for error logs (separate file for easier debugging)
const errorLogTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d', // Keep errors longer
  zippedArchive: true,
  format: fileFormat,
});

// Transport for simulation-specific logs
const simulationLogTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'simulation-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '7d',
  zippedArchive: true,
  format: fileFormat,
});

// Console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

// Main application logger
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'terrainsim-api' },
  transports: [
    ...(ENABLE_FILE_LOGGING ? [appLogTransport, errorLogTransport] : []),
    ...(ENABLE_CONSOLE_LOGGING ? [consoleTransport] : []),
  ],
});

// Simulation-specific logger for high-volume simulation events
export const simulationLogger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'terrainsim-simulation' },
  transports: [
    ...(ENABLE_FILE_LOGGING ? [simulationLogTransport] : []),
    ...(ENABLE_CONSOLE_LOGGING ? [consoleTransport] : []),
  ],
});

// Log rotation event handlers
appLogTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Application log file rotated', { oldFilename, newFilename });
});

errorLogTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Error log file rotated', { oldFilename, newFilename });
});

simulationLogTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Simulation log file rotated', { oldFilename, newFilename });
});

// Log initialization
logger.info('Winston logging initialized', {
  logDir: LOG_DIR,
  logLevel: LOG_LEVEL,
  fileLogging: ENABLE_FILE_LOGGING,
  consoleLogging: ENABLE_CONSOLE_LOGGING,
  environment: process.env.NODE_ENV || 'development',
});

/**
 * Create a child logger with component context
 */
export function createLogger(component: string) {
  return logger.child({ component });
}

/**
 * Create a child simulation logger with component context
 */
export function createSimulationLogger(component: string) {
  return simulationLogger.child({ component });
}

/**
 * Dynamically change log level at runtime
 */
export function setLogLevel(level: string) {
  logger.level = level;
  simulationLogger.level = level;
  logger.info('Log level changed', { newLevel: level });
}

/**
 * Get current log level
 */
export function getLogLevel(): string {
  return logger.level;
}
