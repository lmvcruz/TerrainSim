#!/usr/bin/env node
/**
 * Test to verify play button executes simulation and populates frames
 */

import { chromium } from 'playwright';

async function testPlayButtonSimulation() {
  console.log('🧪 TESTING PLAY BUTTON SIMULATION');
  console.log('═'.repeat(60));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let generateCalled = false;
  let sessionCreated = false;
  let sessionId = null;
  const executeCalls = [];

  // Monitor network requests
  page.on('response', async (response) => {
    const url = response.url();

    if (url.includes('/generate') && response.request().method() === 'POST') {
      generateCalled = true;
      console.log(`   ✅ /generate called: ${response.status()}`);
    }

    if (url.includes('/simulate/create') && response.request().method() === 'POST') {
      if (response.ok()) {
        const data = await response.json();
        sessionId = data.sessionId;
        sessionCreated = true;
        console.log(`   ✅ /simulate/create called: ${response.status()}`);
        console.log(`   📝 Session ID: ${sessionId}`);
      }
    }

    if (url.includes('/simulate/execute') && response.request().method() === 'POST') {
      if (response.ok()) {
        const data = await response.json();
        executeCalls.push(data.frame);
        console.log(`   ✅ /simulate/execute frame ${data.frame}: ${response.status()}`);
      }
    }
  });

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      console.log(`   🔴 Browser Error: ${text}`);
    } else if (text.includes('Frame') || text.includes('Simulation') || text.includes('Executing')) {
      console.log(`   📝 ${text}`);
    }
  });

  try {
    console.log('\n📡 Step 1: Load page and generate terrain');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    // Generate terrain
    console.log('   Clicking Generate Terrain...');
    await page.click('button:has-text("Generate Terrain")');
    await page.waitForTimeout(3000);

    console.log('\n🎬 Step 2: Click Play button');
    await page.waitForTimeout(500);

    // Debug: Check what buttons are available
    const allButtons = await page.locator('button').allTextContents();
    console.log(`   Available buttons: ${allButtons.join(', ')}`);

    // Find and click play button in timeline - try multiple selectors
    let playClicked = false;
    const selectors = [
      'button[title="Play"]',
      'button:has-text("Play")',
      'button:has(svg)', // Button with play icon
    ];

    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   Found ${count} button(s) with selector: ${selector}`);
        await page.locator(selector).first().click();
        playClicked = true;
        break;
      }
    }

    if (!playClicked) {
      throw new Error('Could not find play button');
    }
    // Wait for simulation to complete (should take ~500ms for 9 frames)
    await page.waitForTimeout(5000);

    console.log('\n📊 Step 3: Validation');
    console.log('═'.repeat(60));

    const results = {
      'Terrain generated': generateCalled,
      'Session created': sessionCreated,
      'Simulation executed': executeCalls.length > 0,
      'All frames executed (2-10)': executeCalls.length === 9,
      'Frames in order': executeCalls.join(',') === '2,3,4,5,6,7,8,9,10',
    };

    let allPassed = true;
    for (const [check, passed] of Object.entries(results)) {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
      if (!passed) allPassed = false;
    }

    if (executeCalls.length > 0) {
      console.log(`\n📋 Executed frames: ${executeCalls.join(', ')}`);
    }

    console.log('═'.repeat(60));
    console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

    await browser.close();
    return allPassed;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await browser.close();
    return false;
  }
}

testPlayButtonSimulation().catch(console.error);
