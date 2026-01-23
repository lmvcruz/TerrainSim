/**
 * Frontend Logs Route
 *
 * Receives logs from browser clients and writes them to Winston log files
 */

import express from 'express';
import { simulationLogger, logger as winstonLogger } from '../utils/logging.js';

const router = express.Router();

interface FrontendLogEntry {
  timestamp: string;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  message: string;
  component?: string;
  data?: any;
  sessionId: string;
  correlationId?: string;
  userAgent?: string;
  url?: string;
}

/**
 * POST /api/logs/frontend
 * Receive batch of logs from frontend
 */
router.post('/frontend', async (req, res) => {
  try {
    const { logs } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body. Expected { logs: LogEntry[] }'
      });
    }

    // Write each log to Winston simulation logger
    for (const log of logs as FrontendLogEntry[]) {
      const logData = {
        source: 'frontend',
        sessionId: log.sessionId,
        component: log.component || 'unknown',
        correlationId: log.correlationId,
        userAgent: log.userAgent,
        url: log.url,
        data: log.data,
        timestamp: log.timestamp,
      };

      // Write to simulation logger (separate file for high-volume logs)
      switch (log.level) {
        case 'trace':
        case 'debug':
          simulationLogger.debug(log.message, logData);
          break;
        case 'info':
          simulationLogger.info(log.message, logData);
          break;
        case 'warn':
          simulationLogger.warn(log.message, logData);
          break;
        case 'error':
          // Also write errors to main logger for visibility
          winstonLogger.error(`[Frontend] ${log.message}`, logData);
          simulationLogger.error(log.message, logData);
          break;
      }
    }

    res.json({
      success: true,
      received: logs.length,
      message: `Received ${logs.length} log(s) from frontend`
    });

  } catch (error) {
    winstonLogger.error('Error processing frontend logs', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process logs'
    });
  }
});

export default router;
