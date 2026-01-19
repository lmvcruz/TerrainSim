# Testing Guide

**Created:** 2026-01-19
**Purpose:** Comprehensive guide to running and writing tests in TerrainSim
**Audience:** Contributors, developers, QA engineers

---

## Table of Contents

1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing Tests](#writing-tests)
5. [Mocking Strategies](#mocking-strategies)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Overview

TerrainSim uses a multi-layered testing strategy covering all components from C++ core to frontend UI.

### Test Types

| Type | Framework | Location | Purpose | Coverage |
|------|-----------|----------|---------|----------|
| **C++ Unit** | GoogleTest | `libs/core/tests/` | Core algorithms | 90/90 tests |
| **C++ Benchmark** | Google Benchmark | `libs/core/benchmarks/` | Performance | 3 suites |
| **Backend Integration** | Jest | `apps/simulation-api/src/tests/` | API endpoints | 90+ tests |
| **Frontend Unit** | Vitest | `apps/web/src/**/*.test.tsx` | Components/functions | 86.95% |
| **E2E** | Playwright | `apps/web/e2e/` | User workflows | Visual regression |
| **Load** | k6 | `tests/load/` | Performance/stress | 3 scenarios |

### Testing Philosophy

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Write tests first for bugs** - Reproduce before fixing
3. **Keep tests fast** - Unit tests should run in milliseconds
4. **Isolate dependencies** - Use mocks to test components in isolation
5. **Test error paths** - Verify failure handling, not just happy paths

---

## Running Tests

### Quick Start

```bash
# Run all tests across the monorepo
pnpm test

# Run specific workspace tests
cd apps/web && pnpm test          # Frontend tests
cd apps/simulation-api && pnpm test  # Backend tests
```

### Frontend Tests (Vitest)

```bash
cd apps/web

# Run all tests
pnpm test

# Watch mode (re-run on file changes)
pnpm test:watch

# Run specific test file
pnpm test src/components/pipeline/JobManager.test.tsx

# Run tests matching pattern
pnpm test JobManager

# Coverage report
pnpm test:coverage

# UI mode (interactive test runner)
pnpm test:ui
```

**Coverage Report Location:** `apps/web/coverage/index.html`

### Backend Tests (Jest)

```bash
cd apps/simulation-api

# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Run specific test suite
pnpm test jobSystem
pnpm test errorPaths

# Run with coverage
pnpm test --coverage

# Verbose output
pnpm test --verbose
```

**Note:** Backend integration tests require the API server to be running on `localhost:3001`:

```bash
# Terminal 1: Start API
pnpm run dev

# Terminal 2: Run tests
pnpm test
```

### C++ Tests (GoogleTest)

```bash
cd libs/core

# Build and run tests
mkdir -p build && cd build
cmake ..
cmake --build .
ctest --output-on-failure

# Run specific test
./bin/terrain_tests --gtest_filter=HeightmapTest.*

# Verbose output
./bin/terrain_tests --gtest_verbose
```

### C++ Benchmarks (Google Benchmark)

```bash
cd libs/core/build

# Run all benchmarks
./bin/terrain_benchmarks

# Run specific benchmark
./bin/terrain_benchmarks --benchmark_filter=Heightmap

# JSON output for comparison
./bin/terrain_benchmarks --benchmark_out=results.json --benchmark_out_format=json

# Compare with baseline
python ../../../scripts/compare-benchmarks.py results.json
```

**CI Execution:** Benchmarks run via GitHub Actions (manual trigger only):
- Go to Actions → **Benchmarks** → Run workflow

### E2E Tests (Playwright)

```bash
cd apps/web

# Run E2E tests
pnpm test:e2e

# Run with UI (interactive)
pnpm test:e2e:ui

# Run specific test
pnpm test:e2e tests/terrain.spec.ts

# Debug mode
pnpm test:e2e --debug

# Update visual snapshots
pnpm test:e2e --update-snapshots
```

**Prerequisites:**
- Frontend dev server running on `localhost:5173`
- Backend API running on `localhost:3001`

### Load Tests (k6)

```bash
# Install k6 first
choco install k6  # Windows
brew install k6   # macOS

# Run CI scenario (~3 minutes)
k6 run tests/load/ci-scenario.js

# Run against local API
k6 run tests/load/ci-scenario.js -e API_URL=http://localhost:3001

# Stress test (~10 minutes, 50 users)
k6 run tests/load/stress-test.js

# Spike test (~5 minutes)
k6 run tests/load/spike-test.js

# Export results
k6 run tests/load/ci-scenario.js --out json=results.json
```

**CI Execution:** Load tests run via GitHub Actions (manual trigger):
- Go to Actions → **Load Testing** → Run workflow
- See [Load Test Quick Start](../../LOAD-TEST-QUICKSTART.md)

---

## Test Structure

### Frontend Test Structure (Vitest)

```
apps/web/src/
├── components/
│   ├── pipeline/
│   │   ├── JobManager.tsx
│   │   └── JobManager.test.tsx        # Component tests
│   └── terrain/
│       ├── TerrainViewer.tsx
│       └── TerrainViewer.test.tsx
├── hooks/
│   ├── useWebSocket.ts
│   └── useWebSocket.test.ts           # Hook tests
└── utils/
    ├── validation.ts
    └── validation.test.ts             # Utility tests
```

**Naming Convention:**
- Test files: `*.test.ts` or `*.test.tsx`
- Located alongside source files (co-location)

### Backend Test Structure (Jest)

```
apps/simulation-api/src/tests/
├── jobSystem.test.ts          # Job system integration tests
├── errorPaths.test.ts         # Error handling tests
└── websocket.test.ts          # WebSocket tests (if added)
```

**Naming Convention:**
- Test files: `*.test.ts`
- Grouped by feature/endpoint in `src/tests/`

### C++ Test Structure (GoogleTest)

```
libs/core/tests/
├── heightmap_test.cpp         # Heightmap class tests
├── perlin_test.cpp            # Perlin noise tests
├── erosion_test.cpp           # Erosion algorithm tests
└── job_system_test.cpp        # Job system tests
```

**Naming Convention:**
- Test files: `*_test.cpp`
- Test suites: Match class/feature name + `Test` suffix

### E2E Test Structure (Playwright)

```
apps/web/e2e/
├── terrain.spec.ts            # Terrain generation workflows
├── pipeline.spec.ts           # Job pipeline workflows
└── visual-regression.spec.ts  # Visual comparison tests
```

**Naming Convention:**
- Test files: `*.spec.ts`
- Grouped by user workflow

---

## Writing Tests

### Frontend Component Tests (Vitest + React Testing Library)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JobManager } from './JobManager';

describe('JobManager', () => {
  // Setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render job list', () => {
    render(<JobManager jobs={mockJobs} />);

    expect(screen.getByText('Job Manager')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('should handle job selection', async () => {
    const onSelect = vi.fn();
    render(<JobManager jobs={mockJobs} onSelectJob={onSelect} />);

    fireEvent.click(screen.getByText('Job 1'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('job-1');
    });
  });

  it('should show error state', () => {
    render(<JobManager jobs={[]} error="Failed to load" />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
```

**Key Patterns:**
- Use `describe` to group related tests
- Use `it` or `test` for individual test cases
- Use `screen` queries (not container queries)
- Use `waitFor` for async updates
- Mock external dependencies with `vi.fn()`

### Backend Integration Tests (Jest + Fetch)

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Job System API', () => {
  const API_URL = 'http://localhost:3001';

  beforeAll(async () => {
    // Wait for API to be ready
    await waitForAPI(API_URL);
  });

  it('should create simulation session', async () => {
    const response = await fetch(`${API_URL}/simulate/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terrain: { width: 256, height: 256, heightmap: [...] },
        config: { jobs: [...] }
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessionId).toBeDefined();
  });

  it('should return 400 for invalid config', async () => {
    const response = await fetch(`${API_URL}/simulate/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terrain: null })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('terrain');
  });
});
```

**Key Patterns:**
- Use `beforeAll` for API availability check
- Test both success and error cases
- Use actual HTTP requests (no mocking for integration tests)
- Verify status codes and response structure

### C++ Unit Tests (GoogleTest)

```cpp
#include <gtest/gtest.h>
#include "terrain/Heightmap.hpp"

namespace terrain {

class HeightmapTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup before each test
        heightmap = std::make_unique<Heightmap>(256, 256);
    }

    std::unique_ptr<Heightmap> heightmap;
};

TEST_F(HeightmapTest, InitializesWithZeros) {
    for (int y = 0; y < 256; ++y) {
        for (int x = 0; x < 256; ++x) {
            EXPECT_FLOAT_EQ(heightmap->get(x, y), 0.0f);
        }
    }
}

TEST_F(HeightmapTest, SetAndGetValue) {
    heightmap->set(10, 20, 0.5f);
    EXPECT_FLOAT_EQ(heightmap->get(10, 20), 0.5f);
}

TEST_F(HeightmapTest, ClampsOutOfBounds) {
    heightmap->set(-1, -1, 1.0f);  // Should not crash
    heightmap->set(1000, 1000, 1.0f);  // Should not crash
}

} // namespace terrain
```

**Key Patterns:**
- Use test fixtures (`TEST_F`) for shared setup
- Use `EXPECT_*` for assertions that continue on failure
- Use `ASSERT_*` for critical assertions that stop test on failure
- Test edge cases and boundary conditions

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Terrain Generation', () => {
  test('should generate terrain with default settings', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Fill in parameters
    await page.fill('[data-testid="size-input"]', '256');
    await page.selectOption('[data-testid="noise-type"]', 'perlin');

    // Generate terrain
    await page.click('button:has-text("Generate")');

    // Wait for terrain to render
    await expect(page.locator('canvas')).toBeVisible();

    // Verify stats
    const stats = await page.locator('[data-testid="stats"]').textContent();
    expect(stats).toContain('256x256');
  });

  test('should match visual snapshot', async ({ page }) => {
    await page.goto('http://localhost:5173/terrain');

    // Wait for terrain to load
    await page.waitForLoadState('networkidle');

    // Compare screenshot
    await expect(page).toHaveScreenshot('terrain-default.png');
  });
});
```

**Key Patterns:**
- Use `data-testid` attributes for stable selectors
- Wait for network idle or specific elements
- Use visual regression for UI consistency
- Test complete user workflows, not individual actions

---

## Mocking Strategies

### Frontend Mocks (Vitest)

#### Mock Functions
```typescript
import { vi } from 'vitest';

// Create mock function
const mockCallback = vi.fn();

// Test usage
fireEvent.click(button);
expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledWith({ id: 1 });
```

#### Mock Modules
```typescript
// Mock entire module
vi.mock('../api/client', () => ({
  fetchJobs: vi.fn(() => Promise.resolve([mockJob1, mockJob2])),
  createJob: vi.fn(() => Promise.resolve({ id: 'new-job' }))
}));
```

#### Mock Custom Hooks
```typescript
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    connected: true,
    send: vi.fn(),
    lastMessage: mockMessage
  })
}));
```

#### Mock Browser APIs
```typescript
// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock as any;

