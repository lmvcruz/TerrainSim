# Visual Regression Testing with Playwright

This document describes how to use Playwright for E2E and visual regression testing in TerrainSim.

## Overview

Visual regression testing helps detect unintended UI changes by comparing screenshots against baseline images. This is particularly valuable for 3D applications like TerrainSim where visual output is the primary deliverable.

### Why Visual Regression Testing?

- **Catch visual bugs**: Detect unintended changes to terrain rendering
- **Verify 3D rendering**: Ensure WebGL/Three.js renders consistently
- **UI consistency**: Detect layout shifts and styling issues
- **Automated verification**: No manual visual inspection needed
- **CI integration**: Fails builds when visual regressions detected

## Setup

Playwright and browsers are already installed. If you need to reinstall:

```bash
# Install Playwright
pnpm add -D @playwright/test playwright

# Install browsers
pnpm exec playwright install chromium
```

## Running Tests

### Run all E2E tests

```bash
pnpm test:e2e
```

### Run only visual regression tests

```bash
pnpm test:visual
```

### Run tests in UI mode (interactive)

```bash
pnpm test:e2e:ui
```

### Run tests in headed mode (see browser)

```bash
pnpm test:e2e:headed
```

### Run tests in debug mode

```bash
pnpm test:e2e:debug
```

## Test Structure

### E2E Tests (`e2e/terrain.spec.ts`)

Functional tests that verify the app works correctly:

```typescript
test('app loads successfully', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/)

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
})
```

### Visual Regression Tests (`e2e/visual-poc.spec.ts`)

Screenshot-based tests that detect visual changes:

```typescript
test('can capture app screenshot', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  const canvas = page.locator('canvas')
  await canvas.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(2000)

  // This will fail if the screenshot differs from the baseline
  await expect(page).toHaveScreenshot('app-loaded.png', {
    maxDiffPixels: 1000,
    maxDiffPixelRatio: 0.1,
    timeout: 15000,
  })
})
```

## Creating Baseline Screenshots

On the first run, visual tests will fail because no baseline exists. Generate baselines:

```bash
pnpm test:visual:update
```

This creates screenshots in `e2e/*/snapshots/` directories. **Commit these files** to version control.

## Visual Diff Tolerances

WebGL/Three.js rendering can vary slightly between runs due to:
- Anti-aliasing differences
- Floating-point precision
- GPU driver variations
- Timing differences in animations

Use generous tolerances for 3D rendering:

```typescript
await expect(page).toHaveScreenshot('my-test.png', {
  maxDiffPixels: 1000,          // Allow 1000 pixels to differ
  maxDiffPixelRatio: 0.1,       // Allow 10% of pixels to differ
  timeout: 15000,               // 15 second timeout for rendering
})
```

## Writing Visual Tests

### Basic Pattern

```typescript
import { test, expect } from '@playwright/test'

test.describe('My Feature', () => {
  test('visual appearance', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/')

    // 2. Wait for rendering
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 3. Take screenshot
    await expect(page).toHaveScreenshot('feature-name.png', {
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.05,
    })
  })
})
```

### Testing Interactions

```typescript
test('terrain after parameter change', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Change a slider value
  const slider = page.locator('input[type="range"]').first()
  await slider.evaluate((el: HTMLInputElement) => {
    el.value = '0.1'
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })

  // Wait for re-render
  await page.waitForTimeout(3000)

  // Verify visual output changed
  await expect(page).toHaveScreenshot('terrain-modified.png', {
    maxDiffPixels: 500,
  })
})
```

### Screenshot Specific Elements

```typescript
test('canvas only', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas')

  // Screenshot just the canvas
  await expect(canvas).toHaveScreenshot('canvas.png', {
    maxDiffPixels: 500,
  })
})
```

## CI Integration

Visual tests run automatically in the CI pipeline:

```bash
python scripts/run-ci-locally.py
```

Step 2 of the CI pipeline runs E2E and visual regression tests.

### Handling CI Failures

