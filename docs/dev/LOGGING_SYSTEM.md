# Logging System

TerrainSim uses a centralized logging system for consistent, structured console output during development.

## Features

- **Log Levels**: `debug`, `info`, `warn`, `error`
- **Component Context**: Loggers can be scoped to specific components
- **Colored Output**: Different colors for each log level
- **Log Groups**: Organize related logs into collapsible groups
- **Performance Timing**: Measure execution time of operations
- **Log Collection**: Automatically capture logs for debugging
- **Development Only**: Logs disabled in production builds

## Basic Usage

```typescript
import { logger } from './utils/logger'

// Simple logging
logger.debug('Detailed debugging information', { data: value })
logger.info('General information')
logger.warn('Warning message')
logger.error('Error occurred', error)
```

## Component-Scoped Loggers

Create loggers with component context for better organization:

```typescript
import { logger } from '../utils/logger'

const componentLogger = logger.withContext('MyComponent')

function MyComponent() {
  componentLogger.info('Component rendered')
  componentLogger.debug('Props', { prop1, prop2 })
}
```

## Log Groups

Group related logs together:

```typescript
logger.group('API Call', () => {
  logger.info('Sending request', { url, params })
  logger.debug('Headers', headers)
})

// Collapsed by default
logger.group('Details', () => {
  logger.debug('Lots of data...', data)
}, true) // Pass true for collapsed
```

## Performance Logging

Measure execution time:

```typescript
// Synchronous operation
const result = logger.time('expensive-operation', () => {
  // ... do work ...
  return result
})
// Logs: "⏱️ expensive-operation 234ms"

// Async operation
const result = await logger.timeAsync('api-call', async () => {
  const response = await fetch(url)
  return response.json()
})

// Manual timing
const start = performance.now()
// ... do work ...
logger.measure('operation-name', start)
```

## Log Levels

Logs are filtered by minimum level:

- **Development**: `debug` and above (all logs shown)
- **Production**: `warn` and above (only warnings and errors)

Change level at runtime:

```typescript
logger.setLevel('info') // Hide debug logs
logger.setLevel('warn') // Only show warnings and errors
```

## Log Collection (Development Only)

Logs are automatically captured and available through the browser console:

```javascript
// Download logs as JSON file
window.downloadLogs()

// Get logs programmatically
window.getLogs() // Returns array of log entries

// Clear captured logs
window.clearLogs()

// Access log collector
window.logCollector.getStats() // Get statistics
window.logCollector.getRecentLogs(60000) // Last 60 seconds
window.logCollector.getLogsByComponent('TerrainMesh')
```

Logs are automatically saved to localStorage every 5 seconds and restored on page reload.

## Log Format

Each log entry contains:

```typescript
{
  timestamp: number,        // Unix timestamp in milliseconds
  level: 'debug' | 'info' | 'warn' | 'error',
  component?: string,       // Optional component context
  message: string,          // Log message
  data?: any               // Optional additional data
}
```

## Examples from TerrainSim

### App.tsx - API Response

```typescript
logger.group('📥 API Response Received', () => {
  logger.info('Parameters', data.parameters)
  logger.debug('Data', {
    length: dataArray.length,
    centerValue: dataArray[centerIdx].toFixed(4),
    statistics: data.statistics,
  })
})
```

### TerrainMesh.tsx - Component Lifecycle

```typescript
const componentLogger = logger.withContext('TerrainMesh')

componentLogger.debug('🎨 Rendered with heightmap', {
  reference: `Float32Array@${heightmap.byteOffset}`,
  length: heightmap.length,
  wireframe,
})
```

### TerrainTracker.ts - Generation Comparison

```typescript
const trackerLogger = logger.withContext('TerrainTracker')

trackerLogger.group(`🎯 GENERATION #${generationCount}`, () => {
  if (lastGeneration) {
    trackerLogger.info('Comparison with previous generation', {
      centerValue: { from, to, diff },
      meanValue: { from, to, diff },
    })
  }
})
```

## Best Practices

1. **Use Appropriate Levels**
   - `debug`: Detailed info for debugging (function calls, data dumps)
   - `info`: Important events (API calls, state changes)
   - `warn`: Potential issues (missing data, fallbacks)
   - `error`: Actual errors (exceptions, failures)

2. **Provide Context**
   - Use component-scoped loggers
   - Include relevant data in log messages
   - Group related logs together

3. **Keep Data Structured**
   - Pass objects rather than formatted strings
   - Use consistent naming conventions
   - Avoid massive data dumps (filter to relevant fields)

4. **Performance Considerations**
   - Logs are automatically disabled in production
   - Log collection has a 1000-entry limit
   - Heavy operations should be wrapped in shouldLog() checks

## Advanced Configuration

```typescript
// Disable logging at runtime
logger.setEnabled(false)

// Subscribe to log events (for custom handling)
const unsubscribe = logger.onLog((entry) => {
  // Custom processing
  console.log('Custom handler:', entry)
})

// Later...
unsubscribe()
```

## Future Enhancements (Phase 3)

- Backend API endpoint for log collection
- Agent access to browser logs
- Real-time log streaming via WebSocket
- Log filtering and search UI

## Related Files

- [`src/utils/logger.ts`](../apps/web/src/utils/logger.ts) - Logger class
- [`src/utils/logCollector.ts`](../apps/web/src/utils/logCollector.ts) - Log collection
- [`src/App.tsx`](../apps/web/src/App.tsx) - Usage example
- [`src/components/TerrainMesh.tsx`](../apps/web/src/components/TerrainMesh.tsx) - Usage example
- [`src/utils/terrainTracker.ts`](../apps/web/src/utils/terrainTracker.ts) - Usage example
