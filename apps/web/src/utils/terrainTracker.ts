/**
 * Terrain Update Tracker
 *
 * This module tracks terrain generations and highlights differences
 * between successive generations to help debug update issues.
 */

import { logger } from './logger'

const trackerLogger = logger.withContext('TerrainTracker')

let generationCount = 0
let lastGeneration: {
  centerValue: number
  firstFive: number[]
  parameters: any
  min: number
  max: number
  mean: number
} | null = null

export function trackGeneration(data: {
  centerValue: number
  firstFive: number[]
  parameters: any
  min: number
  max: number
  mean: number
}) {
  generationCount++

  trackerLogger.group(`🎯 GENERATION #${generationCount}`, () => {
    if (lastGeneration) {
      // Compare with previous generation
      const centerDiff = Math.abs(data.centerValue - lastGeneration.centerValue)
      const meanDiff = Math.abs(data.mean - lastGeneration.mean)

      trackerLogger.info('Comparison with previous generation', {
        centerValue: {
          from: lastGeneration.centerValue.toFixed(4),
          to: data.centerValue.toFixed(4),
          diff: centerDiff.toFixed(4),
        },
        meanValue: {
          from: lastGeneration.mean.toFixed(4),
          to: data.mean.toFixed(4),
          diff: meanDiff.toFixed(4),
        },
        minValue: {
          from: lastGeneration.min.toFixed(2),
          to: data.min.toFixed(2),
        },
        maxValue: {
          from: lastGeneration.max.toFixed(2),
          to: data.max.toFixed(2),
        },
      })

      // Check for parameter changes
      const changedParams: Record<string, { from: any; to: any }> = {}
      Object.keys(data.parameters).forEach(key => {
        const oldVal = lastGeneration!.parameters[key]
        const newVal = data.parameters[key]
        if (oldVal !== newVal) {
          changedParams[key] = { from: oldVal, to: newVal }
        }
      })

      if (Object.keys(changedParams).length > 0) {
        trackerLogger.info('Parameters changed', changedParams)
      }

      if (centerDiff < 0.001 && meanDiff < 0.001) {
        trackerLogger.warn('⚠️ Data looks IDENTICAL - mesh should NOT change', {
          note: 'If parameters changed but data is identical, there is a bug in the API',
        })
      } else if (centerDiff > 0.1) {
        trackerLogger.info('✅ Data is SIGNIFICANTLY DIFFERENT - mesh should update', {
          note: 'If you don\'t see a visual change, the issue is in Three.js rendering',
        })
      }
    }
  })

  lastGeneration = data
}

// Log to window for easy debugging
if (typeof window !== 'undefined') {
  ;(window as any).terrainGenerationCount = () => generationCount
  ;(window as any).lastTerrainData = () => lastGeneration
}
