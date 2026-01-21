import { test, expect } from '@playwright/test';

test.describe('Simulation Frame Update', () => {
  test('should update currentFrame when executeSimulation runs', async ({ page, context }) => {
    console.log('\n🧪 Testing if simulation updates currentFrame\n');

    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('Frame') || text.includes('currentFrame') || text.includes('TerrainViewer')) {
        console.log(`[BROWSER] ${text}`);
      }
    });

    // Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✓ App loaded');

    // Step 1: Generate terrain
    console.log('\n📍 Step 1: Generating terrain...');
    await page.click('button:has-text("Generate Terrain")');
    await page.waitForTimeout(2000);

    const sessionInfo = await page.evaluate(() => {
      return {
        hasWindow: typeof window !== 'undefined',
        sessionId: (window as any).sessionId
      };
    });
    console.log('Session info:', sessionInfo);

    // Step 2: Get session ID and execute frames via API
    console.log('\n📍 Step 2: Executing frames via API...');

    // Use Playwright's request context to call the API
    const apiContext = context;

    // Get session by looking for the most recent one
    const sessionsResponse = await page.request.get('http://localhost:3001/simulate/list');
    const sessions = await sessionsResponse.json();
    console.log('Available sessions:', sessions);

    // Find the session (should be the most recent one)
    const sessionId = sessions.sessions?.[0]?.id;

    if (!sessionId) {
      // Try to get it from localStorage
      const storedSessionId = await page.evaluate(() => localStorage.getItem('sessionId'));
      console.log('Session from localStorage:', storedSessionId);

      if (!storedSessionId) {
        throw new Error('No session ID found');
      }
    }

    const finalSessionId = sessionId || await page.evaluate(() => localStorage.getItem('sessionId'));
    console.log(`✓ Using session: ${finalSessionId?.substring(0, 8)}...`);

    // Step 3: Execute frames and inject into frontend
    console.log('\n📍 Step 3: Executing frames and watching frontend...');

    for (let frame = 1; frame <= 3; frame++) {
      console.log(`\n  🎬 Executing frame ${frame}...`);

      // Call backend API
      const response = await page.request.post('http://localhost:3001/simulate/execute', {
        data: {
          sessionId: finalSessionId,
          frame
        }
      });

      if (!response.ok()) {
        console.log(`  ❌ Frame ${frame} failed: ${response.status()} ${response.statusText()}`);
        const errorText = await response.text();
        console.log(`  Error: ${errorText}`);
        continue;
      }

      const data = await response.json();
      console.log(`  ✓ Backend returned terrain (${data.terrain.length} points, range: ${data.statistics.min.toFixed(2)} to ${data.statistics.max.toFixed(2)})`);

      // Now call the frontend's executeSimulation or manually update the cache
      await page.evaluate(({ frameNum, terrain }) => {
        // Try to access the React context
        const heightmap = new Float32Array(terrain);

        // Emit custom event that the app can listen to
        const event = new CustomEvent('debug-frame-complete', {
          detail: { frame: frameNum, terrain: heightmap }
        });
        window.dispatchEvent(event);

        console.log(`🔔 Dispatched debug-frame-complete event for frame ${frameNum}`);
      }, { frameNum: frame, terrain: data.terrain });

      // Wait a bit for React to process
      await page.waitForTimeout(500);

      // Check what frame is displayed
      const currentFrameLog = consoleLogs
        .filter(log => log.includes('TerrainViewer: Rendering frame'))
        .pop();

      console.log(`  Current frame log: ${currentFrameLog}`);
    }

    // Step 4: Check final state
    console.log('\n📍 Step 4: Checking final state...');

    const frameRenderLogs = consoleLogs.filter(log => log.includes('TerrainViewer: Rendering frame'));
    console.log(`\nTotal frame render logs: ${frameRenderLogs.length}`);
    frameRenderLogs.slice(-5).forEach(log => console.log(`  ${log}`));

    const lastLog = frameRenderLogs[frameRenderLogs.length - 1];
    const frameMatch = lastLog?.match(/frame (\d+)/);
    const currentFrame = frameMatch ? parseInt(frameMatch[1]) : -1;

    console.log(`\n📊 RESULT: Current frame = ${currentFrame} (expected: 0, because we're not calling React's state updater)`);
    console.log('\n💡 This test shows the issue: We need the FRONTEND to call its own executeSimulation');
    console.log('   which will update both the heightmap cache AND currentFrame state');

    await page.screenshot({ path: 'test-results/simulation-frame-test.png' });
    console.log('\n✓ Screenshot saved');
  });

  test('should update when clicking Execute Pipeline button', async ({ page }) => {
    console.log('\n🧪 Testing Execute Pipeline button\n');

    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('Frame') || text.includes('simulation') || text.includes('execute')) {
        console.log(`[BROWSER] ${text}`);
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✓ App loaded');

    // Generate terrain first
    console.log('\n📍 Step 1: Generating terrain...');
    await page.click('button:has-text("Generate Terrain")');
    await page.waitForTimeout(2000);

    // Look for Execute Pipeline button
    console.log('\n📍 Step 2: Looking for Execute Pipeline button...');
    const executeButton = page.locator('button:has-text("Execute Pipeline")');
    const executeButtonCount = await executeButton.count();
    console.log(`Found ${executeButtonCount} Execute Pipeline buttons`);

    if (executeButtonCount > 0) {
      const isVisible = await executeButton.first().isVisible();
      const isEnabled = await executeButton.first().isEnabled();
      console.log(`Button visible: ${isVisible}, enabled: ${isEnabled}`);

      // Click it
      await executeButton.first().click();
      console.log('✓ Clicked Execute Pipeline');

      // Wait and check logs
      await page.waitForTimeout(3000);

      const executionLogs = consoleLogs.filter(log =>
        log.toLowerCase().includes('execut') ||
        log.toLowerCase().includes('simulat')
      );
      console.log('\nExecution-related logs:');
      executionLogs.slice(-10).forEach(log => console.log(`  ${log}`));
    } else {
      console.log('❌ No Execute Pipeline button found');
    }

    await page.screenshot({ path: 'test-results/execute-button-test.png' });
  });
});
