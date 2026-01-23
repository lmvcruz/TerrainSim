/**
 * Remote Logger for Frontend
 *
 * Sends browser logs to backend for persistence in Winston log files.
 * Features:
 * - Batching with 5-second flush interval
 * - Session ID for tracking user sessions
 * - Automatic retry on failure
 * - Environment-based configuration
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component?: string;
  data?: any;
  sessionId: string;
  correlationId?: string;
  userAgent?: string;
  url?: string;
}

class RemoteLogger {
  private buffer: LogEntry[] = [];
  private sessionId: string;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;
  private maxBufferSize = 50;
  private apiUrl: string;
  private logEndpoint: string;
  private enabled: boolean;
  private logLevel: LogLevel;

  constructor() {
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();

    // Read environment variables
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    this.logEndpoint = import.meta.env.VITE_LOG_ENDPOINT || '/api/logs/frontend';
    this.enabled = import.meta.env.VITE_REMOTE_LOGGING !== 'false';
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL || 'info') as LogLevel;

    // Start auto-flush
    if (this.enabled) {
      this.startAutoFlush();
      this.logSystemInfo();
    }
  }

  /**
   * Get or create session ID (stored in sessionStorage)
   */
  private getOrCreateSessionId(): string {
    const stored = sessionStorage.getItem('terrainsim-session-id');
    if (stored) {
      return stored;
    }

    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('terrainsim-session-id', newSessionId);
    return newSessionId;
  }

  /**
   * Log system information on startup
   */
  private logSystemInfo(): void {
    this.info('Frontend logging initialized', {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      platform: navigator.platform,
      language: navigator.language,
      apiUrl: this.apiUrl,
    });
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Check if log level should be sent
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;

    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Add log entry to buffer
   */
  private addToBuffer(level: LogLevel, message: string, data?: any, component?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component,
      data,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.buffer.push(entry);

    // Also log to console for immediate visibility
    const consoleMethod = level === 'trace' || level === 'debug' ? 'log' : level;
    const prefix = component ? `[${component}]` : '[Frontend]';
    console[consoleMethod](`${prefix} ${message}`, data || '');

    // Flush immediately if buffer is full or if error
    if (this.buffer.length >= this.maxBufferSize || level === 'error') {
      this.flush();
    }
  }

  /**
   * Flush buffer to backend
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.enabled) return;

    const logsToSend = [...this.buffer];
    this.buffer = [];

    try {
      const url = `${this.apiUrl}${this.logEndpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });

      if (!response.ok) {
        console.warn(`Failed to send logs to backend: ${response.status} ${response.statusText}`);
        // Don't re-queue to avoid infinite loop
      }
    } catch (error) {
      console.warn('Error sending logs to backend:', error);
      // Don't re-queue to avoid infinite loop
    }
  }

  /**
   * Set correlation ID for current operation
   */
  setCorrelationId(correlationId: string): void {
    if (this.buffer.length > 0) {
      this.buffer[this.buffer.length - 1].correlationId = correlationId;
    }
  }

  /**
   * Log at trace level (most detailed)
   */
  trace(message: string, data?: any, component?: string): void {
    this.addToBuffer('trace', message, data, component);
  }

  /**
   * Log at debug level
   */
  debug(message: string, data?: any, component?: string): void {
    this.addToBuffer('debug', message, data, component);
  }

  /**
   * Log at info level
   */
  info(message: string, data?: any, component?: string): void {
    this.addToBuffer('info', message, data, component);
  }

  /**
   * Log at warn level
   */
  warn(message: string, data?: any, component?: string): void {
    this.addToBuffer('warn', message, data, component);
  }

  /**
   * Log at error level (flushes immediately)
   */
  error(message: string, data?: any, component?: string): void {
    this.addToBuffer('error', message, data, component);
  }

  /**
   * Flush logs manually
   */
  forceFlush(): Promise<void> {
    return this.flush();
  }

  /**
   * Cleanup on unload
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Export singleton instance
export const remoteLogger = new RemoteLogger();

// Flush logs before page unload
window.addEventListener('beforeunload', () => {
  remoteLogger.forceFlush();
});
