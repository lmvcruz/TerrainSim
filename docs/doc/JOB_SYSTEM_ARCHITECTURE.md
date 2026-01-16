# Job-Based Pipeline System - Architecture & Developer Notes

## Overview

This document provides technical details about the internal architecture, design decisions, and implementation patterns of the Job-Based Pipeline System. Intended for developers maintaining or extending the system.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Job Execution Model](#job-execution-model)
3. [Coverage Validation Algorithms](#coverage-validation-algorithms)
4. [UI State Management](#ui-state-management)
5. [Session Lifecycle](#session-lifecycle)
6. [API Design Patterns](#api-design-patterns)
7. [Performance Considerations](#performance-considerations)
8. [Extension Points](#extension-points)

---

## System Architecture

### Component Hierarchy

```
┌─────────────────────────────────────────────┐
│           Frontend (React + Three.js)        │
│  ┌────────────────────────────────────────┐ │
│  │  PipelineContext (Global State)        │ │
│  │  - Configuration                       │ │
│  │  - Jobs Collection                     │ │
│  │  - Validation State                    │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────┐ ┌────────────────┐ │
│  │  PipelineBuilder   │ │  JobManager    │ │
│  │  - Timeline UI     │ │  - Job CRUD    │ │
│  │  - Validation View │ │  - Templates   │ │
│  └────────────────────┘ └────────────────┘ │
└─────────────────────────────────────────────┘
                   │ HTTP/WebSocket
                   ▼
┌─────────────────────────────────────────────┐
│        Backend API (Node.js + Express)       │
│  ┌────────────────────────────────────────┐ │
│  │  JobSystem Routes                      │ │
│  │  - /config/validate                    │ │
│  │  - /config/save|load                   │ │
│  │  - /simulate/create|execute|delete     │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  Session Manager                       │ │
│  │  - Session Storage (Map)               │ │
│  │  - Timeout Management                  │ │
│  │  - Cleanup Handlers                    │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  Job Validator                         │ │
│  │  - Coverage Algorithm                  │ │
│  │  - Overlap Detection                   │ │
│  │  - Constraint Checking                 │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                   │ FFI
                   ▼
┌─────────────────────────────────────────────┐
│       Native Addon (C++ via node-addon-api)  │
│  ┌────────────────────────────────────────┐ │
│  │  SimulationJob Class                   │ │
│  │  - Job Definition                      │ │
│  │  - Parameter Storage                   │ │
│  │  - Frame Range                         │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  JobValidator Class                    │ │
│  │  - validateCoverage()                  │ │
│  │  - detectOverlaps()                    │ │
│  │  - checkConstraints()                  │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  JobExecutor Class                     │ │
│  │  - executeJob()                        │ │
│  │  - executeFrame()                      │ │
│  │  - Progress Callbacks                  │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Data Flow

**Configuration Validation:**
```
User Input (Frontend)
  → PipelineContext.validateConfiguration()
  → API: POST /config/validate
  → JobValidator.validateCoverage()
  → Coverage Algorithm (C++)
  → Validation Result
  → UI Update (Red/Green/Yellow)
```

**Simulation Execution:**
```
User Clicks "Simulate"
  → API: POST /simulate/create (terrain data)
  → SessionManager.createSession()
  → Session ID returned
  → API: POST /simulate/execute (jobs + frameNum)
  → JobExecutor.executeFrame()
  → For each job overlapping frameNum:
      → Filter jobs by frame range
      → Sort by creation order
      → Execute sequentially
      → Pass output to next job
  → WebSocket: frame:complete
  → Frontend updates terrain visualization
```

---

## Job Execution Model

### Sequential Execution

**Design Decision:** When multiple jobs overlap on the same frame, they execute **sequentially** in the order they were created.

**Rationale:**
- Predictable behavior (deterministic output)
- Allows layering effects intentionally
- Maintains causal relationships (job B sees job A's output)
- Aligns with timeline metaphor (left-to-right execution)

**Implementation:**

**C++ JobExecutor::executeFrame():**
```cpp
HeightMap executeFrame(
  const HeightMap& input,
  int frameNum,
  const std::vector<SimulationJob>& allJobs
) {
  // Filter jobs that cover this frame
  std::vector<SimulationJob*> activeJobs;
  for (auto& job : allJobs) {
    if (job.isEnabled() &&
        job.startFrame <= frameNum &&
        job.endFrame >= frameNum) {
      activeJobs.push_back(&job);
    }
  }

  // Sort by creation order (stable_sort preserves order for equal elements)
  std::stable_sort(activeJobs.begin(), activeJobs.end(),
    [](SimulationJob* a, SimulationJob* b) {
      return a->getCreationIndex() < b->getCreationIndex();
    }
  );

  // Execute jobs sequentially
  HeightMap current = input;
  for (auto* job : activeJobs) {
    current = executeJob(*job, current);
  }

  return current;
}
```

**JavaScript API Wrapper:**
```javascript
app.post('/simulate/execute', async (req, res) => {
  const { sessionId, frameNum, jobs } = req.body;

  // Get previous frame's terrain
  const session = sessionManager.get(sessionId);
  const inputTerrain = session.getFrame(frameNum - 1);

  // Execute frame (C++ handles sequential execution)
  const outputTerrain = nativeAddon.executeFrame(
    inputTerrain,
    frameNum,
    jobs
  );

  // Store result
  session.setFrame(frameNum, outputTerrain);

  // Notify via WebSocket
  io.to(sessionId).emit('frame:complete', {
    frameNum,
    progress: frameNum / session.totalFrames
  });

  res.json({ success: true, frameNum });
});
```

### Job Creation Index

Each job receives a **creation index** (monotonically increasing integer) when created. This index determines execution order.

**Why not use array index?**
- Users may reorder UI elements
- Jobs may be deleted, shifting indices
- Creation order is immutable and stable

**Implementation:**
```typescript
let nextJobId = 1; // Global counter

function createJob(config: JobConfig): Job {
  const job = {
    id: crypto.randomUUID(),
    creationIndex: nextJobId++,
    ...config
  };

  // creationIndex never changes, even if jobs are reordered in UI
  return job;
}
```

### Disabled Jobs

**Behavior:** Disabled jobs are **completely ignored** during execution. They do not participate in coverage validation.

**Use Cases:**
- A/B testing (disable job A, run simulation, re-enable and compare)
- Debugging (isolate which job causes issues)
- Iterative development (build pipeline incrementally)

**Implementation:**
```cpp
if (job.isEnabled() && job.coversFrame(frameNum)) {
  // Execute this job
}
// Disabled jobs skip this block entirely
```

---

## Coverage Validation Algorithms

### Frame Coverage Algorithm

**Goal:** Determine if every frame [1, totalFrames] is covered by at least one **enabled** job.

**Algorithm (C++ JobValidator):**
```cpp
struct ValidationResult {
  bool isValid;
  std::vector<int> uncoveredFrames;
  std::vector<std::string> warnings;
};

ValidationResult validateCoverage(
  int totalFrames,
  const std::vector<SimulationJob>& jobs
) {
  // Create coverage bitmap (one bit per frame)
  std::vector<bool> covered(totalFrames + 1, false); // Index 0 unused

  // Mark covered frames
  for (const auto& job : jobs) {
    if (!job.isEnabled()) continue; // Skip disabled jobs

    for (int f = job.startFrame; f <= job.endFrame; ++f) {
      if (f >= 1 && f <= totalFrames) {
        covered[f] = true;
      }
    }
  }

  // Find uncovered frames
  std::vector<int> uncovered;
  for (int f = 1; f <= totalFrames; ++f) {
    if (!covered[f]) {
      uncovered.push_back(f);
    }
  }

  ValidationResult result;
  result.isValid = uncovered.empty();
  result.uncoveredFrames = uncovered;

  return result;
}
```

**Complexity:**
- Time: O(J × F) where J = number of jobs, F = average frames per job
- Space: O(N) where N = totalFrames
- Optimized: For N=10,000 frames, uses ~10KB memory

**Edge Cases:**
```cpp
// Frame 0 is not validated (initial terrain, always exists)
// Frames 1-N must be covered

// Example: totalFrames = 100
// Job 1: Frames 50-150 (end > total)
// → Clamps to 50-100, frames 101-150 ignored

// Job 2: Frames -10-0 (before start)
// → Clamps to 0-0, no coverage provided

// Job 3: Frames 1000-2000 (completely out of range)
// → Ignored, no coverage provided
```

### Overlap Detection Algorithm

**Goal:** Identify frames where multiple jobs overlap and generate warnings.

**Algorithm:**
```cpp
struct OverlapInfo {
  int frameNum;
  std::vector<std::string> jobNames;
};

std::vector<OverlapInfo> detectOverlaps(
  int totalFrames,
  const std::vector<SimulationJob>& jobs
) {
  // Count jobs per frame
  std::vector<std::vector<SimulationJob*>> jobsPerFrame(totalFrames + 1);

  for (auto& job : jobs) {
    if (!job.isEnabled()) continue;

    for (int f = job.startFrame; f <= job.endFrame && f <= totalFrames; ++f) {
      if (f >= 1) {
        jobsPerFrame[f].push_back(&job);
      }
    }
  }

  // Find frames with overlaps (>1 job)
  std::vector<OverlapInfo> overlaps;
  for (int f = 1; f <= totalFrames; ++f) {
    if (jobsPerFrame[f].size() > 1) {
      OverlapInfo info;
      info.frameNum = f;
      for (auto* job : jobsPerFrame[f]) {
        info.jobNames.push_back(job->getName());
      }
      overlaps.push_back(info);
    }
  }

  return overlaps;
}
```

**Optimization:** Overlap detection is **optional** and only runs when requested (e.g., during validation or when warnings are needed). Frame execution doesn't require overlap detection.

### Constraint Validation

**System Constraints:**
```typescript
const CONSTRAINTS = {
  MAX_FRAMES: 10000,
  MAX_JOBS: 100,
  MAX_TERRAIN_SIZE: 4096,
  MIN_TERRAIN_SIZE: 64,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  MAX_PARTICLES: 1000000,
  MIN_PARTICLES: 1000
};
```

**Validation Checks:**
```javascript
function validateConstraints(config) {
  const errors = [];

  // Frame limits
  if (config.totalFrames < 1 || config.totalFrames > CONSTRAINTS.MAX_FRAMES) {
    errors.push(`totalFrames must be 1-${CONSTRAINTS.MAX_FRAMES}`);
  }

  // Job limits
  if (config.jobs.length > CONSTRAINTS.MAX_JOBS) {
    errors.push(`Maximum ${CONSTRAINTS.MAX_JOBS} jobs allowed`);
  }

  // Terrain size
  const size = config.step0.width;
  if (size < CONSTRAINTS.MIN_TERRAIN_SIZE || size > CONSTRAINTS.MAX_TERRAIN_SIZE) {
    errors.push(`Terrain size must be ${CONSTRAINTS.MIN_TERRAIN_SIZE}-${CONSTRAINTS.MAX_TERRAIN_SIZE}`);
  }

  // Job-specific constraints
  for (const job of config.jobs) {
    if (job.startFrame < 1) {
      errors.push(`Job "${job.name}" startFrame must be >= 1`);
    }
    if (job.endFrame > config.totalFrames) {
      errors.push(`Job "${job.name}" endFrame exceeds totalFrames`);
    }
    if (job.startFrame > job.endFrame) {
      errors.push(`Job "${job.name}" startFrame > endFrame`);
    }

    // Step-specific validation
    if (job.step === 'hydraulicErosion') {
      const p = job.config.numParticles;
      if (p < CONSTRAINTS.MIN_PARTICLES || p > CONSTRAINTS.MAX_PARTICLES) {
        errors.push(`Job "${job.name}" particles out of range`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
```

---

## UI State Management

### PipelineContext Architecture

**React Context Pattern:**
```typescript
interface PipelineState {
  step0: Step0Config | null;
  totalFrames: number;
  jobs: Job[];
  validationResult: ValidationResult | null;
  isSimulating: boolean;
  currentFrame: number;
  sessionId: string | null;
}

const PipelineContext = createContext<{
  state: PipelineState;
  actions: PipelineActions;
}>(undefined);
```

**State Transitions:**
```
Initial State:
  - step0 = null
  - totalFrames = 0
  - jobs = []
  - validationResult = null

After Step0 Configuration:
  - step0 = { method: "Perlin", ... }
  - totalFrames = 100
  - jobs = []
  - validationResult = { isValid: false, uncoveredFrames: [1-100] }

After Adding Jobs:
  - jobs = [job1, job2, ...]
  - validationResult = { isValid: true, uncoveredFrames: [] }

During Simulation:
  - isSimulating = true
  - currentFrame = 25
  - sessionId = "abc123"

After Simulation:
  - isSimulating = false
  - currentFrame = 100
```

### Action Patterns

**Optimistic Updates:**
```typescript
// Add job with immediate UI update
const addJob = async (config: JobConfig) => {
  // Optimistic: Add to local state immediately
  const newJob = { ...config, id: uuid(), creationIndex: nextId++ };
  dispatch({ type: 'ADD_JOB', job: newJob });

  // Update UI instantly (no loading spinner)
  revalidate();

  // Background: Persist to server (optional)
  try {
    await api.post('/config/save', state);
  } catch (err) {
    // Silent failure (auto-save), or show notification
  }
};
```

**Debounced Validation:**
```typescript
// Avoid validating on every keystroke
const debouncedValidate = useMemo(
  () => debounce(async (config) => {
    const result = await api.post('/config/validate', config);
    dispatch({ type: 'SET_VALIDATION', result });
  }, 300), // 300ms delay
  []
);

// Call on any config change
useEffect(() => {
  debouncedValidate(state);
}, [state.step0, state.totalFrames, state.jobs]);
```

**Immutable Updates:**
```typescript
// Never mutate state directly
const updateJob = (jobId: string, updates: Partial<JobConfig>) => {
  dispatch({
    type: 'UPDATE_JOB',
    jobId,
    updates
  });
};

// Reducer ensures immutability
function pipelineReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.jobId
            ? { ...job, ...action.updates }
            : job
        )
      };
    default:
      return state;
  }
}
```

### Timeline Rendering

**Virtual Scrolling Pattern:**
```typescript
// Don't render all 10,000 frames at once
function TimelineCanvas({ totalFrames, jobs }) {
  const visibleStart = Math.floor(scrollX / FRAME_WIDTH);
  const visibleEnd = visibleStart + viewportWidth / FRAME_WIDTH;

  // Only render visible frames
  const visibleFrames = range(visibleStart, visibleEnd);

  return (
    <canvas ref={canvasRef}>
      {visibleFrames.map(f => (
        <FrameBar key={f} frame={f} jobs={getJobsForFrame(f)} />
      ))}
    </canvas>
  );
}
```

**Color Coding Logic:**
```typescript
function getFrameColor(frame: number): string {
  const coveringJobs = jobs.filter(j =>
    j.isEnabled && j.startFrame <= frame && j.endFrame >= frame
  );

  if (coveringJobs.length === 0) {
    return '#FF0000'; // Red (uncovered)
  } else if (coveringJobs.length === 1) {
    return '#00FF00'; // Green (single coverage)
  } else {
    return '#FFFF00'; // Yellow (overlap)
  }
}
```

---

## Session Lifecycle

### Session Creation

**POST /simulate/create:**
```javascript
app.post('/simulate/create', async (req, res) => {
  const { terrain, totalFrames } = req.body;

  // Generate unique session ID
  const sessionId = crypto.randomUUID();

  // Create session object
  const session = {
    id: sessionId,
    terrain: new Float32Array(terrain),
    totalFrames,
    frames: new Map(), // Stores computed frames
    createdAt: Date.now(),
    lastAccess: Date.now(),
    timeout: null
  };

  // Store frame 0 (initial terrain)
  session.frames.set(0, session.terrain);

  // Set 30-minute timeout
  session.timeout = setTimeout(() => {
    sessionManager.delete(sessionId);
    console.log(`Session ${sessionId} expired`);
  }, 30 * 60 * 1000);

  // Store in memory
  sessionManager.set(sessionId, session);

  res.json({ sessionId });
});
```

### Session Access

**Pattern:**
```javascript
function getSession(sessionId) {
  const session = sessionManager.get(sessionId);

  if (!session) {
    throw new Error('Session not found or expired');
  }

  // Update last access time (reset timeout)
  session.lastAccess = Date.now();
  clearTimeout(session.timeout);
  session.timeout = setTimeout(() => {
    sessionManager.delete(sessionId);
  }, 30 * 60 * 1000);

  return session;
}
```

### Session Cleanup

**Manual Cleanup:**
```javascript
// DELETE /simulate/session/:id
app.delete('/simulate/session/:id', (req, res) => {
  const { id } = req.params;
  const session = sessionManager.get(id);

  if (session) {
    clearTimeout(session.timeout);
    sessionManager.delete(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});
```

**Automatic Cleanup (30-minute idle):**
```javascript
// Timeout set on session creation
session.timeout = setTimeout(() => {
  sessionManager.delete(sessionId);
  console.log(`Auto-cleanup: Session ${sessionId} expired`);
}, 30 * 60 * 1000);

// Reset on every access
session.lastAccess = Date.now();
clearTimeout(session.timeout);
session.timeout = setTimeout(/* ... */, 30 * 60 * 1000);
```

**Graceful Shutdown:**
```javascript
// On server shutdown, notify active sessions
process.on('SIGTERM', () => {
  console.log('Server shutting down, cleaning up sessions...');

  for (const [id, session] of sessionManager.entries()) {
    clearTimeout(session.timeout);

    // Notify via WebSocket
    io.to(id).emit('session:terminated', {
      reason: 'Server shutdown'
    });
  }

  sessionManager.clear();
  server.close();
});
```

---

## API Design Patterns

### RESTful Resource Hierarchy

```
/config               (Configuration resources)
  POST /validate      (Validate without persisting)
  POST /save          (Persist to disk)
  GET  /load/:id      (Retrieve saved config)

/simulate             (Simulation resources)
  POST /create        (Initialize session)
  POST /execute       (Execute frame)
  DELETE /session/:id (Cleanup session)
```

**Design Principles:**
- **Stateless requests:** Each request includes all necessary context
- **Idempotent operations:** POST /execute with same frameNum produces same result
- **Resource-oriented:** URLs represent resources, not actions
- **Consistent responses:** All endpoints return `{ success, data, error }` pattern

### Request/Response Schema Validation

**Using Zod for Runtime Validation:**
```typescript
import { z } from 'zod';

const JobConfigSchema = z.object({
  name: z.string().min(1).max(100),
  startFrame: z.number().int().min(1),
  endFrame: z.number().int().min(1),
  step: z.enum(['hydraulicErosion', 'thermalErosion']),
  isEnabled: z.boolean(),
  config: z.record(z.unknown())
});

const ValidateRequestSchema = z.object({
  step0: z.object({
    method: z.string(),
    // ... other step0 fields
  }),
  totalFrames: z.number().int().min(1).max(10000),
  jobs: z.array(JobConfigSchema).max(100)
});

// Middleware
app.post('/config/validate', (req, res) => {
  try {
    const validated = ValidateRequestSchema.parse(req.body);
    // Proceed with validated data
  } catch (err) {
    res.status(400).json({ error: err.errors });
  }
});
```

### Error Handling Pattern

**Consistent Error Format:**
```typescript
interface ErrorResponse {
  error: string;         // Human-readable message
  code: string;          // Machine-readable code
  details?: unknown;     // Additional context
}

// Example responses:
{ error: 'Session not found', code: 'SESSION_NOT_FOUND' }
{ error: 'Invalid frame range', code: 'INVALID_FRAME_RANGE', details: { startFrame: 50, endFrame: 40 } }
```

**Error Middleware:**
```javascript
app.use((err, req, res, next) => {
  console.error(err);

  if (err instanceof ValidationError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors
    });
  } else if (err instanceof SessionNotFoundError) {
    res.status(404).json({
      error: 'Session not found or expired',
      code: 'SESSION_NOT_FOUND'
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

### WebSocket Event Pattern

**Connection Management:**
```javascript
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join session room
  socket.on('join', (sessionId) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
  });

  // Leave session room
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
```

**Event Emission:**
```javascript
// Emit to specific session
io.to(sessionId).emit('frame:complete', {
  frameNum: 25,
  progress: 0.25,
  elapsed: 15000 // milliseconds
});

// Broadcast to all clients (rare)
io.emit('server:status', { status: 'healthy' });
```

---

## Performance Considerations

### Bottlenecks

1. **Frame Execution (C++ native code)**
   - Hydraulic erosion: O(P × R) where P=particles, R=radius
   - Thermal erosion: O(W × H) where W=width, H=height
   - Dominant cost for large terrains

2. **Terrain Serialization (JS ↔ C++ boundary)**
   - Float32Array copies
   - ~4MB for 1024×1024 terrain
   - Mitigated by using typed arrays (zero-copy where possible)

3. **WebSocket Emissions**
   - Avoid emitting large terrain data
   - Send progress updates only (small JSON objects)
   - Terrain retrieval happens via GET request

### Optimization Strategies

**1. Lazy Frame Computation:**
```javascript
// Don't compute all frames upfront
// Compute on-demand when user seeks to frame

app.get('/simulate/frame/:sessionId/:frameNum', (req, res) => {
  const { sessionId, frameNum } = req.params;
  const session = getSession(sessionId);

  // Check if frame already computed
  if (session.frames.has(frameNum)) {
    return res.json({ terrain: session.frames.get(frameNum) });
  }

  // Compute frames sequentially up to requested frame
  for (let f = session.lastComputedFrame + 1; f <= frameNum; f++) {
    const input = session.frames.get(f - 1);
    const output = executeFrame(input, f, session.jobs);
    session.frames.set(f, output);
  }

  session.lastComputedFrame = frameNum;
  res.json({ terrain: session.frames.get(frameNum) });
});
```

**2. Progressive Simulation:**
```javascript
// Execute frames incrementally, allowing UI updates

async function simulateProgressive(sessionId, jobs, totalFrames) {
  for (let f = 1; f <= totalFrames; f++) {
    await api.post('/simulate/execute', { sessionId, frameNum: f, jobs });

    // UI updates via WebSocket (non-blocking)
    // User can cancel mid-simulation

    if (cancelled) break;
  }
}
```

**3. Memoization of Validation:**
```typescript
// Cache validation results if config hasn't changed
const validationCache = new Map<string, ValidationResult>();

function validate(config: PipelineConfig): ValidationResult {
  const hash = hashConfig(config);

  if (validationCache.has(hash)) {
    return validationCache.get(hash);
  }

  const result = performValidation(config);
  validationCache.set(hash, result);
  return result;
}
```

**4. Web Worker for Terrain Rendering:**
```typescript
// Offload terrain mesh generation to worker thread
const terrainWorker = new Worker('terrain-worker.js');

terrainWorker.postMessage({
  type: 'generate-mesh',
  terrain: terrainData
});

terrainWorker.onmessage = (e) => {
  const { vertices, indices } = e.data;
  updateThreeJSMesh(vertices, indices);
};
```

### Memory Management

**Session Memory Limits:**
```javascript
const MAX_CACHED_FRAMES = 100; // Store up to 100 frames per session

function storeFrame(session, frameNum, terrain) {
  session.frames.set(frameNum, terrain);

  // Evict old frames if exceeds limit
  if (session.frames.size > MAX_CACHED_FRAMES) {
    const oldestFrame = Math.min(...session.frames.keys());
    session.frames.delete(oldestFrame);
  }
}
```

**Garbage Collection Hints:**
```javascript
// After simulation completes, clear heavy objects
function cleanupSession(sessionId) {
  const session = sessionManager.get(sessionId);

  // Keep frame 0 and final frame only
  const finalFrame = session.totalFrames;
  const toKeep = new Set([0, finalFrame]);

  for (const [frameNum] of session.frames) {
    if (!toKeep.has(frameNum)) {
      session.frames.delete(frameNum);
    }
  }

  // Force GC (Node.js flag: --expose-gc)
  if (global.gc) global.gc();
}
```

---

## Extension Points

### Adding New Step Types

**1. Define Step Interface (C++):**
```cpp
// In SimulationStep.h
class CustomErosionStep : public SimulationStep {
public:
  HeightMap execute(const HeightMap& input, const nlohmann::json& config) override {
    // Custom erosion logic here
    return output;
  }

  std::string getTypeName() const override {
    return "customErosion";
  }
};
```

**2. Register in Step Factory:**
```cpp
// In StepFactory.cpp
std::unique_ptr<SimulationStep> StepFactory::create(const std::string& type) {
  if (type == "hydraulicErosion") {
    return std::make_unique<HydraulicErosionStep>();
  } else if (type == "thermalErosion") {
    return std::make_unique<ThermalErosionStep>();
  } else if (type == "customErosion") {
    return std::make_unique<CustomErosionStep>();
  }
  throw std::runtime_error("Unknown step type: " + type);
}
```

**3. Add API Support (TypeScript):**
```typescript
// In types.ts
type StepType = 'hydraulicErosion' | 'thermalErosion' | 'customErosion';

interface CustomErosionConfig {
  // Custom parameters
  intensity: number;
  radius: number;
}
```

**4. Add UI Components:**
```typescript
// In StepConfigPanel.tsx
function StepConfigPanel({ stepType }: { stepType: StepType }) {
  if (stepType === 'customErosion') {
    return <CustomErosionPanel />;
  }
  // ... other step types
}
```

### Adding Validation Rules

**Custom Validator:**
```typescript
// In validators.ts
export function validateCustomRule(config: PipelineConfig): ValidationError[] {
  const errors = [];

  // Example: Hydraulic jobs must come before thermal jobs
  let seenThermal = false;
  for (const job of config.jobs) {
    if (job.step === 'thermalErosion') {
      seenThermal = true;
    } else if (job.step === 'hydraulicErosion' && seenThermal) {
      errors.push({
        code: 'INVALID_JOB_ORDER',
        message: 'Hydraulic erosion jobs must come before thermal erosion'
      });
    }
  }

  return errors;
}
```

**Register Validator:**
```typescript
// In PipelineContext.tsx
const validators = [
  validateCoverage,
  validateConstraints,
  validateCustomRule, // Add custom validator
];

function validateConfiguration(config: PipelineConfig) {
  const allErrors = validators.flatMap(v => v(config));
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}
```

### Extending Session Storage

**Persistent Storage Backend:**
```javascript
// Instead of in-memory Map, use Redis/database
import Redis from 'ioredis';
const redis = new Redis();

class PersistentSessionManager {
  async createSession(sessionId, data) {
    await redis.set(
      `session:${sessionId}`,
      JSON.stringify(data),
      'EX',
      1800 // 30 minutes expiry
    );
  }

  async getSession(sessionId) {
    const data = await redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId) {
    await redis.del(`session:${sessionId}`);
  }
}
```

---

## Testing Strategies

### Unit Tests (C++)

**Testing JobValidator:**
```cpp
TEST(JobValidatorTest, DetectsUncoveredFrames) {
  std::vector<SimulationJob> jobs = {
    SimulationJob("Job1", 1, 50, "hydraulicErosion", {}),
    SimulationJob("Job2", 60, 100, "thermalErosion", {})
  };

  JobValidator validator;
  auto result = validator.validateCoverage(100, jobs);

  EXPECT_FALSE(result.isValid);
  EXPECT_EQ(result.uncoveredFrames.size(), 10); // Frames 51-60
}

TEST(JobValidatorTest, AllowsOverlaps) {
  std::vector<SimulationJob> jobs = {
    SimulationJob("Job1", 1, 60, "hydraulicErosion", {}),
    SimulationJob("Job2", 40, 100, "thermalErosion", {})
  };

  JobValidator validator;
  auto result = validator.validateCoverage(100, jobs);

  EXPECT_TRUE(result.isValid); // Overlaps are valid
  EXPECT_TRUE(result.uncoveredFrames.empty());
}
```

### Integration Tests (Node.js)

**Testing API Endpoints:**
```javascript
describe('/config/validate', () => {
  it('should reject uncovered frames', async () => {
    const config = {
      step0: { method: 'Perlin' },
      totalFrames: 100,
      jobs: [
        { name: 'Job1', startFrame: 1, endFrame: 50, step: 'hydraulicErosion', isEnabled: true }
      ]
    };

    const res = await request(app)
      .post('/config/validate')
      .send(config);

    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(false);
    expect(res.body.uncoveredFrames).toHaveLength(50); // Frames 51-100
  });
});
```

### End-to-End Tests (Frontend)

**Testing Pipeline Workflow:**
```typescript
describe('Pipeline Builder', () => {
  it('should create valid pipeline', async () => {
    render(<PipelineBuilder />);

    // Configure Step 0
    await userEvent.click(screen.getByText('Configure Initial Terrain'));
    await userEvent.selectOptions(screen.getByLabelText('Method'), 'Perlin');
    await userEvent.click(screen.getByText('Save'));

    // Set total frames
    await userEvent.type(screen.getByLabelText('Total Frames'), '100');

    // Add job
    await userEvent.click(screen.getByText('Create Job'));
    await userEvent.type(screen.getByLabelText('Name'), 'Heavy Erosion');
    await userEvent.type(screen.getByLabelText('Start Frame'), '1');
    await userEvent.type(screen.getByLabelText('End Frame'), '100');
    await userEvent.click(screen.getByText('Create'));

    // Verify validation
    expect(screen.getByText(/Configuration is valid/)).toBeInTheDocument();
  });
});
```

---

## Common Pitfalls

### 1. Forgetting Disabled Jobs

**Problem:** Validation shows "valid" but simulation fails because jobs are disabled.

**Solution:**
```typescript
// Always check isEnabled in validation
const enabledJobs = jobs.filter(j => j.isEnabled);
const result = validateCoverage(totalFrames, enabledJobs);
```

### 2. Mutating State Directly

**Problem:** React doesn't re-render because state object is mutated.

**Solution:**
```typescript
// ❌ Wrong
state.jobs.push(newJob);

// ✅ Correct
setState({
  ...state,
  jobs: [...state.jobs, newJob]
});
```

### 3. Not Handling Session Expiry

**Problem:** User leaves page open for 35 minutes, session expires, API returns 404.

**Solution:**
```typescript
// Check session validity before executing frame
async function executeFrame(sessionId, frameNum) {
  try {
    return await api.post('/simulate/execute', { sessionId, frameNum });
  } catch (err) {
    if (err.response?.status === 404) {
      // Session expired, recreate
      const newSessionId = await recreateSession();
      return executeFrame(newSessionId, frameNum);
    }
    throw err;
  }
}
```

### 4. Blocking UI During Long Simulations

**Problem:** Simulation of 1000 frames takes 10 minutes, UI freezes.

**Solution:**
```typescript
// Use async execution with progress updates
async function simulateAsync(sessionId, jobs, totalFrames) {
  for (let f = 1; f <= totalFrames; f++) {
    await api.post('/simulate/execute', { sessionId, frameNum: f, jobs });

    // Allow UI to update (React state update triggers re-render)
    setProgress(f / totalFrames);

    // Yield to browser event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

---

## Future Enhancements

### 1. Parallel Frame Execution

**Current:** Frames execute sequentially (Frame 2 waits for Frame 1)

**Proposed:** Independent frames execute in parallel

**Benefits:**
- Faster simulation for non-overlapping jobs
- Better CPU utilization

**Challenges:**
- Overlapping jobs still require sequential execution
- Memory overhead (multiple frames in flight)

### 2. Job Dependency Graph

**Current:** Jobs execute in creation order

**Proposed:** Explicit dependencies (Job B depends on Job A)

**Benefits:**
- More explicit control
- Better understanding of pipeline flow

**Implementation:**
```typescript
interface Job {
  id: string;
  dependencies: string[]; // IDs of jobs this depends on
}
```

### 3. Real-time Collaboration

**Proposed:** Multiple users edit same pipeline

**Implementation:**
- WebSocket for real-time updates
- Operational Transformation (OT) or CRDTs for conflict resolution
- Lock mechanism for concurrent job edits

### 4. GPU Acceleration

**Proposed:** Offload erosion algorithms to GPU (WebGPU/CUDA)

**Benefits:**
- 10-100x speedup for large terrains
- Real-time simulation preview

---

## Version History

- **v1.0.0** (2026-01-16): Initial architecture documentation
  - System architecture overview
  - Job execution model
  - Coverage validation algorithms
  - UI state management patterns
  - Session lifecycle
  - API design patterns
  - Performance considerations
  - Extension points