When visual tests fail in CI:

1. **Download the diff images** from the test report
2. **Review the differences** to determine if they're expected or bugs
3. If expected (intentional UI changes):
   ```bash
   pnpm test:visual:update
   git add e2e/**/*-snapshots/
   git commit -m "Update visual regression baselines"
   ```
4. If bugs: fix the code and rerun tests

## Best Practices

### 1. Use Stable Waiting

Wait for rendering to complete before taking screenshots:

```typescript
// Wait for network requests
await page.waitForLoadState('networkidle')

// Wait for specific elements
await page.waitForSelector('canvas')

// Wait for animations (if needed)
await page.waitForTimeout(2000)
```

### 2. Use Generous Tolerances for 3D

WebGL rendering is non-deterministic. Use higher tolerances:

```typescript
// Good for 3D content
maxDiffPixels: 1000,
maxDiffPixelRatio: 0.1,

// Good for UI elements
maxDiffPixels: 50,
maxDiffPixelRatio: 0.01,
```

### 3. Test at Multiple Viewports

```typescript
test.use({ viewport: { width: 1920, height: 1080 } })

test('desktop view', async ({ page }) => {
  // Test at 1920x1080
})
```

### 4. Mask Dynamic Content

If you have timestamps or random data:

```typescript
await expect(page).toHaveScreenshot('test.png', {
  mask: [page.locator('.timestamp')],
})
```

### 5. Keep Tests Fast

- Minimize wait times
- Only test critical visual paths
- Use `networkidle` instead of arbitrary timeouts when possible

## Troubleshooting

### Tests timeout

Increase timeout in `playwright.config.ts`:

```typescript
timeout: 60 * 1000, // 60 seconds
```

### Screenshots always differ

- Check if animations are running
- Increase `maxDiffPixels` tolerance
- Use `page.waitForTimeout()` to ensure rendering completes
- Disable CSS animations in test setup

### Can't find baseline

Run with `--update-snapshots`:

```bash
pnpm test:visual:update
```

### Tests pass locally but fail in CI

- Different OS/platform generates different screenshots
- Ensure CI uses same OS as development
- Check if fonts are missing in CI environment
- Increase diff tolerances

## Configuration

Visual test configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,

  expect: {
    toHaveScreenshot: {
      timeout: 10000,
    },
  },

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Auto-start servers
  webServer: [
    {
      command: 'pnpm --filter @terrain-sim/api run dev',
      url: 'http://localhost:3001/health',
    },
    {
      command: 'pnpm --filter @terrain/web run dev',
      url: 'http://localhost:5173',
    },
  ],
})
```

## Viewing Test Reports

After a test run, view the HTML report:

```bash
pnpm exec playwright show-report
```

This shows:
- Pass/fail status
- Screenshot diffs (if any)
- Videos of test execution
- Console logs

## Example: Full Test Suite

```typescript
import { test, expect } from '@playwright/test'

test.describe('TerrainSim Visual Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('canvas', { state: 'visible' })
    await page.waitForTimeout(2000)
  })

  test('initial load', async ({ page }) => {
    await expect(page).toHaveScreenshot('initial.png', {
      maxDiffPixels: 1000,
      maxDiffPixelRatio: 0.1,
    })
  })

  test('after scale change', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first()
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = '0.2'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(3000)

    await expect(page).toHaveScreenshot('scale-changed.png', {
      maxDiffPixels: 1000,
    })
  })

  test('canvas only', async ({ page }) => {
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveScreenshot('canvas.png', {
      maxDiffPixels: 500,
    })
  })
})
```

## Next Steps

1. **Add more visual tests** for different UI states
2. **Test mobile viewports** with different screen sizes
3. **Test browser variations** (Firefox, Safari)
4. **Add accessibility tests** using Playwright's accessibility features
5. **Performance testing** with Playwright's performance APIs

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Visual Comparisons Guide](https://playwright.dev/docs/test-snapshots)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI Integration](https://playwright.dev/docs/ci)
