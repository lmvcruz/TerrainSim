/**
 * Log transport service for sending frontend logs to backend
 *
 * Features:
 * - Batches logs in memory to reduce network overhead
 * - Auto-flushes every 2 seconds
 * - Manual flush for critical logs
 * - Retry mechanism on failure
 */

import type { LogLevel } from '../utils/logger';
import apiConfig from '../config/api';

interface PendingLog {
  correlationId: string;
  component: string;
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
}

class LogTransport {
  private queue: PendingLog[] = [];
  private maxQueueSize = 100;
  private flushInterval = 2000; // 2 seconds
  private flushTimer: number | null = null;
  private isFlushing = false;

  constructor() {
    // Start auto-flush timer
    this.startAutoFlush();
  }

  /**
   * Add a log to the queue
   */
  addLog(log: PendingLog): void {
    this.queue.push(log);

    // If queue is full, flush immediately
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Start the auto-flush timer
   */
  private startAutoFlush(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = window.setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Flush all queued logs to the backend
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(apiConfig.endpoints.logs, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend.map(log => ({
            correlationId: log.correlationId,
            source: 'frontend',
            component: log.component,
            level: log.level,
            message: log.message,
            data: log.data,
            timestamp: log.timestamp,
            userAgent: navigator.userAgent,
          })),
        }),
      });

      if (!response.ok) {
        console.error('Failed to send logs to backend:', response.statusText);
        // Re-queue the logs for retry
        this.queue.unshift(...logsToSend);
      }
    } catch (error) {
      console.error('Error sending logs to backend:', error);
      // Re-queue the logs for retry
      this.queue.unshift(...logsToSend);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Stop the auto-flush timer (cleanup)
   */
  destroy(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Flush any remaining logs
    this.flush();
  }
}

// Singleton instance
export const logTransport = new LogTransport();
