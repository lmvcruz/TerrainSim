/**
 * MANUAL DEBUGGING TEST
 *
 * This file adds console logging to track the terrain update flow.
 * Run the application and check the browser console to see if updates are happening.
 *
 * TO USE:
 * 1. Import this in App.tsx: `import './debug-terrain-updates'`
 * 2. Open browser console (F12)
 * 3. Change parameters and click "Generate Terrain"
 * 4. Watch the console output
 */

import { logger } from './utils/logger'

const debugLogger = logger.withContext('DebugTerrainUpdates')

// This module will be imported and executed when the app loads
debugLogger.info('🔍 Terrain Update Debugger Loaded - watching for terrain update events')

// We'll monkey-patch Float32Array constructor to track when new heightmaps are created
const OriginalFloat32Array = Float32Array
let heightmapCreationCount = 0

// @ts-ignore
globalThis.Float32Array = class extends OriginalFloat32Array {
  constructor(...args: ConstructorParameters<typeof OriginalFloat32Array>) {
    // @ts-ignore - spread tuple for constructor
    super(...args)

    // Track heightmap-sized arrays (128x128 = 16384)
    if (this.length === 16384 || this.length === 65536) {
      heightmapCreationCount++
      const values = Array.from(this.slice(0, 5)).map(v => v.toFixed(2))
      debugLogger.debug(`📊 Float32Array #${heightmapCreationCount} created`, {
        size: this.length,
        firstFive: values,
        stack: new Error().stack?.split('\n').slice(2, 5).join('\n'),
      })
    }
  }
}

// Log React state updates (this requires React DevTools hooks)
if (typeof window !== 'undefined') {
  // Monitor fetch calls
  const originalFetch = window.fetch
  let apiCallCount = 0

  window.fetch = async function(...args) {
    const url = args[0]?.toString() || ''

    if (url.includes('/generate')) {
      apiCallCount++
      const body = typeof args[1] === 'object' && args[1]?.body
        ? JSON.parse(args[1].body as string)
        : null

      debugLogger.info(`🌐 API Call #${apiCallCount} - /generate`, { parameters: body })

      const result = await originalFetch(...args)
      const clone = result.clone()
      const data = await clone.json()

      debugLogger.info(`✅ API Response #${apiCallCount}`, {
        dataLength: data.data?.length || 0,
        statistics: data.statistics,
        firstFive: data.data?.slice(0, 5).map((v: number) => v.toFixed(2)),
      })

      return result
    }

    return originalFetch(...args)
  }
}

export {}
