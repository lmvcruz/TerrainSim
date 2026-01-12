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

// This module will be imported and executed when the app loads
console.log('%c🔍 Terrain Update Debugger Loaded', 'background: #222; color: #4a9eff; font-size: 14px; padding: 4px 8px;')
console.log('Watch this console for terrain update events...\n')

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
      console.log(
        `%c📊 Float32Array #${heightmapCreationCount} created`,
        'color: #4a9eff',
        `\n  Size: ${this.length} elements`,
        `\n  First 5 values: [${values.join(', ')} ...]`,
        `\n  Stack trace:`,
        new Error().stack?.split('\n').slice(2, 5).join('\n')
      )
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

      console.log(
        `%c🌐 API Call #${apiCallCount} - /generate`,
        'background: #2a7d44; color: white; font-weight: bold; padding: 4px 8px;',
        `\n  Parameters:`,
        body
      )

      const result = await originalFetch(...args)
      const clone = result.clone()
      const data = await clone.json()

      console.log(
        `%c✅ API Response #${apiCallCount}`,
        'background: #2a7d44; color: white; padding: 4px 8px;',
        `\n  Data length: ${data.data?.length || 0}`,
        `\n  Statistics:`, data.statistics,
        `\n  First 5 values: [${data.data?.slice(0, 5).map((v: number) => v.toFixed(2)).join(', ')} ...]`
      )

      return result
    }

    return originalFetch(...args)
  }
}

export {}
