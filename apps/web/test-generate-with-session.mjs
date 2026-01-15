#!/usr/bin/env node
/**
 * End-to-end test: Generate Terrain button creates session
 */

import { chromium } from 'playwright';

async function testFullGenerateFlow() {
  console.log('🧪 TESTING FULL GENERATE TERRAIN FLOW WITH SESSION');
  console.log('═'.repeat(60));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let sessionId = null;
  let generateCalled = false;
  let sessionCreated = false;

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
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('Session created:')) {
      console.log(`   📝 Browser Log: ${text}`);
    }
  });

  try {
    console.log('\n📡 Loading page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    console.log('\n🖱️  Clicking Generate Terrain button...');
    await page.click('button:has-text("Generate Terrain")');

    // Wait for both API calls to complete
    await page.waitForTimeout(3000);

    console.log('\n📊 VALIDATION RESULTS');
    console.log('═'.repeat(60));

    const results = {
      '/generate called': generateCalled,
      '/simulate/create called': sessionCreated,
      'Session ID received': sessionId !== null,
    };

    let allPassed = true;
    for (const [check, passed] of Object.entries(results)) {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
      if (!passed) allPassed = false;
    }

    console.log('═'.repeat(60));
    console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

    if (sessionId) {
      console.log(`🎯 Session ID for debugging: ${sessionId}\n`);
    }

    await browser.close();
    return allPassed;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await browser.close();
    return false;
  }
}

testFullGenerateFlow().catch(console.error);
