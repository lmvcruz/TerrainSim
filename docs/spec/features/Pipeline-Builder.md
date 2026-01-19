# Pipeline Builder

## Purpose
Main UI component for configuring terrain generation workflows, coordinating initial terrain setup, job management, and triggering simulation execution.

## Core Concept

The Pipeline Builder is the **top-level orchestrator** of terrain workflows. It combines three sub-components:
1. **Initial Terrain Selector:** Choose base terrain (Perlin noise, cone, custom heightmap)
2. **Job Manager:** Define, edit, enable/disable erosion jobs
3. **Configuration Timeline:** Visualize and navigate job coverage

This unified interface prevents fragmented workflows—users configure everything in one place, then click "Generate Terrain" to execute the full pipeline on the backend. No hidden steps or configuration files.

**Why single-page workflow?** Reduces cognitive load. Alternative approaches (wizard, multi-step form) require users to remember previous choices. Single-page design shows all configuration simultaneously, making relationships between settings obvious.

## UI Workflow

### Step 1: Initial Terrain Setup
- **Method dropdown:** Perlin, Cone, Custom Upload
- **Parameter controls:** Dynamically shown based on selected method
  - Perlin: seed, frequency, amplitude, octaves, persistence, lacunarity
  - Cone: center position, height, radius
  - Custom: file upload (PNG/EXR heightmap)
- **Preview button:** Generate and display initial terrain (frame 0 only)

### Step 2: Job Configuration
- **Job list:** Shows all defined jobs with enable/disable toggles
- **Add Job button:** Opens JobModal for new job creation
- **Edit Job icon:** Opens JobModal with existing job data
- **Delete Job icon:** Removes job after confirmation
- **Coverage validation:** Real-time feedback on gaps/errors

### Step 3: Timeline Review
- **Visual validation:** See job coverage across frames
- **Playhead navigation:** Preview specific frames (not yet simulated)
- **Gap detection:** Red highlights show uncovered frames

### Step 4: Generation
- **Generate Terrain button:** Triggers backend API call
- **Progress indicator:** Shows current frame being processed
- **Real-time preview:** WebSocket streams heightmap updates per frame
- **Success state:** Final terrain displayed with statistics

## State Management

### Component State
```typescript
{
  step0Method: 'Perlin' | 'Cone' | 'Custom',
  step0Params: Record<string, any>,
  totalFrames: number,
  jobs: Job[],
  isGenerating: boolean,
  currentGenerationFrame: number,
  generationError: string | null
}
```

### API Integration
- **POST /config/validate:** Validates configuration before generation
- **POST /terrain/generate:** Submits pipeline, returns session ID
- **WebSocket /progress:** Streams frame updates during generation
- **GET /session/:id/result:** Retrieves final heightmap after completion

### Error Handling
- **Validation errors:** Displayed inline near offending fields
- **Network errors:** Toast notification with retry option
- **Generation failures:** Modal with detailed error message and logs
- **Partial results:** Option to view frames completed before error

## Edge Cases

### Empty Job List
- Block generation with message: "Add at least one job to simulate"
- Disable "Generate Terrain" button
- Show helpful prompt: "Jobs define how terrain evolves over time"

### Invalid Configuration
- Run validation before generation (calls /config/validate)
- Display errors in accordion-style list (collapsible)
- Highlight invalid fields in red with error tooltips
- Prevent generation until all errors resolved

### Generation Timeout
- WebSocket connection timeout after 5 minutes (safety limit)
- Display error: "Generation timed out - check backend logs"
- Offer partial result download if any frames completed
- Log timeout event for debugging

### Concurrent Generation Attempts
- Disable "Generate Terrain" button while isGenerating = true
- Show spinner and "Generating..." text
- Queue subsequent clicks (don't discard)
- Only one active generation per browser tab

### Unsaved Configuration
- Detect unsaved changes via dirty flag (state != saved config)
- Show warning modal if user tries to leave page
- Offer "Save Configuration" button in header
- Auto-save to localStorage every 30 seconds (optional)

## Integration

### With Job Manager
- Pipeline Builder passes jobs array as prop
- Job Manager emits job CRUD events (add, update, delete, toggle)
- Pipeline Builder updates state and re-validates
- Bidirectional data flow via React Context (PipelineContext)

### With Configuration Timeline
- Pipeline Builder provides totalFrames and jobs
- Timeline emits frame selection events (user clicks frame)
- Pipeline Builder updates currentFrame state
- Timeline subscribes to generation progress updates

### With Terrain Viewer
- Generation success triggers heightmap prop update
- Terrain Viewer re-renders with new data
- Statistics displayed below viewer (min, max, mean elevation)
- Camera resets to default position (birds-eye view)

## Constraints

**Performance:**
- Configuration UI updates in <16ms (60fps)
- Validation API call debounced (500ms after last change)
- WebSocket messages throttled (max 30 updates/second)
- React optimizations: useMemo for expensive calculations, useCallback for event handlers

**API limits:**
- Maximum totalFrames: 10,000 (backend constraint)
- Maximum jobs: 100 (practical UI limit)
- Maximum configuration size: 1MB JSON (API payload limit)
- WebSocket payload: 10MB max (heightmap data)

**Browser requirements:**
- Modern ES6+ browser (no IE11 support)
- WebSocket support required
- Minimum 1024×768 screen resolution
- 4GB RAM recommended (for large heightmaps)

**Error recovery:**
- WebSocket reconnection: 3 attempts with exponential backoff
- API retry: 2 attempts for transient failures (429, 503)
- Persisted state: Recover configuration from localStorage on crash
- Graceful degradation: Fallback to HTTP polling if WebSocket unavailable
