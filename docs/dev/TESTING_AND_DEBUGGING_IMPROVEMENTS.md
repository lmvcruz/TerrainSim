# Testing and Debugging Improvements Plan

## Context

The recent visualization bug (terrain mesh not updating when parameters change) revealed gaps in our testing and debugging infrastructure. While the API worked correctly and React state updated properly, we lacked tools to quickly identify that the issue was in Three.js rendering.

**Key learnings:**
- ✅ Integration tests caught API correctness
- ❌ No tests could detect visual rendering issues
- ❌ Required extensive manual debugging with console logs
- ❌ Agent couldn't access browser console output
- ❌ Unclear test coverage across the codebase

## Goals

1. **Improve test coverage** - Know what's tested and what isn't
2. **Bridge the gap** between automated tests and visual rendering
3. **Enable agent debugging** - Agent should access runtime logs
4. **Prevent regressions** - Catch similar issues earlier

---

## 1. Unit Test Coverage Analysis

### Current State
- ✅ 6 component tests (NoiseParametersPanel)
- ✅ 4 integration tests (terrain-generation)
- ❌ Unknown coverage percentage
- ❌ No coverage reporting
- ❌ Key components untested: TerrainMesh, App

### Action Items

#### 1.1 Add Coverage Reporting
**Priority: High**

```bash
# Install coverage tool
pnpm add -D @vitest/coverage-v8

# Update vite.config.ts
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    exclude: ['**/*.test.ts', '**/*.test.tsx']
  }
}

# Run with coverage
pnpm test -- --coverage
```

**Success Criteria:**
- Coverage reports generated in `coverage/` folder
- CI/CD shows coverage percentage
- Target: >80% coverage for critical paths

#### 1.2 Identify Untested Critical Code
**Priority: High**

Critical areas requiring tests:
1. **TerrainMesh.tsx** - Texture creation, shader uniforms
2. **App.tsx** - State management, API integration
3. **terrainGenerators.ts** - Client-side terrain generation
4. **Heightmap.tsx** (if exists) - Heightmap utilities

**Action:**
- Generate coverage report
- Create test files for components with <50% coverage
- Focus on critical rendering logic

#### 1.3 Test Template for React Three Fiber Components
**Priority: Medium**

Challenge: JSDOM can't render WebGL

**Solution: Test state and props, mock Three.js objects**

```typescript
// Example: TerrainMesh.test.tsx
import { vi } from 'vitest'

// Mock Three.js modules
vi.mock('three', () => ({
  DataTexture: vi.fn(),
  RGBAFormat: 0,
  FloatType: 1,
}))

describe('TerrainMesh', () => {
  it('should create new texture when heightmap changes', () => {
    const { rerender } = render(<TerrainMesh heightmap={data1} />)

    // Capture initial texture creation
    expect(DataTexture).toHaveBeenCalledTimes(1)

    rerender(<TerrainMesh heightmap={data2} />)

    // Verify new texture created
    expect(DataTexture).toHaveBeenCalledTimes(2)
  })
})
```

---

## 2. Integration Test Improvements

### Current State
- ✅ Tests verify API returns different data
- ✅ Tests check parameter variations
- ❌ No tests for React → Three.js pipeline
- ❌ No visual regression detection

### Action Items

#### 2.1 React State Flow Tests
**Priority: High**

Test the complete state flow without WebGL:

```typescript
describe('Terrain Update Flow', () => {
  it('should update heightmap state when API responds', async () => {
    const { getByRole } = render(<App />)

    // Change parameter
    const slider = getByLabelText(/frequency/i)
    fireEvent.change(slider, { target: { value: '0.08' } })

    // Trigger generation
    fireEvent.click(getByRole('button', { name: /generate/i }))

    // Verify state update (using test ID or spy)
    await waitFor(() => {
      expect(mockSetHeightmap).toHaveBeenCalled()
      expect(mockSetHeightmap.mock.calls[0][0]).toBeInstanceOf(Float32Array)
    })
  })
})
```

#### 2.2 Visual Regression Testing (Future)
**Priority: Low (requires infrastructure)**

Consider visual regression tools:
- **Playwright** - Can capture WebGL screenshots
- **Puppeteer** - Headless browser testing
- **Percy** - Visual diff service

**Proof of concept:**
```typescript
// e2e/terrain-visual.spec.ts
test('terrain updates visually when frequency changes', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // Capture initial state
  const before = await page.screenshot()

  // Change frequency
  await page.fill('[data-testid="frequency"]', '0.08')
  await page.click('[data-testid="generate"]')
  await page.waitForTimeout(1000)

  // Capture after state
  const after = await page.screenshot()

  // Visual diff should show change
  expect(compareImages(before, after)).toBeGreaterThan(0.05)
})
```

#### 2.3 Component Integration Tests
**Priority: Medium**

Test combinations of components:

