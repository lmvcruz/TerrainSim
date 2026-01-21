import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

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
 * 2. Screenshot landscape mode - verify pixel variance
 * 3. Switch to "none" mode - verify uniform gray
 * 4. Switch back to "landscape" - verify pixel variance restored
 */

// Helper function to analyze pixel variance in screenshot
function analyzePixelVariance(imageBuffer: Buffer): { variance: number; hasGradient: boolean } {
  const png = PNG.sync.read(imageBuffer);
  const { width, height, data } = png;

  // Sample pixels from different regions
  const sampleCount = 100;
  const colors: Array<{ r: number; g: number; b: number }> = [];

  for (let i = 0; i < sampleCount; i++) {
    const x = Math.floor((width / sampleCount) * i);
    const y = Math.floor(height / 2); // Sample from middle row

    const idx = (y * width + x) * 4;
    colors.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    });
  }

  // Calculate variance in color values
  const rValues = colors.map(c => c.r);
  const gValues = colors.map(c => c.g);
  const bValues = colors.map(c => c.b);

  const rVariance = calculateVariance(rValues);
  const gVariance = calculateVariance(gValues);
  const bVariance = calculateVariance(bValues);

  const totalVariance = rVariance + gVariance + bVariance;

  // If variance is high, we have a gradient
  // If variance is low, we have a flat color
  const hasGradient = totalVariance > 100; // Threshold for detecting gradient

  return { variance: totalVariance, hasGradient };
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

test.describe('Terrain Texture Mode - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Capture browser console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('uniform') || text.includes('Material') || text.includes('texture') || text.includes('TerrainMesh')) {
        console.log(`[BROWSER] ${text}`);
      }
    });

    // Navigate to the application
    await page.goto('/');

    // Wait for the terrain viewer to be visible
    await page.waitForSelector('canvas[data-engine^="three.js"]', { timeout: 10000 });

    // Give Three.js time to initialize
    await page.waitForTimeout(1000);
  });

  test('should maintain elevation gradient after switching texture modes', async ({ page }) => {
    // Step 1: Generate terrain with known seed
    console.log('📍 Step 1: Generating terrain...');

    // Set valid dimensions (Width and Height must be between 1 and 2048)
    // Use getByLabel for accessible inputs
    const widthInput = page.getByLabel('Width');
    const heightInput = page.getByLabel('Height');
    await widthInput.fill('512');
    await heightInput.fill('512');

    // Look for the seed input field and set a known seed for reproducibility
    const seedInput = page.getByLabel('Seed');
    await seedInput.fill('12345');

    // Click "Generate Terrain" button
    const generateButton = page.getByRole('button', { name: /generate terrain/i });
    await generateButton.click();

    // Wait for terrain generation to complete
    await page.waitForTimeout(2000);

    // Step 2: Screenshot and analyze landscape mode
    console.log('📍 Step 2: Analyzing landscape mode colors...');

    const canvas = page.locator('canvas[data-engine^="three.js"]');
    await canvas.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000); // Let canvas render
    const landscapeScreenshot = await canvas.screenshot({ timeout: 10000 });

    const landscapeAnalysis = analyzePixelVariance(landscapeScreenshot);
    console.log(`  Landscape variance: ${landscapeAnalysis.variance.toFixed(2)}`);
    console.log(`  Has gradient: ${landscapeAnalysis.hasGradient}`);

    expect(landscapeAnalysis.hasGradient).toBe(true);
    console.log('✅ Landscape mode shows color gradient');

    // Step 3: Switch to "none" mode
    console.log('📍 Step 3: Switching to "none" mode...');

    // Wait for the dropdown to be available and visible
    const textureDropdown = page.locator('select#texture-mode');
    await textureDropdown.waitFor({ state: 'visible', timeout: 10000 });

    await textureDropdown.selectOption('none');
    await page.waitForTimeout(1500); // Wait for shader to update

    const noneScreenshot = await canvas.screenshot();
    const noneAnalysis = analyzePixelVariance(noneScreenshot);
    console.log(`  None mode variance: ${noneAnalysis.variance.toFixed(2)}`);
    console.log(`  Has gradient: ${noneAnalysis.hasGradient}`);

    // "None" mode now uses normal-based lighting, which creates shadows/highlights
    // This produces moderate variance (~5000) instead of flat color (<100)
    // We verify it's still significantly less than landscape gradient variance
    const isNoneModeVariance = noneAnalysis.variance > 1000 && noneAnalysis.variance < 10000;
    expect(isNoneModeVariance).toBe(true);
    console.log('✅ "None" mode shows gray with normal-based lighting');

    // Step 4: Switch BACK to landscape and verify gradient is restored
    console.log('📍 Step 4: Switching BACK to landscape mode...');

    await textureDropdown.selectOption('landscape');
    await page.waitForTimeout(1500); // Wait for shader to update

    const restoredScreenshot = await canvas.screenshot();
    const restoredAnalysis = analyzePixelVariance(restoredScreenshot);
    console.log(`  Restored variance: ${restoredAnalysis.variance.toFixed(2)}`);
    console.log(`  Has gradient: ${restoredAnalysis.hasGradient}`);

    // CRITICAL: This is where the bug would be caught
    if (!restoredAnalysis.hasGradient) {
      console.error('❌ BUG DETECTED: Gradient not restored after switching back to landscape!');
      console.error('   Expected high variance but got:', restoredAnalysis.variance);
      console.error('   This means the terrain is rendering as a SINGLE FLAT COLOR.');
    }

    expect(restoredAnalysis.hasGradient).toBe(true);
    console.log('✅ Landscape mode RESTORED - elevation gradient is working!');

    // Verify variance is similar to original (within reasonable threshold)
    const varianceDifference = Math.abs(landscapeAnalysis.variance - restoredAnalysis.variance);
    const varianceRatio = varianceDifference / landscapeAnalysis.variance;

    console.log(`  Variance difference: ${varianceDifference.toFixed(2)} (${(varianceRatio * 100).toFixed(1)}%)`);

    // Allow up to 50% variance difference due to camera angle/lighting changes
    // (After switching modes, camera angles and lighting can create significant variance)
    expect(varianceRatio).toBeLessThan(0.5);
  });
});