// Mock WebSocket
global.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn()
})) as any;
```

### Backend Mocks (Jest)

#### Mock C++ Bindings
```typescript
vi.mock('../../build/Release/erosion-binding.node', () => ({
  simulateHydraulicErosion: vi.fn(() => ({
    heightmap: mockHeightmap,
    statistics: { duration: 100 }
  }))
}));
```

#### Mock File System
```typescript
import fs from 'fs/promises';
vi.mock('fs/promises');

// In test
vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));
```

### C++ Mocks (GoogleTest)

```cpp
#include <gmock/gmock.h>

// Mock interface
class MockErosionSimulator {
public:
    MOCK_METHOD(void, erode, (Heightmap&, int), ());
    MOCK_METHOD(float, getSediment, (), (const));
};

// Usage in test
TEST(ErosionTest, CallsErodeMethod) {
    MockErosionSimulator mock;
    EXPECT_CALL(mock, erode(::testing::_, 1000))
        .Times(1);

    processErosion(mock, heightmap, 1000);
}
```

---

## Common Patterns

### Testing Async Operations

```typescript
it('should load jobs asynchronously', async () => {
  render(<JobList />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Verify data loaded
  expect(screen.getByText('Job 1')).toBeInTheDocument();
});
```

### Testing Error Boundaries

```typescript
it('should catch rendering errors', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const ThrowError = () => { throw new Error('Test error'); };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  spy.mockRestore();
});
```

### Testing Form Submissions

```typescript
it('should submit form with valid data', async () => {
  const onSubmit = vi.fn();
  render(<JobForm onSubmit={onSubmit} />);

  // Fill form
  await userEvent.type(screen.getByLabelText('Job Name'), 'Test Job');
  await userEvent.selectOptions(screen.getByLabelText('Type'), 'erosion');

  // Submit
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));

  // Verify
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Test Job',
      type: 'erosion'
    });
  });
});
```

### Testing WebSocket Connections

```typescript
it('should handle WebSocket messages', async () => {
  const { result } = renderHook(() => useWebSocket('ws://localhost:3001'));

  // Simulate connection
  await waitFor(() => expect(result.current.connected).toBe(true));

  // Simulate message
  const mockMessage = { type: 'update', data: { progress: 0.5 } };
  act(() => {
    result.current.lastMessage = mockMessage;
  });

  expect(result.current.lastMessage).toEqual(mockMessage);
});
```

### Testing Canvas Rendering

```typescript
it('should render to canvas', () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  renderTerrain(ctx, heightmap);

  // Verify canvas was drawn to
  const imageData = ctx!.getImageData(0, 0, 256, 256);
  expect(imageData.data.some(v => v > 0)).toBe(true);
});
```

### Parameterized Tests (C++)

```cpp
class ErosionParameterTest : public ::testing::TestWithParam<float> {};

