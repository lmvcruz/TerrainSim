# Job-Based Pipeline System

## Purpose

The Job-Based Pipeline System enables creation of complex terrain simulations by chaining multiple erosion effects across a timeline. Users define discrete simulation tasks (jobs) that apply to specific frame ranges, creating layered, sequential terrain transformations.

## Core Concept

Traditional terrain generation applies a single effect uniformly. The job system breaks this into discrete steps:
- **Frame 0:** Initial terrain (Perlin noise, cone, custom)
- **Frames 1-N:** Sequential simulation frames, each potentially transformed by one or more jobs
- **Jobs:** Individual tasks (hydraulic/thermal erosion) applied to frame ranges

The system validates that every frame is covered by at least one enabled job, preventing gaps in the simulation timeline. This allows complex workflows like "heavy erosion for 50 frames, then gentle weathering for 50 more."

**Why job-based?** Provides fine-grained control over simulation parameters without requiring complex parameter interpolation. Artists can think in discrete "passes" rather than continuous animations.

## Configuration Structure

### Pipeline Configuration

| Field | Type | Description |
|-------|------|-------------|
| `step0` | object | Initial terrain configuration (method, parameters) |
| `totalFrames` | number | Total simulation frames (1-10,000) |
| `jobs` | array | Collection of job definitions |

### Job Definition

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `id` | string | - | Unique identifier |
| `name` | string | - | Descriptive label |
| `startFrame` | number | 1-N | First frame (inclusive) |
| `endFrame` | number | 1-N | Last frame (inclusive) |
| `step` | string | `hydraulicErosion` \| `thermalErosion` | Effect type |
| `enabled` | boolean | - | Whether job is active |
| `config` | object | - | Erosion-specific parameters |

### Hydraulic Erosion Parameters

| Parameter | Type | Range | Default | Effect |
|-----------|------|-------|---------|--------|
| `numParticles` | number | 1,000-500,000 | 100,000 | Water droplets per frame |
| `erosionRate` | number | 0.1-0.9 | 0.3 | Sediment pickup strength |
| `depositionRate` | number | 0.01-0.5 | 0.1 | Sediment drop rate |
| `evaporationRate` | number | 0.001-0.1 | 0.01 | Water loss per step |
| `minSlope` | number | 0.0-0.1 | 0.01 | Minimum slope for erosion |

### Thermal Erosion Parameters

| Parameter | Type | Range | Default | Effect |
|-----------|------|-------|---------|--------|
| `talusAngle` | number | 0.1-1.5 | 0.5 | Slope stability threshold (radians) |
| `numIterations` | number | 1-10 | 5 | Weathering passes per frame |

## Coverage Validation

**Critical Constraint:** Every frame from 1 to `totalFrames` must be covered by at least one enabled job.

### Validation Algorithm

1. Create boolean array `coverage[1..totalFrames]` (all false)
2. For each enabled job:
   - Set `coverage[startFrame..endFrame] = true`
3. Find first `false` entry → gap at that frame
4. Report gaps, overlaps, out-of-bounds ranges

### Error Types

| Type | Description | Example |
|------|-------------|---------|
| Gap | Frames not covered by any enabled job | Frames 51-60 uncovered |
| Out-of-bounds | Job extends beyond totalFrames | Job ends at 150, totalFrames = 100 |
| Invalid range | startFrame > endFrame | Start: 60, End: 40 |

Overlaps are **allowed** (multiple jobs can affect same frames).

## API Endpoints

### Validate Configuration
**POST** `/config/validate`

Validates pipeline configuration and returns coverage analysis.

**Request:**
```json
{
  "step0": { "method": "Perlin", ... },
  "totalFrames": 100,
  "jobs": [...]
}
```

**Response (Valid):**
```json
{
  "valid": true,
  "warnings": [],
  "coverage": {
    "1-50": ["Heavy Erosion"],
    "51-100": ["Light Weathering"]
  }
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "errors": [
    {
      "type": "gap",
      "frames": { "start": 51, "end": 75 },
      "message": "Frames 51-75 not covered by any enabled job"
    }
  ]
}
```

### Save Configuration
**POST** `/config/save`

Persists configuration for later retrieval.

**Request:**
```json
{
  "name": "My Pipeline",
  "config": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "id": "config-uuid-123",
  "savedAt": "2026-01-19T15:30:00Z"
}
```

### Load Configuration
**GET** `/config/load/:id`

Retrieves saved configuration.

**Response:**
```json
{
  "id": "config-uuid-123",
  "name": "My Pipeline",
  "config": { ... },
  "savedAt": "2026-01-19T15:30:00Z"
}
```

### Create Simulation Session
**POST** `/simulate/create`

Creates new simulation session and validates configuration.

**Request:** Same as `/config/validate`

**Response:**
```json
{
  "success": true,
  "sessionId": "session-uuid-456",
  "validationResult": { "valid": true, ... }
}
```

### Execute Simulation
**POST** `/simulate/execute/:sessionId`

Starts frame-by-frame simulation via WebSocket.

**Response (HTTP):**
```json
{
  "success": true,
  "message": "Simulation started. Connect to WebSocket for updates."
}
```

**WebSocket Events:**
```json
{
  "type": "progress",
  "currentFrame": 25,
  "totalFrames": 100,
  "percentComplete": 25,
  "currentJob": "Heavy Erosion"
}
```

