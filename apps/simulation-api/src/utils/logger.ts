/**
 * Centralized logging system for TerrainSim API
 *
 * Features:
 * - Log levels (trace, debug, info, warn, error)
 * - Colored console output
 * - Component context for better organization
 * - Integration with unified logging system
 * - Correlation ID support
 */

import { logService } from '../services/LogService.js';
import type { LogLevel as UnifiedLogLevel } from '../types/logging.js';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

// Thread-local storage for correlation ID
let currentCorrelationId: string | null = null;

/**
 * Set the correlation ID for the current request context
 */
export function setCorrelationId(id: string): void {
  currentCorrelationId = id;
}

/**
 * Get the current correlation ID
 */
export function getCorrelationId(): string {
  return currentCorrelationId || 'unknown';
}

/**
 * Clear the correlation ID
 */
export function clearCorrelationId(): void {
  currentCorrelationId = null;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component?: string;
  message: string;
  data?: any;
}

interface LoggerOptions {
  enabled?: boolean;
  level?: LogLevel;
  component?: string;
}

class Logger {
  private enabled: boolean;
  private minLevel: LogLevel;
  private component?: string;

  // Log level hierarchy
  private levelPriority: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  };

  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? true;
    // In production, only show warnings and errors by default
    this.minLevel = options.level ?? (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');
    this.component = options.component;
  }

  /**
   * Create a logger instance with a component context
   */
  withContext(component: string): Logger {
    return new Logger({
      enabled: this.enabled,
      level: this.minLevel,
      component,
    });
  }

  /**
   * Check if a log level should be shown
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;

    // Use the LogService's runtime log level
    const runtimeLevel = logService.getLogLevel() as LogLevel;
    return this.levelPriority[level] >= this.levelPriority[runtimeLevel];
  }

  /**
   * Format and emit a log entry
   */
  private log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component: this.component,
      message,
      data,
    };

    // Send to unified logging system
    logService.addLog({
      correlationId: getCorrelationId(),
      source: 'backend',
      component: this.component || 'Unknown',
      level: level as UnifiedLogLevel,
      message,
      data,
      nodeVersion: process.version,
    });

    // Console output with colors (Node.js ANSI codes)
    const styles = this.getStyles(level);
    const prefix = this.component ? `[${this.component}]` : '';
    const consoleMethod = level === 'debug' || level === 'trace' ? 'log' : level;

    console[consoleMethod](
      `${styles.emoji} ${level.toUpperCase()}${prefix}`,
      message,
      data !== undefined ? data : ''
    );
  }

  /**
   * Get emoji and color for log level
   */
  private getStyles(level: LogLevel) {
    const styles = {
      trace: { emoji: '🔍', color: '\x1b[90m' }, // Gray
      debug: { emoji: '🐛', color: '\x1b[36m' }, // Cyan
      info: { emoji: 'ℹ️', color: '\x1b[34m' },   // Blue
      warn: { emoji: '⚠️', color: '\x1b[33m' },   // Yellow
      error: { emoji: '❌', color: '\x1b[31m' },  // Red
    };
    return styles[level];
  }

  /**
   * Log at trace level - most detailed debugging
   */
  trace(message: string, data?: any) {
    this.log('trace', message, data);
  }

  /**
   * Log at debug level
   */
  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  /**
   * Log at info level
   */
  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  /**
   * Log at warn level
   */
  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  /**
   * Log at error level
   */
  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  /**
   * Enable or disable logging at runtime
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Change minimum log level at runtime
   */
  setLevel(level: LogLevel) {
    this.minLevel = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for creating component-specific loggers
export { Logger };
