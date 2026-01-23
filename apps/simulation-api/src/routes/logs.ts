/**
 * Logs API Routes for TerrainSim
 *
 * Provides endpoints for:
 * - Log filtering and querying
 * - Log search
 * - Log analytics
 */

import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logging';

const router = express.Router();

// Get log directory from environment
const LOG_DIR = process.env.LOG_DIR || (process.env.NODE_ENV === 'production'
  ? '/var/log/terrainsim'
  : path.join(process.cwd(), 'logs'));

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  component?: string;
  source?: string;
  sessionId?: string;
  [key: string]: any;
}

interface FilterParams {
  level?: string;
  source?: string;
  component?: string;
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  searchTerm?: string;
  limit?: string;
}

/**
 * GET /api/logs/filter
 * Filter and search logs based on multiple criteria
 *
 * Query Parameters:
 *   - level: Filter by log level (trace, debug, info, warn, error)
 *   - source: Filter by source (frontend, backend)
 *   - component: Filter by component name
 *   - startDate: Filter logs after this date (ISO 8601)
 *   - endDate: Filter logs before this date (ISO 8601)
 *   - sessionId: Filter by session ID
 *   - searchTerm: Search in message and metadata
 *   - limit: Maximum number of results (default: 100)
 *
 * Examples:
 *   curl "http://localhost:3001/api/logs/filter?level=error"
 *   curl "http://localhost:3001/api/logs/filter?source=frontend&limit=50"
 *   curl "http://localhost:3001/api/logs/filter?searchTerm=simulation&level=info"
 */
router.get('/filter', async (req, res) => {
  try {
    const {
      level,
      source,
      component,
      startDate,
      endDate,
      sessionId,
      searchTerm,
      limit = '100'
    } = req.query as FilterParams;

    logger.debug('Log filter request received', {
      component: 'logs-api',
      filters: { level, source, component, startDate, endDate, sessionId, searchTerm, limit }
    });

    const maxLimit = parseInt(limit, 10) || 100;
    const results: LogEntry[] = [];

    // Read all log files in the directory
    const files = await fs.readdir(LOG_DIR);
    const logFiles = files.filter(file => file.endsWith('.log')).sort().reverse();

    // Parse dates for filtering
    const startDateTime = startDate ? new Date(startDate).getTime() : null;
    const endDateTime = endDate ? new Date(endDate).getTime() : null;

    // Process each log file
    for (const file of logFiles) {
      if (results.length >= maxLimit) break;

      const filePath = path.join(LOG_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (results.length >= maxLimit) break;

        try {
          const entry: LogEntry = JSON.parse(line);

          // Apply filters
          if (level && entry.level !== level) continue;
          if (source && entry.source !== source) continue;
          if (component && entry.component !== component) continue;
          if (sessionId && entry.sessionId !== sessionId) continue;

          // Date range filter
          if (startDateTime || endDateTime) {
            const entryTime = new Date(entry.timestamp).getTime();
            if (startDateTime && entryTime < startDateTime) continue;
            if (endDateTime && entryTime > endDateTime) continue;
          }

          // Search term filter (case-insensitive)
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const searchableContent = JSON.stringify(entry).toLowerCase();
            if (!searchableContent.includes(searchLower)) continue;
          }

          results.push(entry);
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }
    }

    logger.info('Log filter completed', {
      component: 'logs-api',
      filters: { level, source, component, searchTerm },
      resultsCount: results.length,
      filesProcessed: logFiles.length
    });

    res.json({
      success: true,
      count: results.length,
      limit: maxLimit,
      filters: { level, source, component, startDate, endDate, sessionId, searchTerm },
      logs: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error filtering logs', {
      component: 'logs-api',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'Failed to filter logs',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/logs/stats
 * Get log statistics and analytics
 *
 * Example:
 *   curl http://localhost:3001/api/logs/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const files = await fs.readdir(LOG_DIR);
    const logFiles = files.filter(file => file.endsWith('.log'));

    const stats = {
      totalFiles: logFiles.length,
      files: [] as any[],
      totalSize: 0
    };

    // Get file stats
    for (const file of logFiles) {
      const filePath = path.join(LOG_DIR, file);
      const fileStat = await fs.stat(filePath);
      stats.files.push({
        name: file,
        size: fileStat.size,
        sizeFormatted: `${(fileStat.size / 1024).toFixed(2)} KB`,
        modified: fileStat.mtime.toISOString()
      });
      stats.totalSize += fileStat.size;
    }

    stats.files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    logger.debug('Log stats requested', {
      component: 'logs-api',
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize
    });

    res.json({
      success: true,
      stats: {
        ...stats,
        totalSizeFormatted: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
        logDirectory: LOG_DIR
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting log stats', {
      component: 'logs-api',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get log stats',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
