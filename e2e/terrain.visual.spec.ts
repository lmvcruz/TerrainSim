import { test, expect } from '@playwright/test'

/**
 * Visual regression tests for TerrainSim
 *
 * These tests capture screenshots and compare them against baseline images
 * to detect unintended visual changes.
 */

test.describe('TerrainSim Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for the app to be fully loaded
    await page.waitForLoadState('networkidle')

    // Wait for the canvas to be present
    await page.waitForSelector('canvas')

    // Wait a bit for initial render
    await page.waitForTimeout(1000)
  })

  test('initial terrain render', async ({ page }) => {
    // Wait for terrain to render
    await page.waitForTimeout(3000)

    // Take screenshot of the full page
    await expect(page).toHaveScreenshot('initial-terrain.png', {
      // Allow small differences (anti-aliasing, WebGL rendering)
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('terrain with scale slider', async ({ page }) => {
    // Find scale/frequency slider
    const slider = page.locator('input[type="range"]').first()

    // Use evaluate to set value (works better for range inputs)
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = '0.05'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Wait for terrain to regenerate
    await page.waitForTimeout(3000)

    // Take screenshot
    await expect(page).toHaveScreenshot('terrain-with-slider.png', {
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('full page visual', async ({ page }) => {
    // Simple visual test - just take screenshot of full page
    await page.waitForTimeout(3000)

    // Take screenshot
    await expect(page).toHaveScreenshot('full-page.png', {
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('canvas renders correctly', async ({ page }) => {
    // Screenshot just the Three.js canvas area (not the timeline canvas)
    const canvas = page.locator('canvas[data-engine^="three.js"]')
    await expect(canvas).toBeVisible()

    await page.waitForTimeout(3000)

    await expect(canvas).toHaveScreenshot('canvas-only.png', {
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.05,
    })
  })
})

test.describe('TerrainSim Interactions', () => {
  test('page layout stable', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('canvas')
    await page.waitForTimeout(3000)

    // Take a stable screenshot to verify layout
    await expect(page).toHaveScreenshot('page-layout.png', {
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.05,
    })
  })
})
