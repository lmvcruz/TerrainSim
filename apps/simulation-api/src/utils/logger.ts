/**
 * Centralized logging system for TerrainSim API
 *
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Colored console output
 * - Component context for better organization
 * - Production-safe (only warns and errors in production)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? true;
    // In production, only show warnings and errors
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
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
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

    // Console output with colors (Node.js ANSI codes)
    const styles = this.getStyles(level);
    const prefix = this.component ? `[${this.component}]` : '';
    const consoleMethod = level === 'debug' ? 'log' : level;

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
      debug: { emoji: '🐛', color: '\x1b[36m' }, // Cyan
      info: { emoji: 'ℹ️', color: '\x1b[34m' },   // Blue
      warn: { emoji: '⚠️', color: '\x1b[33m' },   // Yellow
      error: { emoji: '❌', color: '\x1b[31m' },  // Red
    };
    return styles[level];
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