TEST_P(ErosionParameterTest, HandlesVariousErosionRates) {
    float erosionRate = GetParam();
    HydraulicErosion erosion(256, 256, erosionRate);

    // Test with parameter
    Heightmap heightmap(256, 256);
    erosion.erode(heightmap, 1000);

    EXPECT_GE(heightmap.getMax(), 0.0f);
}

INSTANTIATE_TEST_SUITE_P(
    ErosionRates,
    ErosionParameterTest,
    ::testing::Values(0.1f, 0.3f, 0.5f, 0.8f)
);
```

---

## Troubleshooting

### Common Issues

#### "Cannot find module" errors

**Problem:** Test can't resolve imports

**Solution:**
```typescript
// Add to vitest.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

#### "API not responding" in integration tests

**Problem:** Backend API not running

**Solution:**
```bash
# Start API before running tests
cd apps/simulation-api
pnpm run dev

# In another terminal
pnpm test
```

#### Tests timeout

**Problem:** Async operations take too long

**Solution:**
```typescript
// Increase timeout for specific test
it('should complete long operation', async () => {
  // Test code
}, 10000); // 10 second timeout

// Or configure globally in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000
  }
});
```

#### Mock not working

**Problem:** Module mock not applied

**Solution:**
```typescript
// Ensure mock is hoisted before imports
vi.mock('../api/client');

// Not:
import { fetchJobs } from '../api/client';
vi.mock('../api/client'); // Too late!
```

