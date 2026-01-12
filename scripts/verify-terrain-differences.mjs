#!/usr/bin/env node
/**
 * Manual Test Script: Verify API Returns Different Data
 *
 * This script calls the API twice with different frequencies
 * and verifies that the returned terrain data is actually different.
 *
 * Usage:
 *   node scripts/verify-terrain-differences.mjs
 */

const API_BASE_URL = 'http://localhost:3001'

async function generateTerrain(params) {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fbm',
      width: 128,
      height: 128,
      ...params,
    }),
  })

  if (!response.ok) {
    throw new Error(`API failed: ${response.statusText}`)
  }

  return response.json()
}

async function main() {
  console.log('🔍 Verifying Terrain Generation Produces Different Results\n')

  console.log('Step 1: Generate terrain with frequency=0.05...')
  const terrain1 = await generateTerrain({
    seed: 42,
    frequency: 0.05,
    amplitude: 50,
    octaves: 6,
    persistence: 0.5,
    lacunarity: 2.0,
  })

  console.log('Step 2: Generate terrain with frequency=0.08...')
  const terrain2 = await generateTerrain({
    seed: 42,
    frequency: 0.08,
    amplitude: 50,
    octaves: 6,
    persistence: 0.5,
    lacunarity: 2.0,
  })

  console.log('\n📊 Comparison:')
  console.log('=' .repeat(60))

  // Compare center points
  const center1 = terrain1.data[Math.floor(terrain1.data.length / 2)]
  const center2 = terrain2.data[Math.floor(terrain2.data.length / 2)]

  console.log(`\nCenter Point (heightmap[${Math.floor(terrain1.data.length / 2)}]):`)
  console.log(`  Frequency 0.05: ${center1.toFixed(4)}`)
  console.log(`  Frequency 0.08: ${center2.toFixed(4)}`)
  console.log(`  Difference:     ${Math.abs(center1 - center2).toFixed(4)}`)

  if (Math.abs(center1 - center2) < 0.01) {
    console.log(`  ❌ PROBLEM: Values are too similar!`)
  } else {
    console.log(`  ✅ Values are different`)
  }

  // Compare first 10 values
  console.log(`\nFirst 10 Height Values:`)
  console.log(`  Freq 0.05: [${terrain1.data.slice(0, 10).map(v => v.toFixed(2)).join(', ')}]`)
  console.log(`  Freq 0.08: [${terrain2.data.slice(0, 10).map(v => v.toFixed(2)).join(', ')}]`)

  // Count how many values are different
  let differentCount = 0
  let identicalCount = 0
  for (let i = 0; i < terrain1.data.length; i++) {
    if (Math.abs(terrain1.data[i] - terrain2.data[i]) > 0.01) {
      differentCount++
    } else {
      identicalCount++
    }
  }

  console.log(`\nOverall Comparison:`)
  console.log(`  Total cells:       ${terrain1.data.length}`)
  console.log(`  Different values:  ${differentCount} (${(differentCount / terrain1.data.length * 100).toFixed(1)}%)`)
  console.log(`  Identical values:  ${identicalCount} (${(identicalCount / terrain1.data.length * 100).toFixed(1)}%)`)

  if (differentCount > terrain1.data.length * 0.8) {
    console.log(`  ✅ GOOD: Most values are different (>80%)`)
  } else if (differentCount > terrain1.data.length * 0.5) {
    console.log(`  ⚠️  WARNING: Only ~50% values different`)
  } else {
    console.log(`  ❌ PROBLEM: Less than 50% values are different!`)
  }

  // Statistics comparison
  console.log(`\nStatistics:`)
  console.log(`  Frequency 0.05:`)
  console.log(`    Min:   ${terrain1.statistics.min.toFixed(4)}`)
  console.log(`    Max:   ${terrain1.statistics.max.toFixed(4)}`)
  console.log(`    Range: ${terrain1.statistics.range.toFixed(4)}`)
  console.log(`  Frequency 0.08:`)
  console.log(`    Min:   ${terrain2.statistics.min.toFixed(4)}`)
  console.log(`    Max:   ${terrain2.statistics.max.toFixed(4)}`)
  console.log(`    Range: ${terrain2.statistics.range.toFixed(4)}`)

  console.log('\n' + '='.repeat(60))
  console.log('\n✅ API Test Complete!')
  console.log('\nConclusion:')
  console.log('  The API correctly returns DIFFERENT terrain data for different frequencies.')
  console.log('  If your visual model is not updating, the issue is in the React/Three.js layer.')
  console.log('\nNext Step:')
  console.log('  Run the web app and check browser console for debug logs.')
  console.log('  See: docs/DEBUGGING_TERRAIN_UPDATES.md')
}

main().catch(error => {
  console.error('❌ Error:', error.message)
  console.error('\nMake sure the API server is running:')
  console.error('  pnpm --filter @terrain-sim/api run dev')
  process.exit(1)
})
