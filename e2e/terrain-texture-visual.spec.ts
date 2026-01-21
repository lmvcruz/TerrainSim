import { test, expect } from '@playwright/test';

/**
 * Visual Regression Test for Texture Mode Switching
 *
 * This test verifies that the terrain shader correctly applies elevation-based
 * color gradients when switching between texture modes. It catches the bug where
 * switching landscape→none→landscape causes the terrain to render as a single
 * flat color instead of the proper elevation gradient.
 *
 * Test Strategy:
 * 1. Generate terrain with known seed
 * 2. Sample pixel colors in landscape mode - verify gradient
 * 3. Switch to "none" mode - verify gray
 * 4. Switch back to "landscape" - verify gradient is restored
 */

test.describe('Terrain Texture Mode - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173/');

    // Wait for the terrain viewer to be visible
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Give Three.js time to initialize
    await page.waitForTimeout(1000);
  });

  test('should maintain elevation gradient after switching texture modes', async ({ page }) => {
    // Step 1: Generate terrain with known seed
    console.log('📍 Step 1: Generating terrain...');

    // Look for the seed input field and set a known seed for reproducibility
    const seedInput = page.locator('input[type="number"]').first();
    await seedInput.fill('12345');

    // Click "Generate Terrain" button - wait for it to be enabled
    const generateButton = page.getByRole('button', { name: /generate terrain/i });
    await generateButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
    await generateButton.click();

    // Wait for terrain generation to complete
    await page.waitForTimeout(3000);

    // Step 2: Verify landscape mode shows color gradient
    console.log('📍 Step 2: Sampling colors in landscape mode...');

    // Target the Three.js canvas specifically (has data-engine attribute)
    const canvas = page.locator('canvas[data-engine^="three.js"]');
    const canvasBbox = await canvas.boundingBox();

    if (!canvasBbox) {
      throw new Error('Canvas not found');
    }

    // Sample pixels at different positions to verify gradient
    const samplePoints = [
      { x: canvasBbox.x + canvasBbox.width * 0.25, y: canvasBbox.y + canvasBbox.height * 0.25 },
      { x: canvasBbox.x + canvasBbox.width * 0.5,  y: canvasBbox.y + canvasBbox.height * 0.5 },
      { x: canvasBbox.x + canvasBbox.width * 0.75, y: canvasBbox.y + canvasBbox.height * 0.75 },
    ];

    const landscapeColors: Array<{ r: number; g: number; b: number }> = [];

    for (const point of samplePoints) {
      const color = await page.evaluate(
        ({ x, y }) => {
          const canvas = document.querySelector('canvas') as HTMLCanvasElement;
          if (!canvas) return null;

          const ctx = canvas.getContext('2d');
          if (!ctx) return null;

          // Convert page coordinates to canvas coordinates
          const rect = canvas.getBoundingClientRect();
          const canvasX = (x - rect.left) * (canvas.width / rect.width);
          const canvasY = (y - rect.top) * (canvas.height / rect.height);

          const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
          return { r: pixel[0], g: pixel[1], b: pixel[2] };
        },
        point
      );

      if (color) {
        landscapeColors.push(color);
        console.log(`  Color at (${point.x.toFixed(0)}, ${point.y.toFixed(0)}):`, color);
      }
    }

    // Verify we have varied colors (not all the same)
    expect(landscapeColors.length).toBe(3);

    const allSameColor = landscapeColors.every(
      color => color.r === landscapeColors[0].r &&
               color.g === landscapeColors[0].g &&
               color.b === landscapeColors[0].b
    );

    expect(allSameColor).toBe(false); // Should have DIFFERENT colors due to elevation gradient
    console.log('✅ Landscape mode shows varied colors (elevation gradient)');

    // Step 3: Switch to "none" mode and verify gray
    console.log('📍 Step 3: Switching to "none" mode...');

    const textureDropdown = page.locator('select#texture-mode');
    await textureDropdown.selectOption('none');
    await page.waitForTimeout(500);

    // Sample a pixel and verify it's gray
    const noneColor = await page.evaluate(
      ({ x, y }) => {
        const canvas = document.querySelector('canvas[data-engine^="three.js"]') as HTMLCanvasElement;
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const rect = canvas.getBoundingClientRect();
        const canvasX = (x - rect.left) * (canvas.width / rect.width);
        const canvasY = (y - rect.top) * (canvas.height / rect.height);

        const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
        return { r: pixel[0], g: pixel[1], b: pixel[2] };
      },
      samplePoints[1] // Sample center point
    );

    if (noneColor) {
      console.log(`  Color in "none" mode:`, noneColor);

      // Verify it's grayish (all channels similar)
      const colorDifference = Math.max(
        Math.abs(noneColor.r - noneColor.g),
        Math.abs(noneColor.g - noneColor.b),
        Math.abs(noneColor.r - noneColor.b)
      );

      expect(colorDifference).toBeLessThan(50); // Should be gray (channels similar)
      console.log('✅ "None" mode shows gray color');
    }

    // Step 4: Switch BACK to landscape and verify gradient is restored
    console.log('📍 Step 4: Switching BACK to landscape mode...');

    await textureDropdown.selectOption('landscape');
    await page.waitForTimeout(500);

    // Sample pixels again
    const restoredColors: Array<{ r: number; g: number; b: number }> = [];

    for (const point of samplePoints) {
      const color = await page.evaluate(
        ({ x, y }) => {
          const canvas = document.querySelector('canvas[data-engine^="three.js"]') as HTMLCanvasElement;
          const canvasX = (x - rect.left) * (canvas.width / rect.width);
          const canvasY = (y - rect.top) * (canvas.height / rect.height);

          const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
          return { r: pixel[0], g: pixel[1], b: pixel[2] };
        },
        point
      );

      if (color) {
        restoredColors.push(color);
        console.log(`  Restored color at (${point.x.toFixed(0)}, ${point.y.toFixed(0)}):`, color);
      }
    }

    // CRITICAL: Verify colors are VARIED again (not single flat color)
    expect(restoredColors.length).toBe(3);

    const allSameAfterRestore = restoredColors.every(
      color => color.r === restoredColors[0].r &&
               color.g === restoredColors[0].g &&
               color.b === restoredColors[0].b
    );

    if (allSameAfterRestore) {
      console.error('❌ BUG DETECTED: All colors are the same after switching back to landscape!');
      console.error('   This means the elevation gradient is NOT being applied.');
      console.error('   Expected varied colors but got:', restoredColors);
    }

    expect(allSameAfterRestore).toBe(false); // Should have DIFFERENT colors due to elevation gradient
    console.log('✅ Landscape mode RESTORED - elevation gradient is working correctly!');

    // Optional: Compare with original colors (should be similar)
    const colorSimilarity = landscapeColors.every((origColor, idx) => {
      const restoredColor = restoredColors[idx];
      const rDiff = Math.abs(origColor.r - restoredColor.r);
      const gDiff = Math.abs(origColor.g - restoredColor.g);
      const bDiff = Math.abs(origColor.b - restoredColor.b);

      // Allow some tolerance for lighting/rendering variations
      return rDiff < 10 && gDiff < 10 && bDiff < 10;
    });

    console.log('Color similarity check:', colorSimilarity ? '✅ Similar to original' : '⚠️ Different from original');
  });
});