```typescript
describe('NoiseParametersPanel + TerrainMesh Integration', () => {
  it('should pass updated parameters to terrain generation', () => {
    const onGenerate = vi.fn()

    render(
      <>
        <NoiseParametersPanel onGenerate={onGenerate} />
        <TerrainMesh heightmap={heightmap} />
      </>
    )

    // Change parameter and generate
    // Verify TerrainMesh receives new props
  })
})
```

---

## 3. Logging Infrastructure Improvements

### Current State
- ✅ Added debug logs during bug investigation
- ✅ terrainTracker.ts for generation comparison
- ❌ Logs scattered and inconsistent
- ❌ No log levels (debug/info/warn/error)
- ❌ No structured logging
- ❌ Hard to disable in production

### Action Items

#### 3.1 Centralized Logging System
**Priority: High**

Create a proper logging utility:

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private enabled = import.meta.env.DEV
  private level: LogLevel = 'info'

  debug(message: string, data?: any) {
    if (!this.enabled || this.shouldSkip('debug')) return
    console.log(
      `%c[DEBUG]`,
      'background: #6b7280; color: white; padding: 2px 6px;',
      message,
      data
    )
  }

  info(message: string, data?: any) { /* ... */ }
  warn(message: string, data?: any) { /* ... */ }
  error(message: string, data?: any) { /* ... */ }

  group(title: string, fn: () => void) {
    console.group(`%c${title}`, 'font-weight: bold;')
    fn()
    console.groupEnd()
  }
}

export const logger = new Logger()
```

**Usage:**
```typescript
// In App.tsx
logger.group('🌐 API Call', () => {
  logger.debug('Parameters', parameters)
  logger.info(`Calling ${API_URL}/generate`)
})

logger.group('📥 API Response', () => {
  logger.debug('Raw data', data)
  logger.info(`Received ${data.data.length} height values`)
})
```

#### 3.2 Structured Logging with Context
**Priority: Medium**

Add context to all logs:

```typescript
interface LogContext {
  component: string
  action: string
  timestamp: number
}

logger.withContext({ component: 'TerrainMesh' }).debug('Texture created', {
  width,
  height,
  heightmapLength: heightmap.length
})
```

#### 3.3 Performance Logging
**Priority: Medium**

Track performance metrics:

```typescript
logger.time('terrain-generation', () => {
  // Generate terrain
})
// Logs: "⏱️ terrain-generation completed in 234ms"

logger.measure('api-latency', startTime)
// Logs: "📊 api-latency: 456ms"
```

#### 3.4 Log Levels by Environment
**Priority: Low**

```typescript
// .env.development
VITE_LOG_LEVEL=debug

// .env.production
VITE_LOG_LEVEL=warn

// Remove all debug logs in production builds
```

---

## 4. Agent Browser Log Access

### Current State
- ❌ Agent cannot see browser console
- ❌ Requires user to copy/paste logs manually
- ❌ Slow debugging iteration

### Challenges
- Agent runs in VS Code (server-side)
- Browser console is client-side
- No direct connection between them

### Proposed Solutions

#### 4.1 Log Capture Service (Recommended)
**Priority: High**

Create a development endpoint that captures logs:

```typescript
// src/utils/logCollector.ts (development only)
class LogCollector {
  private logs: any[] = []
  private maxLogs = 1000

  capture(level: string, message: string, data: any) {
    this.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data,
    })

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  async send() {
    if (import.meta.env.DEV) {
      await fetch('http://localhost:3001/dev/logs', {
        method: 'POST',
        body: JSON.stringify({ logs: this.logs }),
      })
    }
  }

  getLogs() {
    return this.logs
  }
}

export const logCollector = new LogCollector()

// Attach to logger
logger.on('log', (level, message, data) => {
  logCollector.capture(level, message, data)
})
```

**API Endpoint (development only):**
```typescript
// apps/simulation-api/src/devRoutes.ts
if (process.env.NODE_ENV === 'development') {
  app.post('/dev/logs', (req, res) => {
    const { logs } = req.body

    // Write to file
    fs.appendFileSync('.dev-logs/browser.log',
      logs.map(l => JSON.stringify(l)).join('\n')
    )

    res.json({ received: logs.length })
  })

  app.get('/dev/logs', (req, res) => {
    const logs = fs.readFileSync('.dev-logs/browser.log', 'utf-8')
    res.json({ logs: logs.split('\n').map(JSON.parse) })
  })
}
```

**Agent Tool:**
```typescript
// Agent can now call
const response = await fetch('http://localhost:3001/dev/logs')
const { logs } = await response.json()

// Agent sees:
// [
//   { timestamp: 1234, level: 'debug', message: 'Texture created', ... },
//   { timestamp: 1235, level: 'info', message: 'API response received', ... },
// ]
```

#### 4.2 WebSocket Log Streaming (Advanced)
**Priority: Low**

Real-time log streaming to backend:

```typescript
// src/utils/logStream.ts
const ws = new WebSocket('ws://localhost:3001/dev/log-stream')

