/**
 * Express middleware to attach correlation ID to requests
 * Auto-generates UUID if not provided in header
 */

import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for existing correlation ID in headers
  const existingId = req.headers['x-correlation-id'] as string;

  // Use existing or generate new UUID
  req.correlationId = existingId || randomUUID();

  // Add correlation ID to response headers for client tracking
  res.setHeader('x-correlation-id', req.correlationId);

  next();
}
