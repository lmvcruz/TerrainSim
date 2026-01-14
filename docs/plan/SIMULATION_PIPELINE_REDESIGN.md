# Simulation Pipeline Redesign

**Purpose:** Define the flexible simulation architecture with job-based execution before Iteration 4 implementation.

---

## Current vs. Proposed Architecture

### Current (Iteration 3)
- Fixed pipeline: `Initial Noise → Erosion Frames`
- Single generation method (Perlin/fBm)
- Erosion parameters configured once at start

### Proposed (Iteration 4+)
- **Job-based pipeline with configurable stages**
- **Step 0:** Terrain modeling (generation)
- **Steps 1-N:** Simulation stages (erosion, deformation, etc.)
- **Simulation Jobs:** Executable units that apply steps to specific frame ranges
- Configuration persistence (save/load as JSON)
- Each step consumes previous frame's heightmap

---

## UI Design Approach

### Recommended: Integrated Single-Page Interface

**Layout Components:**
- **Left Panel:** Pipeline Builder
  - **Purpose:** Define WHAT simulation steps are available (e.g., add Hydraulic Erosion, Thermal Erosion)
  - **Think of it as:** The toolbox of simulation techniques
- **Center:** 3D Terrain Viewer with Playback Scrubber
  - **Purpose:** Visualize terrain and play through simulation results
  - **Think of it as:** The preview/playback window (for VIEWING results)
- **Right Panel:** Job Manager
  - **Purpose:** Define WHEN and HOW steps are applied (create jobs that say "Apply Step X with Config Y to frames A-B")
  - **Think of it as:** The timeline scheduler/configurator
- **Bottom:** Configuration Timeline
  - **Purpose:** Visual validation of job coverage and gap detection
  - **Think of it as:** The configuration canvas (for CONFIGURING what will run)
  - Shows color-coded job assignments across all frames
- **Modals/Pop-ups:** Step configuration dialogs, job editing

**Why Integrated Over Two-Page?**
- ✅ Immediate visual feedback when configuring
- ✅ No context switching during iteration
- ✅ Professional feel (similar to video editing software)
- ✅ Real-time validation (see uncovered frames while editing jobs)
- ❌ More complex state management (acceptable tradeoff)

**Collapsible Panels:** Each panel can minimize to maximize workspace

---

## Job-Based Execution System

### Core Concept

**Simulation Job:** An executable unit that applies a specific step configuration to a defined frame range.

```typescript
interface SimulationJob {
  id: string;
  name: string;
  stepId: string;              // Which step to execute (e.g., "hydraulic-erosion")
  frameRange: [number, number]; // [start, end] inclusive
  config: StepConfig;          // Step-specific parameters
  enabled: boolean;
}
```

### How Frame Quantity is Defined

The total number of frames in a simulation is defined in the top-level configuration:

```json
{
  "simulation": {
    "totalFrames": 200,  // User specifies this value
    ...
  }
}
```

- User sets `totalFrames` when creating/loading a configuration
- Can be changed at any time before running simulation

### Key Rules

1. **Full Coverage Requirement:**
   - Every frame [0, totalFrames-1] MUST be covered by at least one enabled job
   - Simulation blocked until all frames have coverage
   - UI displays validation errors showing uncovered frame ranges

2. **Multiple jobs Per Step:**
   - Same step can have multiple jobs with different configurations
   - Example: "Heavy Erosion" job (frames 0-50) + "Light Erosion" job (frames 51-100)

3. **Multiple Jobs Per Frame:**
   - Multiple jobs can cover the same frame for the same step
   - All jobs execute sequentially in the order they are defined
   - Each job receives the output of the previous job as input
   - Example: Frame 25 has Job A → Job B → Job C (all for hydraulic erosion)
     - Job A processes initial heightmap → produces intermediate result 1
     - Job B processes intermediate result 1 → produces intermediate result 2
     - Job C processes intermediate result 2 → produces final frame 25

