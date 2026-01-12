/**
 * Centralized logging system for TerrainSim
 *
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Colored console output
 * - Performance timing utilities
 * - Development-only logging
 * - Structured log format
 * - Log grouping for related operations
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: number
  level: LogLevel
  component?: string
  message: string
  data?: any
}

interface LoggerOptions {
  enabled?: boolean
  level?: LogLevel
  component?: string
}

class Logger {
  private enabled: boolean
  private minLevel: LogLevel
  private component?: string
  private listeners: Array<(entry: LogEntry) => void> = []

  // Log level hierarchy
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? import.meta.env.DEV
    this.minLevel = options.level ?? (import.meta.env.DEV ? 'debug' : 'warn')
    this.component = options.component
  }

  /**
   * Create a logger instance with a component context
   */
  withContext(component: string): Logger {
    return new Logger({
      enabled: this.enabled,
      level: this.minLevel,
      component,
    })
  }

  /**
   * Check if a log level should be shown
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false
    return this.levelPriority[level] >= this.levelPriority[this.minLevel]
  }

  /**
   * Format and emit a log entry
   */
  private log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component: this.component,
      message,
      data,
    }

    // Notify listeners (for log collection)
    this.listeners.forEach(listener => listener(entry))

    // Console output with colors
    const styles = this.getStyles(level)
    const prefix = this.component ? `[${this.component}]` : ''

    console[level === 'debug' ? 'log' : level](
      `%c${styles.emoji} ${level.toUpperCase()}${prefix}`,
      styles.css,
      message,
      data !== undefined ? data : ''
    )
  }

  /**
   * Get console styles for each log level
   */
  private getStyles(level: LogLevel): { emoji: string; css: string } {
    const styles = {
      debug: {
        emoji: '🔍',
        css: 'background: #6b7280; color: white; padding: 2px 6px; border-radius: 3px;',
      },
      info: {
        emoji: 'ℹ️',
        css: 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;',
      },
      warn: {
        emoji: '⚠️',
        css: 'background: #f59e0b; color: white; padding: 2px 6px; border-radius: 3px;',
      },
      error: {
        emoji: '❌',
        css: 'background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px;',
      },
    }

    return styles[level]
  }

  /**
   * Log a debug message (development only)
   */
  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  /**
   * Log an informational message
   */
  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any) {
    this.log('error', message, data)
  }

  /**
   * Create a collapsible group of related logs
   */
  group(title: string, fn: () => void, collapsed = false) {
    if (!this.enabled) {
      fn()
      return
    }

    const method = collapsed ? console.groupCollapsed : console.group
    method(`%c${title}`, 'font-weight: bold; font-size: 1.1em;')
    try {
      fn()
    } finally {
      console.groupEnd()
    }
  }

  /**
   * Measure execution time of a function
   */
  time<T>(label: string, fn: () => T): T {
    if (!this.shouldLog('debug')) {
      return fn()
    }

    const start = performance.now()
    try {
      return fn()
    } finally {
      const duration = performance.now() - start
      this.debug(`⏱️ ${label}`, `${duration.toFixed(2)}ms`)
    }
  }

  /**
   * Measure execution time of an async function
   */
  async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.shouldLog('debug')) {
      return fn()
    }

    const start = performance.now()
    try {
      return await fn()
    } finally {
      const duration = performance.now() - start
      this.debug(`⏱️ ${label}`, `${duration.toFixed(2)}ms`)
    }
  }

  /**
   * Mark a timestamp and measure time from it
   */
  measure(label: string, startTime: number) {
    if (!this.shouldLog('debug')) return

    const duration = performance.now() - startTime
    this.debug(`📊 ${label}`, `${duration.toFixed(2)}ms`)
  }

  /**
   * Register a listener to capture log entries
   * (Used for log collection in development)
   */
  onLog(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Enable or disable logging at runtime
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  /**
   * Change minimum log level at runtime
   */
  setLevel(level: LogLevel) {
    this.minLevel = level
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for creating component-specific loggers
export { Logger }