```json
{
  "type": "frame",
  "frame": 25,
  "heightmap": [...],
  "statistics": { "min": 0.0, "max": 50.5, "mean": 23.2 }
}
```

```json
{
  "type": "complete",
  "totalFrames": 100,
  "duration": 4523,
  "message": "Simulation completed"
}
```

### Delete Session
**DELETE** `/simulate/:sessionId`

Cleans up simulation session.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

## UI Components

### PipelineBuilder
- Manages global pipeline configuration (step0, totalFrames)
- Displays validation status (errors/warnings)
- Initiates simulation execution
- Shows generated terrain in 3D viewer

### JobManager
- CRUD operations for jobs
- Job templates (Light/Medium/Heavy erosion presets)
- Enable/disable toggles
- Job reordering and duplication

### ConfigurationTimeline
- Visual representation of frame coverage
- Color-coded job segments
- Interactive frame scrubbing
- Playback controls (play/pause/stop/reset)
- Identifies gaps and overlaps visually

### JobModal
- Job creation/editing form
- Parameter sliders with real-time validation
- Frame range selection with visual feedback
- Erosion type selector (hydraulic/thermal)

## Behavior & Edge Cases

### Normal Operation
1. User configures step0 and totalFrames
2. Creates jobs covering all frames
3. System validates (green checkmark if valid)
4. User clicks "Generate" → simulation executes
5. WebSocket streams frames to 3D viewer in real-time

### Validation Errors
- **Gap detected:** Red warning shows missing frame ranges
- **Out-of-bounds:** Job highlighted in red on timeline
- **Invalid range:** Modal prevents job creation (disabled save button)

### Performance Characteristics
- **Small simulations** (100 frames, 100K particles): ~5-10 seconds
- **Large simulations** (10K frames, 500K particles): ~10-20 minutes
- **WebSocket overhead:** ~50ms latency per frame at 100ms interval
- **Memory:** ~2MB per 1K frames (heightmap + metadata)

### Browser Constraints
- **Max totalFrames:** 10,000 (validated on frontend and backend)
- **Max particles:** 500,000 per frame (C++ engine limit)
- **WebSocket timeout:** 30 seconds idle time
- **Canvas rendering:** 60fps target for timeline scrubbing

## Session Lifecycle

1. **Create:** `POST /simulate/create` → sessionId
2. **Execute:** WebSocket connection with sessionId
   - Server sends progress/frame/complete events
   - Client can cancel via WebSocket close
3. **Complete/Error:** Session auto-deletes after 5 minutes
4. **Manual cleanup:** `DELETE /simulate/:sessionId`

Sessions are ephemeral (in-memory only). Configuration persistence requires explicit save/load.

## Design Decisions

### Why Job-Based?
- **Discrete control:** Artists define "passes" instead of interpolating parameters
- **Visual clarity:** Timeline shows exactly what happens when
- **Composability:** Easy to combine multiple effects without complex math
- **Debugging:** Can disable individual jobs to isolate issues

### Why Frame-by-Frame Execution?
- **Progressive rendering:** See results as they generate (vs. waiting for completion)
- **Cancellable:** Stop mid-simulation without losing work
- **Memory efficient:** Stream results instead of buffering all frames
- **Feedback loop:** Identify issues early (wrong parameters obvious after 10 frames)

### Why Coverage Validation?
- **Prevent runtime errors:** Catch missing frames before expensive simulation
- **Clear feedback:** Tell user exactly where problem is, not just "invalid config"
- **Safety:** Ensure every frame is well-defined (no undefined behavior)

## Extension Points

### Adding New Erosion Types
1. Define parameters in UI (JobModal)
2. Add to job `step` enum (`'hydraulicErosion' | 'thermalErosion' | 'yourEffect'`)
3. Implement C++ algorithm in terrain engine
4. Add to backend execution switch in simulation loop

### Custom Initial Terrain (Step 0)
1. Add method to `step0.method` enum
2. Define parameters in PipelineBuilder
3. Implement generator in C++ terrain engine
4. Update validation to accept new method

### Templates
Add to JobManager template list:
```typescript
{
  name: "Your Template",
  config: {
    numParticles: 150000,
    erosionRate: 0.4,
    ...
  }
}
```

## Constraints

**Performance Limits:**
- Max 10,000 frames (UI enforced)
- Max 500,000 particles per frame (C++ enforced)
- WebSocket message size: 10MB (heightmap for 1024x1024 terrain)

**Validation Rules:**
- `1 <= startFrame <= endFrame <= totalFrames`
- At least one enabled job must exist
- Job names must be unique (recommended, not enforced)
- `step0.method` must be valid terrain generator

**Browser Requirements:**
- WebGL 2.0 for 3D rendering
- ES2020 for frontend code
- WebSocket support (all modern browsers)
- Min 2GB RAM for large simulations (10K frames)

## Error Handling

### Frontend Errors
- **Validation errors:** Red text below fields, disabled buttons
- **Network errors:** Toast notification + reconnection attempt
- **WebSocket disconnect:** Auto-reconnect with exponential backoff

### Backend Errors
- **400 Bad Request:** Invalid configuration (missing fields, out of range)
- **404 Not Found:** Session expired or doesn't exist
- **500 Internal Error:** C++ engine crash (logged for debugging)

All errors return consistent format:
```json
{
  "error": {
    "type": "validation_error",
    "message": "Human-readable description",
    "details": { ... }
  }
}
```