4. **Visual Feedback:**
   - Timeline shows color-coded coverage
   - Green: Fully covered
   - Red: No job assigned (blocking error)
   - Blue: Multiple jobs overlap

## Configuration Persistence

- **Format:** `.terrainconfig.json` files (human-readable, version-controlled)
- **Contains:** Step 0 config, all steps, all jobs, UI state
- **Benefits:** Reproducibility, sharing, version control, experimentation

---

## Step 0: Initial Terrain Modeling

**Purpose:** Generate the initial heightmap (t=0)

**Available Strategies:**
1. **Noise-based:**
   - Perlin noise (single octave)
   - fBm (multi-octave)
   - Simplex, Worley, etc. (future)

2. **Deterministic functions:**
   - `generateSemiSphere()` - hemisphere
   - `generateCone()` - conical peak
   - `generateSigmoid()` - smooth transition
   - Custom mathematical functions (future)

3. **Data-driven:**
   - Import from file (PNG, EXR, GeoTIFF)
   - User-drawn heightmap
   - Procedural combination (e.g., noise + cone mask)

4. **Iterative construction:**
   - Run multiple generation passes
   - Layer different noise types
   - Apply filters (blur, sharpen, terrace)

---

## UI Components

**Example:** Mountain formation with varying erosion intensity

```json
{
  "simulation": {
    "name": "Mountain Formation with Varied Erosion",
    "totalFrames": 200,
    "version": "1.0",

    "step0": {
      "type": "modeling",
      "method": "noise",
      "params": {
        "algorithm": "fbm",
        "seed": 12345,
        "octaves": 6,
        "frequency": 0.01,
        "amplitude": 100.0,
        "persistence": 0.5,
        "lacunarity": 2.0
      }
    },

    "steps": [
      {
        "id": "hydraulic-erosion",
        "name": "Hydraulic Erosion",
        "type": "hydraulic_erosion",
        "enabled": true,
        "description": "Water-based erosion simulation"
      },
      {
        "id": "thermal-erosion",
        "name": "Thermal Erosion",
        "type": "thermal_erosion",
        "enabled": true,
        "description": "Gravity-driven material collapse"
      }
    ],

    "jobs": [
      {
        "id": "job-1",
        "name": "Heavy Hydraulic Erosion",
        "stepId": "hydraulic-erosion",
        "frameRange": [0, 100],
        "enabled": true,
        "config": {
          "particleCount": 20000,
          "erosionRate": 0.6,
          "depositionRate": 0.2,
          "evaporationRate": 0.05
        }
      },
      {
        "id": "job-2",
        "name": "Light Hydraulic Erosion",
        "stepId": "hydraulic-erosion",
        "frameRange": [101, 200],
        "enabled": true,
        "config": {
          "particleCount": 8000,
          "erosionRate": 0.2,
          "depositionRate": 0.4,
          "evaporationRate": 0.1
        }
      },
      {
        "id": "job-3",
        "name": "Thermal Smoothing (Full Duration)",
        "stepId": "thermal-erosion",
        "frameRange": [0, 200],
        "enabled": true,
        "config": {
          "talusAngle": 0.7,
          "transferRate": 0.5
        }
      }
    ]
  }
}
```

---

---

## job Execution Flow

### Validation Phase (Before Execution)

```typescript
function validateAgentCoverage(jobs: job[], totalFrames: number): ValidationResult {
  const coverage = new Set<number>();

  // Build coverage map from all enabled jobs
  for (const job of jobs.filter(a => a.enabled)) {
    for (let frame = job.frameRange[0]; frame <= job.frameRange[1]; frame++) {
      coverage.add(frame);
    }
  }

  // Find gaps
  const uncoveredFrames: number[] = [];
  for (let frame = 0; frame < totalFrames; frame++) {
    if (!coverage.has(frame)) {
      uncoveredFrames.push(frame);
    }
  }

  return {
    isValid: uncoveredFrames.length === 0,
    uncoveredFrames,
    message: uncoveredFrames.length > 0
      ? `Cannot run: Frames ${formatRanges(uncoveredFrames)} have no assigned jobs`
      : 'All frames covered - ready to simulate'
  };
}

// Helper: Convert [1,2,3,5,6,7,10] → "1-3, 5-7, 10"
function formatRanges(frames: number[]): string {
  // ... collapse consecutive frames into ranges
}
```

