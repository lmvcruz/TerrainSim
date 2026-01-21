import { test, expect } from '@playwright/test';

test.describe('Terrain Update Debugging', () => {
  test('should update terrain viewer when currentFrame changes', async ({ page }) => {
    console.log('\n🧪 Starting Terrain Update Debug Test\n');

    // Enable console logging from the page
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('TerrainViewer') || text.includes('TerrainMesh') || text.includes('Frame') || text.includes('heightmap')) {
        console.log(`[BROWSER] ${text}`);
      }
    });

    // Navigate to the app
    await page.goto('http://localhost:5173');
    console.log('✓ Page loaded');

    // Wait for the app to be ready
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✓ Canvas found');

    // Step 1: Generate terrain
    console.log('\n📍 Step 1: Generating terrain...');
    await page.click('button:has-text("Generate Terrain")');

    // Wait for generation to complete
    await page.waitForTimeout(2000);

    // Check console logs for terrain generation
    const generationLogs = consoleLogs.filter(log =>
      log.includes('Terrain generated') || log.includes('Frame') || log.includes('TerrainViewer')
    );
    console.log('Generation logs:', generationLogs.slice(-5));

    // Step 2: Manually set heightmap for frame 1 and switch to it
    console.log('\n📍 Step 2: Manually creating frame 1 heightmap and switching...');

    const frame1Created = await page.evaluate(() => {
      try {
        // Create a heightmap with different values for frame 1
        const heightmap = new Float32Array(256 * 256);
        for (let i = 0; i < heightmap.length; i++) {
          heightmap[i] = Math.sin(i / 100) * 50; // Wavy pattern
        }

        // Try to access React context (this might not work)
        // Instead, we'll use the browser's console commands
        console.log('Created test heightmap for frame 1');
        (window as any).testHeightmap1 = heightmap;
        return true;
      } catch (e) {
        console.error('Failed to create test heightmap:', e);
        return false;
      }
    });

    if (!frame1Created) {
      console.log('❌ Could not create test heightmap');
    } else {
      console.log('✓ Created test heightmap for frame 1');
    }

    // Try to click through timeline to change frames
    console.log('\n📍 Step 3: Trying to change frame via timeline...');

    // Look for frame indicators/buttons in the timeline
    const timelineButtons = await page.locator('[data-frame]').all();
    console.log(`Found ${timelineButtons.length} timeline elements`);

    if (timelineButtons.length > 0) {
      // Click on frame 1
      await timelineButtons[Math.min(1, timelineButtons.length - 1)].click();
      await page.waitForTimeout(500);
      console.log('✓ Clicked timeline element');
    } else {
      console.log('❌ No timeline elements found');
    }
// Step 4: Check frame display logs
    console.log('\n📍 Step 4: Checking frame display logs...');
    await page.waitForTimeout(1000);

    const frameLogs = consoleLogs.filter(log => log.includes('TerrainViewer: Rendering frame'));
    console.log(`Frame logs count: ${frameLogs.length}`);
    frameLogs.slice(-10).forEach(log => console.log(`  ${log}`));

    const lastFrameLog = frameLogs[frameLogs.length - 1];
    const frameMatch = lastFrameLog?.match(/frame (\d+)/);
    const currentFrame = frameMatch ? parseInt(frameMatch[1]) : -1;

    console.log(`\n📊 DIAGNOSTIC SUMMARY:`);
    console.log(`  Current frame displayed: ${currentFrame}`);
    console.log(`  Total console logs: ${consoleLogs.length}`);
    console.log(`  Frame render logs: ${frameLogs.length}`);

    // Check heightmap updates
    const heightmapLogs = consoleLogs.filter(log =>
      log.includes('TerrainMesh received NEW heightmap') ||
      log.includes('GPU TEXTURE UPDATED')
    );
    console.log(`  Heightmap updates: ${heightmapLogs.length}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/terrain-state-check.png' });
    console.log('\n✓ Screenshot saved: terrain-state-check.png');

    console.log('\n✅ TEST COMPLETE - Manual check required');
    console.log('   The issue is that we cannot easily trigger simulation from Playwright');
    console.log('   Check the console logs above to see if terrain updates are happening');
  });
});
