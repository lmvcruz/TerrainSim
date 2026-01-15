#!/usr/bin/env node
/**
 * Test to verify Next Frame button updates the terrain visually
 */

import { chromium } from 'playwright';

async function testNextFrameButton() {
  console.log('🧪 TESTING NEXT FRAME BUTTON TERRAIN UPDATES');
  console.log('═'.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n📡 Step 1: Generate terrain and run simulation');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');

    // Generate terrain
    await page.click('button:has-text("Generate Terrain")');
    await page.waitForTimeout(3000);

    // Run simulation
    const playButton = page.locator('button[title*="Play"]').last();
    await playButton.click();
    await page.waitForTimeout(15000); // Wait for simulation

    console.log('   ✅ Simulation complete');

    // Get frame indicator
    const getFrameNumber = async () => {
      const frameText = await page.locator('text=/Frame:\\s*\\d+\\s*\\/\\s*10/').first().textContent();
      const match = frameText.match(/Frame:\s*(\d+)\s*\/\s*10/);
      return match ? parseInt(match[1]) : null;
    };

    console.log('\n📡 Step 2: Test Next Frame button');

    // Reset to frame 0
    await page.click('button[title="Stop"]');
    await page.waitForTimeout(500);

    const initialFrame = await getFrameNumber();
    console.log(`   Initial frame: ${initialFrame}`);

    // Take screenshot of frame 0
    await page.screenshot({ path: 'frame-0.png' });
    console.log('   📸 Screenshot saved: frame-0.png');

    // Click Next Frame 3 times
    for (let i = 1; i <= 3; i++) {
      await page.click('button[title="Next frame"]');
      await page.waitForTimeout(500);

      const currentFrame = await getFrameNumber();
      console.log(`   Frame after click ${i}: ${currentFrame}`);

      await page.screenshot({ path: `frame-${currentFrame}.png` });
      console.log(`   📸 Screenshot saved: frame-${currentFrame}.png`);
    }

    const finalFrame = await getFrameNumber();

    console.log('\n📊 VALIDATION');
    console.log('═'.repeat(60));
    console.log(`Initial frame: ${initialFrame}`);
    console.log(`Final frame: ${finalFrame}`);
    console.log(`Frame changed: ${finalFrame > initialFrame ? '✅' : '❌'}`);
    console.log('\n📸 Screenshots saved for visual comparison:');
    console.log('   - frame-0.png');
    console.log('   - frame-1.png');
    console.log('   - frame-2.png');
    console.log('   - frame-3.png');
    console.log('\n🔍 Browser will stay open for 10 seconds for manual inspection...');

    await page.waitForTimeout(10000);
    await browser.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await browser.close();
  }
}

testNextFrameButton().catch(console.error);
