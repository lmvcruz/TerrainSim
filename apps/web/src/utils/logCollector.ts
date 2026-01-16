/**
 * Log Collector for Development Mode
 *
 * Captures browser console logs and makes them available for:
 * - Download as JSON file
 * - Sending to backend API (for agent access)
 * - Local storage persistence
 *
 * This is especially useful for debugging with AI agents that cannot
 * directly access the browser console.
 */

import { logger, type LogLevel } from './logger'
import apiConfig from '../config/api'

interface CapturedLog {
  timestamp: number
  level: LogLevel
  component?: string
  message: string
  data?: any
}

class LogCollector {
  private logs: CapturedLog[] = []
  private maxLogs = 1000
  private enabled = import.meta.env.DEV
  private autoSendInterval?: number

  constructor() {
    if (!this.enabled) return

    // Subscribe to logger events
    logger.onLog((entry) => {
      this.capture(entry)
    })

    // Restore logs from localStorage on load
    this.restoreFromLocalStorage()

    // Auto-save to localStorage periodically
    this.setupAutoSave()

    // Expose to window for easy debugging
    if (typeof window !== 'undefined') {
      ;(window as any).logCollector = this
      ;(window as any).downloadLogs = () => this.downloadLogs()
      ;(window as any).clearLogs = () => this.clear()
      ;(window as any).getLogs = () => this.getLogs()
    }
  }

  /**
   * Capture a log entry
   */
  private capture(entry: CapturedLog) {
    this.logs.push(entry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  /**
   * Get all captured logs
   */
  getLogs(): CapturedLog[] {
    return [...this.logs]
  }

  /**
   * Clear all captured logs
   */
  clear() {
    this.logs = []
    localStorage.removeItem('dev-logs')
    logger.info('Log collector cleared')
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): CapturedLog[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * Get logs filtered by component
   */
  getLogsByComponent(component: string): CapturedLog[] {
    return this.logs.filter(log => log.component === component)
  }

  /**
   * Get logs from the last N milliseconds
   */
  getRecentLogs(milliseconds: number): CapturedLog[] {
    const cutoff = Date.now() - milliseconds
    return this.logs.filter(log => log.timestamp >= cutoff)
  }

  /**
   * Save logs to localStorage
   */
  private saveToLocalStorage() {
    if (!this.enabled) return

    try {
      const data = JSON.stringify(this.logs)
      localStorage.setItem('dev-logs', data)
    } catch (error) {
      // Quota exceeded - clear old logs and try again
      this.logs = this.logs.slice(-500)
      try {
        const data = JSON.stringify(this.logs)
        localStorage.setItem('dev-logs', data)
      } catch {
        // Still failed - give up silently
      }
    }
  }

  /**
   * Restore logs from localStorage
   */
  private restoreFromLocalStorage() {
    if (!this.enabled) return

    try {
      const data = localStorage.getItem('dev-logs')
      if (data) {
        this.logs = JSON.parse(data)
        logger.debug('Restored logs from localStorage', { count: this.logs.length })
      }
    } catch (error) {
      // Invalid data - clear it
      localStorage.removeItem('dev-logs')
    }
  }

  /**
   * Setup auto-save to localStorage every 5 seconds
   */
  private setupAutoSave() {
    if (!this.enabled) return

    setInterval(() => {
      this.saveToLocalStorage()
    }, 5000)
  }

  /**
   * Download logs as a JSON file
   */
  downloadLogs() {
    const data = JSON.stringify(this.logs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `terrain-sim-logs-${new Date().toISOString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
    logger.info('Downloaded logs', { count: this.logs.length })
  }

  /**
   * Send logs to backend API (for agent access)
   */
  async sendToBackend(apiUrl = apiConfig.endpoints.dev.logs) {
    if (!this.enabled) return

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: this.logs,
          timestamp: Date.now(),
        }),
      })

      if (response.ok) {
        logger.info('Logs sent to backend', { count: this.logs.length })
        return true
      } else {
        logger.warn('Failed to send logs to backend', {
          status: response.status,
          statusText: response.statusText,
        })
        return false
      }
    } catch (error) {
      logger.debug('Backend not available for log collection', { error })
      return false
    }
  }

  /**
   * Start auto-sending logs to backend periodically
   */
  startAutoSend(intervalMs = 30000) {
    if (this.autoSendInterval) {
      clearInterval(this.autoSendInterval)
    }

    this.autoSendInterval = window.setInterval(() => {
      this.sendToBackend()
    }, intervalMs)

    logger.info('Started auto-sending logs to backend', { intervalMs })
  }

  /**
   * Stop auto-sending logs
   */
  stopAutoSend() {
    if (this.autoSendInterval) {
      clearInterval(this.autoSendInterval)
      this.autoSendInterval = undefined
      logger.info('Stopped auto-sending logs to backend')
    }
  }

  /**
   * Get summary statistics about captured logs
   */
  getStats() {
    const byLevel = {
      debug: this.getLogsByLevel('debug').length,
      info: this.getLogsByLevel('info').length,
      warn: this.getLogsByLevel('warn').length,
      error: this.getLogsByLevel('error').length,
    }

    const byComponent: Record<string, number> = {}
    this.logs.forEach(log => {
      if (log.component) {
        byComponent[log.component] = (byComponent[log.component] || 0) + 1
      }
    })

    return {
      total: this.logs.length,
      byLevel,
      byComponent,
      oldest: this.logs[0]?.timestamp,
      newest: this.logs[this.logs.length - 1]?.timestamp,
    }
  }
}

// Export singleton instance
export const logCollector = new LogCollector()

// Log that collector is initialized
if (import.meta.env.DEV) {
  logger.info('Log collector initialized', {
    note: 'Use window.downloadLogs() to download logs as JSON',
  })

  // Optionally enable auto-send to backend (tries silently)
  // Check if backend is available first
  const apiUrl = import.meta.env.VITE_API_URL || apiConfig.apiUrl
  fetch(`${apiUrl}/health`, { method: 'GET' })
    .then(response => {
      if (response.ok) {
        // Backend is available, enable auto-send every 30 seconds
        logCollector.startAutoSend(30000)
        logger.debug('Auto-send to backend enabled', { interval: '30s' })
      }
    })
    .catch(() => {
      // Backend not available, that's fine - logs stay in localStorage
      logger.debug('Backend not available, logs will stay in localStorage only')
    })
}
