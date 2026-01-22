/**
 * React hook for managing correlation IDs
 *
 * A correlation ID links all frontend and backend logs for a single operation,
 * making it easy to trace the entire flow of a request through the system.
 */

import { useState, useCallback } from 'react';

function generateUUID(): string {
  return crypto.randomUUID();
}

export function useCorrelationId(initialId?: string) {
  const [correlationId, setCorrelationId] = useState<string>(initialId || generateUUID());

  /**
   * Generate a new correlation ID
   * Call this at the start of a new operation
   */
  const refresh = useCallback(() => {
    const newId = generateUUID();
    setCorrelationId(newId);
    return newId;
  }, []);

  return {
    correlationId,
    refresh,
  };
}