### Simulation Execution Loop

```typescript
async function executeSimulation(config: SimulationConfig): Promise<Heightmap[]> {
  const frames: Heightmap[] = [];

  // Step 0: Generate initial heightmap
  const initialMap = generateModelingStep(config.step0);
  frames.push(initialMap);

  // Steps 1-N: Execute simulation with jobs
  for (let frameIndex = 1; frameIndex < config.totalFrames; frameIndex++) {
    let currentMap = frames[frameIndex - 1].clone();

    // Execute each enabled step
    for (const step of config.steps.filter(s => s.enabled)) {
      // Find jobs for this frame and step
      const applicableAgents = config.jobs.filter(job =>
        job.enabled &&
        job.stepId === step.id &&
        frameIndex >= job.frameRange[0] &&
        frameIndex <= job.frameRange[1]
      );

      if (applicableAgents.length === 0) {
        continue; // No job for this step at this frame - skip
      }

      // Apply ALL jobs sequentially (each job receives previous output)
      for (const job of applicableAgents) {
        currentMap = executeStep(step.type, currentMap, job.config);
      }
    }

    frames.push(currentMap);
  }

  return frames;
}
```

---

## UI Components

### 1. Pipeline Builder Panel (Left Sidebar)

**Features:**
- Add/remove simulation steps
- Reorder steps (drag-and-drop)
- Toggle step enabled/disabled
- Configure Step 0 (noise method, parameters)
- Collapse/expand for more workspace

### 2. Job Manager Panel (Right Sidebar)

**Features:**
- List all jobs with visual frame indicators
- Create new job: Select step → Define frame range → Configure
- Edit/duplicate/delete jobs
- Enable/disable jobs
- Coverage validator with visual feedback

### 3. Configuration Timeline (Bottom Panel)

**Features:**
- Horizontal scrubber from frame 0 to totalFrames
- Color-coded job coverage bars
- Current frame indicator
- Click to jump to frame
- Drag to select frame range (quick job creation)
- Color indicators: Green (covered), Red (gaps), Yellow (overlaps)

### 4. Create Job Modal

**Workflow:**
1. User clicks "+ Create job" or drags on timeline
2. Modal opens with:
   - job name input
   - Step dropdown (populated from pipeline)
   - Frame range sliders/inputs
   - Configuration panel (step-specific parameters)
   - Preview: Shows how this affects coverage
3. User clicks "Create" → Validation → job added

---

---

## Implementation Implications

### Backend (C++ Core)
1. **job Validator:** Check full frame coverage before execution
2. **Frame Executor:** Execute jobs in order for each frame
3. **Config Parser:** Parse job-based JSON configuration
4. **Overlap Resolver:** Handle multiple jobs on same frame (Phase 1: last wins)

### API (TypeScript/Node.js)
1. **New Endpoints:**
   - `POST /config/validate` - Validate job coverage
   - `POST /config/save` - Save configuration to file
   - `GET /config/load/:id` - Load saved configuration
   - `POST /simulate/jobs` - Execute simulation with job config
2. **WebSocket Events:**
   - `frame:complete` - Emitted for each frame rendered
   - `job:start` - When job begins execution
   - `validation:error` - Coverage gaps detected

### Frontend (React + Three.js)
1. **Components:**
   - `<PipelineBuilder>` - Step configuration panel
   - `<AgentManager>` - job CRUD operations
   - `<TimelineView>` - Visual coverage and scrubber
   - `<AgentModal>` - Create/edit job dialog
   - `<CoverageValidator>` - Real-time validation display