logger.on('log', (level, message, data) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ level, message, data }))
  }
})
```

Backend stores logs in memory, agent queries via HTTP.

#### 4.3 File-Based Log Capture
**Priority: Medium**

Simpler approach using file system:

```typescript
// Browser logs to localStorage
logger.on('log', (level, message, data) => {
  const logs = JSON.parse(localStorage.getItem('dev-logs') || '[]')
  logs.push({ level, message, data, timestamp: Date.now() })
  localStorage.setItem('dev-logs', JSON.stringify(logs.slice(-500)))
})

// VS Code extension reads Chrome user data
// Or user runs: window.downloadLogs() → downloads JSON file
```

---

## 5. Implementation Roadmap

### Phase 1: Immediate (This Week) ✅ **COMPLETE**
**Focus: Test coverage visibility**

- [x] Install @vitest/coverage-v8
- [x] Generate initial coverage report
- [x] Document coverage gaps
- [x] Write tests for App.tsx state management
- [x] Write tests for TerrainMesh prop changes (14 tests added!)

**Results achieved:**
- Coverage: 58.15% → **86.95%** 🎉
- TerrainMesh: 3.63% → **100%** ✅
- Total tests: 12 → 26 passing
- Comprehensive mocking for Three.js in JSDOM environment
- All critical rendering paths now tested

### Phase 2: Short Term (Next 2 Weeks) ✅ **COMPLETE**
**Focus: Structured logging**

- [x] Create centralized Logger class
- [x] Replace console.log with logger calls
- [x] Add log levels (debug/info/warn/error)
- [x] Add performance logging (time/measure/measure utilities)
- [x] Create log collector for development
- [x] Auto-save logs to localStorage
- [x] Provide downloadLogs() helper function

**Results achieved:**
- Centralized logging system with structured output
- Component-scoped loggers (e.g., `TerrainMesh`, `TerrainTracker`)
- Log groups for related operations
- Performance timing utilities (`logger.time()`, `logger.timeAsync()`, `logger.measure()`)
- Log collector captures all logs in development mode
- Logs auto-save to localStorage every 5 seconds
- Easy log export via `window.downloadLogs()`
- Foundation ready for agent log access (Phase 3)

### Phase 3: Medium Term (Next Month) ✅ **COMPLETE**
**Focus: Agent log access**

- [x] Implement /dev/logs endpoint in API
- [x] Add log capture in browser
- [x] Test agent can retrieve logs
- [x] Document workflow for agent debugging
- [ ] Add log viewing UI in dev mode (optional)

**Results achieved:**
- Backend API endpoints: POST/GET/DELETE `/dev/logs`
- Log storage in `.dev-logs/browser-logs.json` (max 5000 entries)
- Auto-send from browser every 30 seconds (if backend available)
- Graceful degradation: logs stay in localStorage if backend unavailable
- Query filtering: level, component, timestamp, limit
- Comprehensive agent documentation in `AGENT_DEBUGGING_WORKFLOW.md`
- Agents can now access browser logs programmatically without manual copy/paste

### Phase 4: Long Term (Future)
**Focus: Visual regression**

- [ ] Evaluate Playwright for E2E tests
- [ ] Create proof-of-concept visual test
- [ ] Set up visual diff infrastructure
- [ ] Add visual tests to CI/CD

**Expected outcome:** Automated visual regression detection

---

## Success Metrics

### Quantitative
- **Test coverage:** >80% for critical paths
- **Log access time:** <10 seconds for agent to retrieve logs
- **Bug detection:** Visual issues caught by automated tests
- **Debugging time:** Reduce by 50% compared to recent bug

### Qualitative
- Agent can independently diagnose rendering issues
- Clear visibility into what's tested vs. untested
- Consistent logging across all components
- Faster iteration on bug fixes

---

## Open Questions

1. **Visual testing:** Is Playwright worth the infrastructure cost?
2. **Log storage:** How long should we keep development logs?
3. **Production logging:** Should we capture errors in production?
4. **CI/CD integration:** Should coverage checks block merges?

---

## Resources

- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [Testing React Three Fiber](https://docs.pmnd.rs/react-three-fiber/tutorials/testing)
- [Playwright Visual Testing](https://playwright.dev/docs/test-snapshots)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)

---

## Appendix: Current Test Inventory

### Unit Tests (6)
- `NoiseParametersPanel.test.tsx` (4 tests)
- Component prop tests

### Integration Tests (4)
- `terrain-generation.test.ts`
  - Frequency variation
  - Amplitude variation
  - Octaves variation
  - Seed variation

### Test Helpers
- `test-helpers.ts` - API calling utilities
- `test-expectations.json` - Expected values

### Missing Tests
- TerrainMesh rendering logic
- App state management
- Error handling
- Loading states
- Edge cases (invalid parameters)
