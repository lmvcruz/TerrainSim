/**
 * Type definitions for the unified logging system
 */

export type LogLevel = 'info' | 'debug' | 'trace' | 'warn' | 'error';

export type LogSource = 'frontend' | 'backend';

export type Environment = 'development' | 'production';

export interface UnifiedLog {
  // Identification
  correlationId: string;        // Links all logs for one operation
  logId: string;                // Unique ID for this specific log entry

  // Source & Context
  source: LogSource;
  environment: Environment;
  component: string;            // e.g., "TerrainMesh", "generatePerlinNoise"

  // Content
  level: LogLevel;
  message: string;
  data?: any;                   // Additional structured data

  // Timing
  timestamp: number;            // Unix timestamp (ms)
  duration?: number;            // For operations with start/end

  // Metadata
  userAgent?: string;           // Frontend only
  nodeVersion?: string;         // Backend only
  url?: string;                 // API endpoint
  method?: string;              // HTTP method
  stackTrace?: string;          // For errors
}

export interface LogQuery {
  correlationId?: string;
  level?: LogLevel;
  source?: LogSource;
  component?: string;
  since?: number;               // Unix timestamp
  until?: number;               // Unix timestamp
  limit?: number;
}

export interface LogOperation {
  correlationId: string;
  timestamp: number;
  duration?: number;
  logCount: number;
  frontendLogs: number;
  backendLogs: number;
  hasErrors: boolean;
  environment: Environment;
}
