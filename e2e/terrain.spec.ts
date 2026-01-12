import { test, expect } from '@playwright/test'

/**
 * End-to-end functionality tests for TerrainSim
 */

test.describe('TerrainSim E2E', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check page loads (title may vary)
    await expect(page).toHaveTitle(/.+/)

    // Verify canvas is present
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // Canvas should have dimensions
    const bbox = await canvas.boundingBox()
    expect(bbox).not.toBeNull()
    expect(bbox!.width).toBeGreaterThan(0)
    expect(bbox!.height).toBeGreaterThan(0)
  })

  test('API connection works', async ({ page }) => {
    // Listen for API calls
    const apiPromise = page.waitForResponse(
      response => response.url().includes('/generate') && response.status() === 200,
      { timeout: 10000 }
    )

    await page.goto('/')

    // Wait for API call to complete
    const apiResponse = await apiPromise
    expect(apiResponse.ok()).toBeTruthy()

    // Verify response has terrain data
    const data = await apiResponse.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBeTruthy()
    expect(data.data.length).toBeGreaterThan(0)
  })

  test('console has no errors', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Should have no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('no JavaScript errors thrown', async ({ page }) => {
    const pageErrors: Error[] = []

    page.on('pageerror', error => {
      pageErrors.push(error)
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Should have no page errors
    expect(pageErrors).toHaveLength(0)
  })
})