#### Visual regression failures

**Problem:** Screenshot doesn't match baseline

**Solution:**
```bash
# Update snapshots if changes are intentional
pnpm test:e2e --update-snapshots

# Or run in UI mode to compare visually
pnpm test:e2e:ui
```

#### C++ tests fail to compile

**Problem:** Missing dependencies or incorrect paths

**Solution:**
```bash
# Clean and rebuild
cd libs/core
rm -rf build
mkdir build && cd build
cmake ..
cmake --build .
```

### Performance Issues

#### Slow test execution

**Symptoms:** Tests take minutes to run

**Solutions:**
1. Run tests in parallel:
   ```bash
   pnpm test --reporter=verbose --pool=threads
   ```

2. Run only changed tests:
   ```bash
   pnpm test --changed
   ```

3. Skip slow E2E tests locally:
   ```bash
   pnpm test --exclude=e2e
   ```

### Debugging Tests

#### Frontend (Vitest)
```bash
# Run with debugger
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Or use VS Code debugger with launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

#### Backend (Jest)
```bash
# Run with Node debugger
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Connect Chrome DevTools to chrome://inspect
```

#### E2E (Playwright)
```bash
# Run in debug mode (headed browser with pause)
pnpm test:e2e --debug

# Or use Playwright Inspector
PWDEBUG=1 pnpm test:e2e
```

---

## Best Practices

### General

1. **Test Naming:** Use descriptive names that explain what is being tested
   - ✅ `should create job with valid parameters`
   - ❌ `test1`

2. **One Assertion Per Test:** Focus each test on a single behavior
   - Exception: Related assertions (e.g., status code + response body)

3. **AAA Pattern:** Arrange → Act → Assert
   ```typescript
   // Arrange
   const job = createMockJob();

   // Act
   const result = validateJob(job);

   // Assert
   expect(result.valid).toBe(true);
   ```

4. **Avoid Test Interdependence:** Each test should be independent
   - Don't rely on test execution order
   - Clean up after each test

5. **Use Meaningful Test Data:** Avoid magic numbers
   ```typescript
   // ✅ Good
   const STANDARD_TERRAIN_SIZE = 256;
   const heightmap = new Heightmap(STANDARD_TERRAIN_SIZE, STANDARD_TERRAIN_SIZE);

   // ❌ Bad
   const heightmap = new Heightmap(256, 256);
   ```

### Coverage Goals

- **Frontend:** > 80% line coverage
- **Backend:** > 90% line coverage
- **C++ Core:** 100% (all functionality tested)

### When to Skip Mocking

Don't mock:
- Simple utilities (e.g., `clamp`, `lerp`)
- Value objects (e.g., `Vector2D`)
- Pure functions without side effects

Do mock:
- Network requests
- File system operations
- Browser APIs (localStorage, WebSocket)
- External dependencies
- Native C++ bindings

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to `main` branch
- Every pull request

**Workflows:**
- `.github/workflows/ci.yml` - Run all tests
- `.github/workflows/benchmarks.yml` - Performance tests (manual)
- `.github/workflows/load-test.yml` - Load tests (manual)

### Pre-commit Hooks

Run tests before push:
```bash
# .husky/pre-push
#!/bin/sh
pnpm test
```

To bypass (use sparingly):
```bash
git push --no-verify
```

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [GoogleTest Primer](https://google.github.io/googletest/primer.html)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
**Maintained By:** Development Team