2. **State Management:**
   - Redux/Zustand for simulation config
   - Local state for UI panels (collapsed/expanded)
   - WebSocket integration for live updates
3. **Validation:**
   - Client-side validation before sending to API
   - Visual feedback (red timeline segments for gaps)
   - Disable "Run Simulation" button when invalid

---

## Migration Strategy

### Phase 1: job System MVP (Iteration 4 Scope)

**Goals:**
- Implement job-based execution
- Configuration save/load
- Integrated UI with coverage validation
- Support 2 simulation steps (hydraulic + thermal erosion)

**Tasks:**
1. **Backend:**
   - Implement `JobValidator` class
   - Implement `JobExecutor` for frame-by-frame execution
   - Add job config parsing to `SimulationEngine`
   - Sequential execution of multiple jobs per frame

2. **API:**
   - Add `/config/validate`, `/config/save`, `/config/load` endpoints
   - Update `/simulate` to accept job config
   - Add WebSocket events for progress tracking

3. **Frontend:**
   - Build integrated UI layout (panels + timeline)
   - Implement `<AgentManager>` with CRUD operations
   - Implement `<TimelineView>` with coverage visualization
   - Real-time validation and error messages
   - Save/load buttons with file picker

**Deliverables:**
- Users can create multiple jobs per step
- Users can assign jobs to specific frame ranges
- System validates full coverage before execution
- Configurations can be saved/loaded as JSON files
- Timeline visually shows job coverage

**Non-Goals (Phase 1):**
- ❌ job priority/blending
- ❌ Parameter interpolation at boundaries
- ❌ job templates
- ❌ Branching pipelines
- ❌ Live modification during execution

### Phase 2: Enhanced job Features (Iteration 5+)

**Scope:**
- job priority system for overlap resolution
- Parameter interpolation at job boundaries
- job templates (presets like "Heavy Erosion", "Gradual Fade")
- job cloning/duplication
- Undo/redo for job operations
- Multi-select jobs for batch operations

### Phase 3: Advanced Pipeline Features (Iteration 6+)

**Scope:**
- Branching simulations (A/B comparison)
- Conditional jobs (only execute if terrain meets criteria)
- Live pipeline modification during execution
- Frame caching strategies for large simulations (1000+ frames)
- Export pipeline as reusable template library

---

## Backlog (Future Enhancements)

Features deferred from Iteration 3.6 for future consideration:

### Future Feature: Parameter Interpolation (Smooth Transitions)
**Status:** Deferred to Phase 2+
**Description:** Add optional smooth parameter transitions at job boundaries

**How it would work:**
- Add `transitionFrames` property to jobs (optional)
- If set, interpolate parameters across N frames at boundaries
- Example: Job A (frames 0-50, erosionRate=0.8) → Job B (frames 51-100, erosionRate=0.2)
  - With `transitionFrames=5`, frames 48-52 would interpolate: 0.8 → 0.7 → 0.5 → 0.3 → 0.2

**Benefits:**
- Smoother visual transitions in terrain evolution
- More natural-looking erosion progression

**Complexity:** Medium (requires interpolation logic + UI controls)

---

### Future Feature: Live Editing with Re-computation
**Status:** Deferred to Phase 3+
**Description:** Allow users to modify pipeline/jobs while simulation is running

**How it would work:**
- User can edit job configurations during playback
- System detects which frames are affected by changes
- Invalidates and re-computes only affected frames
- Visual indicators show which regions have been recomputed

**Benefits:**
- Faster iteration for experimentation
- No need to restart entire simulation for small tweaks

**Complexity:** High (complex state synchronization, cache invalidation logic)

**Risks:**
- May confuse users about "current state"
- Harder to reproduce exact results
- Complex UI state management

---

## Next Steps

**ITERATION 3.6** has been extracted and moved to the [Iterations Planning](../plan/Iterations Planning) document for implementation tracking.

**Backlog features** have been moved to [Backlog.md](../plan/Backlog.md) for future consideration.
