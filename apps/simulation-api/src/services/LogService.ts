/**
 * Central log aggregation service
 * Manages in-memory storage and file persistence for unified logs
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { UnifiedLog, LogQuery, LogLevel, LogOperation, Environment } from '../types/logging.js';

const LOG_FILE_DIR = path.join(process.cwd(), '.logs');
const LOG_FILE_PATH = path.join(LOG_FILE_DIR, 'unified-logs.json');
const MAX_IN_MEMORY_LOGS = 1000;
const MAX_FILE_LOGS = 10000;
const LOG_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

export class LogService {
  private logs: UnifiedLog[] = [];
  private currentLogLevel: LogLevel = 'debug';
  private environment: Environment;

  constructor() {
    this.environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    this.initializeStorage();
    this.loadLogsFromFile();
  }

  private initializeStorage(): void {
    if (!fs.existsSync(LOG_FILE_DIR)) {
      fs.mkdirSync(LOG_FILE_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE_PATH)) {
      fs.writeFileSync(LOG_FILE_PATH, JSON.stringify([]), 'utf-8');
    }
  }

  private loadLogsFromFile(): void {
    try {
      const data = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
      const fileLogs: UnifiedLog[] = JSON.parse(data);

      // Load only recent logs (within retention period)
      const now = Date.now();
      this.logs = fileLogs.filter(log =>
        now - log.timestamp < LOG_RETENTION_MS
      ).slice(-MAX_IN_MEMORY_LOGS);

      console.log(`📂 Loaded ${this.logs.length} logs from persistent storage`);
    } catch (error) {
      console.error('Failed to load logs from file:', error);
      this.logs = [];
    }
  }

  private persistToFile(): void {
    try {
      // Keep only recent logs for file storage
      const now = Date.now();
      let fileLogsToKeep = this.logs.filter(log =>
        now - log.timestamp < LOG_RETENTION_MS
      ).slice(-MAX_FILE_LOGS);

      fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(fileLogsToKeep, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to persist logs to file:', error);
    }
  }

  /**
   * Add a single log entry
   */
  addLog(log: Omit<UnifiedLog, 'logId' | 'timestamp' | 'environment'>): void {
    const fullLog: UnifiedLog = {
      ...log,
      logId: randomUUID(),
      timestamp: Date.now(),
      environment: this.environment,
    };

    this.logs.push(fullLog);

    // Keep only last N logs in memory
    if (this.logs.length > MAX_IN_MEMORY_LOGS) {
      this.logs = this.logs.slice(-MAX_IN_MEMORY_LOGS);
    }

    // Persist to file periodically (every 10 logs)
    if (this.logs.length % 10 === 0) {
      this.persistToFile();
    }
  }

  /**
   * Add multiple log entries (batch)
   */
  addLogs(logs: Omit<UnifiedLog, 'logId' | 'timestamp' | 'environment'>[]): void {
    logs.forEach(log => this.addLog(log));
  }

  /**
   * Query logs with filters
   */
  query(query: LogQuery): UnifiedLog[] {
    let filtered = [...this.logs];

    if (query.correlationId) {
      filtered = filtered.filter(log => log.correlationId === query.correlationId);
    }

    if (query.level) {
      filtered = filtered.filter(log => log.level === query.level);
    }

    if (query.source) {
      filtered = filtered.filter(log => log.source === query.source);
    }

    if (query.component) {
      filtered = filtered.filter(log =>
        log.component.toLowerCase().includes(query.component!.toLowerCase())
      );
    }

    if (query.since) {
      filtered = filtered.filter(log => log.timestamp >= query.since!);
    }

    if (query.until) {
      filtered = filtered.filter(log => log.timestamp <= query.until!);
    }

    // Apply limit (default 100)
    const limit = query.limit || 100;
    return filtered.slice(-limit);
  }

  /**
   * Get logs for a specific correlation ID
   */
  getByCorrelationId(correlationId: string): UnifiedLog[] {
    return this.logs
      .filter(log => log.correlationId === correlationId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get latest operations (grouped by correlationId)
   */
  getLatestOperations(limit: number = 20): LogOperation[] {
    const operationsMap = new Map<string, LogOperation>();

    // Group logs by correlationId
    this.logs.forEach(log => {
      if (!operationsMap.has(log.correlationId)) {
        operationsMap.set(log.correlationId, {
          correlationId: log.correlationId,
          timestamp: log.timestamp,
          duration: 0,
          logCount: 0,
          frontendLogs: 0,
          backendLogs: 0,
          hasErrors: false,
          environment: log.environment,
        });
      }

      const op = operationsMap.get(log.correlationId)!;
      op.logCount++;

      if (log.source === 'frontend') {
        op.frontendLogs++;
      } else {
        op.backendLogs++;
      }

      if (log.level === 'error') {
        op.hasErrors = true;
      }

      // Update timestamp to earliest log
      if (log.timestamp < op.timestamp) {
        op.timestamp = log.timestamp;
      }

      // Update duration if available
      if (log.duration && log.duration > op.duration!) {
        op.duration = log.duration;
      }
    });

    // Convert to array and sort by timestamp (newest first)
    return Array.from(operationsMap.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get all logs (for export)
   */
  getAllLogs(): UnifiedLog[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.persistToFile();
    console.log('🗑️ All logs cleared');
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
    console.log(`🎚️ Log level set to: ${level}`);
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.currentLogLevel;
  }

  /**
   * Check if a log level should be logged
   */
  shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.currentLogLevel);
    const requestedIndex = levels.indexOf(level);
    return requestedIndex >= currentIndex;
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      totalLogs: this.logs.length,
      currentLogLevel: this.currentLogLevel,
      environment: this.environment,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      uptime: process.uptime(),
    };
  }
}

// Singleton instance
export const logService = new LogService();
