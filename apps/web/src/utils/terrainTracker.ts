/**
 * Terrain Update Tracker
 *
 * This module tracks terrain generations and highlights differences
 * between successive generations to help debug update issues.
 */

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

  console.log(`\n${'='.repeat(80)}`)
  console.log(`%c🎯 GENERATION #${generationCount}`, 'background: #1e40af; color: white; font-size: 16px; font-weight: bold; padding: 8px 16px;')
  console.log(`${'='.repeat(80)}`)

  if (lastGeneration) {
    // Compare with previous generation
    const centerDiff = Math.abs(data.centerValue - lastGeneration.centerValue)
    const meanDiff = Math.abs(data.mean - lastGeneration.mean)

    console.log('\n📊 COMPARISON WITH PREVIOUS GENERATION:')
    console.log(`  Center value: ${lastGeneration.centerValue.toFixed(4)} → ${data.centerValue.toFixed(4)} (diff: ${centerDiff.toFixed(4)})`)
    console.log(`  Mean value:   ${lastGeneration.mean.toFixed(4)} → ${data.mean.toFixed(4)} (diff: ${meanDiff.toFixed(4)})`)
    console.log(`  Min value:    ${lastGeneration.min.toFixed(2)} → ${data.min.toFixed(2)}`)
    console.log(`  Max value:    ${lastGeneration.max.toFixed(2)} → ${data.max.toFixed(2)}`)

    console.log(`\n  Parameters changed:`)
    Object.keys(data.parameters).forEach(key => {
      const oldVal = lastGeneration!.parameters[key]
      const newVal = data.parameters[key]
      if (oldVal !== newVal) {
        console.log(`    ✨ ${key}: ${oldVal} → ${newVal}`)
      }
    })

    if (centerDiff < 0.001 && meanDiff < 0.001) {
      console.log(`\n  ⚠️⚠️⚠️  WARNING: Data looks IDENTICAL! ⚠️⚠️⚠️`)
      console.log(`  This means the visual model SHOULD NOT CHANGE`)
      console.log(`  If parameters changed but data is identical, there's a bug in the API!`)
    } else if (centerDiff > 0.1) {
      console.log(`\n  ✅✅✅  Data is SIGNIFICANTLY DIFFERENT! ✅✅✅`)
      console.log(`  The 3D mesh SHOULD visually update now!`)
      console.log(`  If you don't see a visual change, the issue is in Three.js rendering.`)
    }
  }

  lastGeneration = data
  console.log(`${'='.repeat(80)}\n`)
}

// Log to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).terrainGenerationCount = () => generationCount
  (window as any).lastTerrainData = () => lastGeneration
}
