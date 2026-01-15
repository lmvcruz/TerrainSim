#!/usr/bin/env node
/**
 * Test complete simulation flow: Generate → Play → Verify frames
 */

import { chromium } from 'playwright';

async function testSimulationFlow() {
  console.log('🧪 TESTING COMPLETE SIMULATION FLOW');
  console.log('═'.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  let sessionCreated = false;
  let simulationStarted = false;
  let framesExecuted = [];

  // Monitor network
  page.on('response', async (response) => {
    const url = response.url();

    if (url.includes('/simulate/create')) {
      sessionCreated = response.ok();
      const data = await response.json();
      console.log(`   ✅ Session created: ${data.sessionId}`);
    }

    if (url.includes('/simulate/execute')) {
      if (response.ok()) {
        const data = await response.json();
        framesExecuted.push(data.frame);
        console.log(`   📊 Frame ${data.frame} executed`);
      }
    }
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('Play button clicked') || text.includes('Executing simulation')) {
      console.log(`   🔊 ${text}`);
      simulationStarted = true;
    }
    if (text.includes('Frame') && text.includes('complete')) {
      console.log(`   🔊 ${text}`);
    }
  });

  try {
    console.log('\n📡 Step 1: Load page and generate terrain');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    // Click Generate Terrain
    await page.click('button:has-text("Generate Terrain")');
    await page.waitForTimeout(3000);

    if (!sessionCreated) {
      throw new Error('Session was not created');
    }

    console.log('\n📡 Step 2: Click Play button');

    // There are two play buttons - click the one in ConfigurationTimeline (bottom panel)
    // It has disabled state control and sessionId check
    const playButton = page.locator('button[title*="Play"]').filter({ hasText: '' }).last();
    const playButtonDisabled = await playButton.isDisabled();
    console.log(`   Play button disabled: ${playButtonDisabled}`);

    if (playButtonDisabled) {
      throw new Error('Play button is disabled');
    }

    await playButton.click();
    console.log('   ✅ Play button clicked');

    // Wait for simulation to complete (up to 15 seconds)
    console.log('\n📡 Step 3: Wait for simulation to execute');
    await page.waitForTimeout(15000);

    console.log('\n📊 VALIDATION RESULTS');
    console.log('═'.repeat(60));

    const results = {
      'Session created': sessionCreated,
      'Simulation started': simulationStarted,
      'Frames executed': framesExecuted.length > 0,
      'Expected frames (2-10)': framesExecuted.length === 9,
    };

    let allPassed = true;
    for (const [check, passed] of Object.entries(results)) {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
      if (!passed) allPassed = false;
    }

    if (framesExecuted.length > 0) {
      console.log(`   Frames executed: ${framesExecuted.join(', ')}`);
    } else {
      console.log(`   ❌ No frames were executed!`);
    }

    console.log('═'.repeat(60));
    console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

    // Take screenshot
    await page.screenshot({ path: 'simulation-result.png' });
    console.log('📸 Screenshot saved: simulation-result.png\n');

    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);

    await browser.close();
    return allPassed;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'simulation-error.png' });
    await browser.close();
    return false;
  }
}

testSimulationFlow().catch(console.error);
