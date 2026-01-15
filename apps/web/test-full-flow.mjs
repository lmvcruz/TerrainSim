#!/usr/bin/env node
/**
 * End-to-end test: Generate Terrain button flow
 * Tests button click -> API call -> terrain update -> visual verification
 */

import { chromium } from 'playwright';

async function testFullFlow() {
  console.log('🧪 Testing full Generate Terrain flow...\n');

  const browser = await chromium.launch({ headless: false }); // Show browser for debugging
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  // Capture console logs from the page
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`   🔴 Browser Error: ${text}`);
    } else if (text.includes('Terrain generated') || text.includes('Error')) {
      console.log(`   📝 Browser Log: ${text}`);
    }
  });

  try {
    console.log('📡 Navigating to localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for canvas to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Page loaded\n');

    // Wait for React to render
    await page.waitForTimeout(1000);

    // Take screenshot BEFORE clicking button
    console.log('📸 Taking BEFORE screenshot...');
    await page.screenshot({
      path: 'D:\\playground\\TerrainSim\\apps\\web\\terrain-before.png',
    });

    // Find and click Generate Terrain button
    console.log('🔍 Looking for Generate Terrain button...');

    const buttonSelector = 'button:has-text("Generate Terrain")';
    const buttonExists = await page.locator(buttonSelector).count() > 0;

    if (!buttonExists) {
      console.log('❌ Generate Terrain button NOT FOUND');
      console.log('   Searching for any buttons with "Generate" or "Terrain"...');
      const allButtons = await page.locator('button').allTextContents();
      console.log('   Available buttons:', allButtons);
      throw new Error('Generate Terrain button not found');
    }

    console.log('✅ Button found, clicking...\n');

    // Click the button and wait for network activity
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/generate') && resp.request().method() === 'POST',
        { timeout: 10000 }
      ),
      page.click(buttonSelector),
    ]);

    console.log(`📡 API Response: ${response.status()} ${response.statusText()}`);

    const responseData = await response.json();
    console.log('📦 Response Data:');
    console.log(`   Has 'data' field: ${responseData.data ? '✅' : '❌'}`);
    console.log(`   Data length: ${responseData.data?.length || 0}`);
    console.log(`   Width: ${responseData.width}`);
    console.log(`   Height: ${responseData.height}`);
    console.log(`   Statistics:`, responseData.statistics);

    // Wait for terrain to update (give React time to process)
    await page.waitForTimeout(2000);

    // Take screenshot AFTER generation
    console.log('\n📸 Taking AFTER screenshot...');
    await page.screenshot({
      path: 'D:\\playground\\TerrainSim\\apps\\web\\terrain-after.png',
    });

    // Check for error messages on the page
    const errorVisible = await page.locator('text=/Error:/i').count();
    if (errorVisible > 0) {
      const errorText = await page.locator('text=/Error:/i').first().textContent();
      console.log(`\n❌ Error displayed on page: ${errorText}`);
    } else {
      console.log('\n✅ No error messages displayed');
    }

    console.log('\n✅ Full flow test complete!');
    console.log('📊 Compare terrain-before.png and terrain-after.png to verify terrain changed\n');

    // Keep browser open for inspection
    console.log('🔍 Browser kept open for inspection. Press Ctrl+C to close.');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({
      path: 'D:\\playground\\TerrainSim\\apps\\web\\terrain-error.png',
    });
  } finally {
    await browser.close();
  }
}

testFullFlow().catch(console.error);
