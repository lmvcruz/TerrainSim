import { test, expect } from '@playwright/test'

/**
 * Simplified visual regression test - proof of concept
 *
 * This demonstrates that Playwright can capture screenshots for visual regression testing.
 * WebGL rendering can be flaky, so we use generous tolerances.
 */

test.describe('Visual Regression - Proof of Concept', () => {
  test('can capture app screenshot', async ({ page }) => {
    // Navigate and wait for app to load
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Wait for canvas (basic rendering check)
    const canvas = page.locator('canvas')
    await canvas.waitFor({ state: 'visible', timeout: 15000 })

    // Extra wait for WebGL rendering
    await page.waitForTimeout(2000)

    // Take a screenshot - this will create a baseline on first run
    await expect(page).toHaveScreenshot('app-loaded.png', {
      // Very generous tolerances for WebGL/Three.js rendering
      maxDiffPixels: 1000,
      maxDiffPixelRatio: 0.1,
      // Increase timeout for slow rendering
      timeout: 15000,
    })
  })
})
