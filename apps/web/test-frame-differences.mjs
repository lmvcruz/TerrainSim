#!/usr/bin/env node
/**
 * Test to verify frames have different terrain data
 */

import { chromium } from 'playwright';

async function testFrameDifferences() {
  console.log('🧪 TESTING FRAME DIFFERENCES');
  console.log('═'.repeat(60));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const frameStats = new Map();

  page.on('console', (msg) => {
    const text = msg.text();
    // Capture frame statistics
    const match = text.match(/Frame (\d+) complete: ({.*})/);
    if (match) {
      const frame = parseInt(match[1]);
      const stats = JSON.parse(match[2].replace(/(\w+):/g, '"$1":'));
      frameStats.set(frame, stats);
      console.log(`   📊 Frame ${frame}: min=${stats.min.toFixed(2)}, max=${stats.max.toFixed(2)}, range=${stats.range.toFixed(2)}`);
    }
  });

  try {
    console.log('\n📡 Loading page and running simulation...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');

    // Generate terrain
    await page.click('button:has-text("Generate Terrain")');
    await page.waitForTimeout(3000);

    // Click play
    await page.locator('button[title*="Play"]').last().click();
    await page.waitForTimeout(10000);

    console.log('\n📊 FRAME STATISTICS COMPARISON');
    console.log('═'.repeat(60));

    if (frameStats.size === 0) {
      console.log('❌ No frame statistics captured');
      await browser.close();
      return false;
    }

    // Check if all frames have identical statistics
    const uniqueRanges = new Set([...frameStats.values()].map(s => s.range));
    const uniqueMins = new Set([...frameStats.values()].map(s => s.min));
    const uniqueMaxs = new Set([...frameStats.values()].map(s => s.max));

    console.log(`Unique ranges: ${uniqueRanges.size}`);
    console.log(`Unique mins: ${uniqueMins.size}`);
    console.log(`Unique maxs: ${uniqueMaxs.size}`);

    if (uniqueRanges.size === 1 && uniqueMins.size === 1 && uniqueMaxs.size === 1) {
      console.log('\n❌ ALL FRAMES HAVE IDENTICAL STATISTICS');
      console.log('   This indicates the terrain is not changing between frames.');
      console.log('   The simulation is not actually modifying the terrain.\n');
      await browser.close();
      return false;
    } else {
      console.log('\n✅ FRAMES HAVE DIFFERENT STATISTICS');
      console.log('   Terrain is being modified between frames.\n');
      await browser.close();
      return true;
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await browser.close();
    return false;
  }
}

testFrameDifferences().catch(console.error);
