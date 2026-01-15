#!/usr/bin/env node
/**
 * Test to verify Generate Terrain button switches to frame 1
 */

import { chromium } from 'playwright';

async function testGenerateTerrainFlow() {
  console.log('🧪 TESTING GENERATE TERRAIN FRAME SWITCHING');
  console.log('═'.repeat(60));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('\n📡 Loading page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    // Check initial frame number
    const initialFrame = await page.evaluate(() => {
      // Find the frame display text (e.g., "0 / 10" or "1 / 10")
      const allText = document.body.innerText;
      const match = allText.match(/Frame:\s*(\d+)\s*\/\s*\d+/);
      return match ? parseInt(match[1]) : null;
    });

    console.log(`\n📊 Initial State:`);
    console.log(`   Current Frame: ${initialFrame !== null ? initialFrame : 'not found'}`);

    // Click Generate Terrain button
    console.log('\n🖱️  Clicking Generate Terrain...');
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/generate') && resp.request().method() === 'POST',
        { timeout: 10000 }
      ),
      page.click('button:has-text("Generate Terrain")'),
    ]);

    console.log(`   API Response: ${response.status()} ${response.statusText()}`);

    // Wait for React to update
    await page.waitForTimeout(1000);

    // Check frame number after generation
    const finalFrame = await page.evaluate(() => {
      // Find the frame display text (e.g., "0 / 10" or "1 / 10")
      const allText = document.body.innerText;
      const match = allText.match(/Frame:\s*(\d+)\s*\/\s*\d+/);
      return match ? parseInt(match[1]) : null;
    });

    console.log(`\n📊 After Generation:`);
    console.log(`   Current Frame: ${finalFrame !== null ? finalFrame : 'not found'}`);

    // Validation
    const frameSwitched = finalFrame === 1 && initialFrame !== 1;
    console.log(`\n✅ Expected Behavior: Frame switches to 1`);
    console.log(`   Frame switched: ${frameSwitched ? '✅ YES' : '❌ NO'}`);

    if (frameSwitched) {
      console.log('\n✅ TEST PASSED: Terrain generation switches to frame 1');
    } else {
      console.log('\n❌ TEST FAILED: Frame did not switch to 1');
      console.log(`   Expected frame: 1`);
      console.log(`   Actual frame: ${finalFrame}`);
    }

    await browser.close();
    return frameSwitched;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await browser.close();
    return false;
  }
}

testGenerateTerrainFlow().catch(console.error);
