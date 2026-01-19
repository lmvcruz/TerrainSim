# Job-Based Pipeline System - User Guide

## Overview

The Job-Based Pipeline System allows you to create complex terrain simulations by chaining multiple erosion effects across a timeline of frames. This guide will help you understand how to build, validate, and execute simulation pipelines.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Creating Your First Pipeline](#creating-your-first-pipeline)
3. [Understanding Coverage Validation](#understanding-coverage-validation)
4. [Working with Jobs](#working-with-jobs)
5. [Using Templates](#using-templates)
6. [Save and Load Workflows](#save-and-load-workflows)
7. [Troubleshooting](#troubleshooting)

---

## Core Concepts

### What is a Pipeline?

A **pipeline** is a complete terrain simulation configuration that defines:
- **Step 0:** Initial terrain generation (Perlin noise, cone, etc.)
- **Total Frames:** How many simulation frames to generate (1-10000)
- **Jobs:** Individual simulation tasks applied to frame ranges

### What is a Job?

A **job** is a single simulation task that runs on a specific frame range. Each job has:
- **Name:** Descriptive label (e.g., "Heavy Erosion")
- **Frame Range:** Start and end frames (inclusive)
- **Step Type:** Hydraulic or Thermal Erosion
- **Configuration:** Parameters controlling the effect
- **Enable/Disable:** Toggle to include/exclude from simulation

### Frame Coverage

**Critical Rule:** Every frame from 1 to N must be covered by at least one **enabled** job, or the simulation will not run.

---

## Creating Your First Pipeline

### Step 1: Configure Initial Terrain (Step 0)

The simulation starts with frame 0, which is your initial terrain model.

**Available Methods:**
- **Perlin Noise:** Classic procedural terrain with organic features
- **FBM (Fractional Brownian Motion):** Layered noise for complex detail
- **SemiSphere:** Hemisphere shape for testing
- **Cone:** Conical peak
- **Sigmoid:** Smooth transition surface

**Example Configuration:**
```json
{
  "method": "Perlin",
  "seed": 42,
  "frequency": 0.05,
  "amplitude": 50.0,
  "octaves": 6,
  "persistence": 0.5,
  "lacunarity": 2.0
}
```

**Tips:**
- **Lower frequency** (0.01-0.05) = Larger terrain features
- **Higher amplitude** (50-100) = More dramatic elevation changes
- **More octaves** (4-8) = More fine detail

### Step 2: Set Total Frames

Decide how many frames your simulation will have. This determines the timeline length.

**Recommendations:**
- **Quick preview:** 10-20 frames
- **Standard simulation:** 50-100 frames
- **Long evolution:** 200-500 frames

### Step 3: Create Jobs

Add jobs to define what happens during the simulation.

**Example: Simple Erosion Pipeline**
```
Job 1: "Initial Erosion"
  - Frames: 1-50
  - Type: Hydraulic Erosion
  - Settings: Heavy (100,000 particles)

Job 2: "Smoothing"
  - Frames: 51-100
  - Type: Thermal Erosion
  - Settings: Gentle (30° talus angle)
```

### Step 4: Validate Configuration

Before running, the system checks:
- ✅ All frames 1-N are covered
- ⚠️ Overlapping jobs (will run sequentially)
- ⚠️ Disabled jobs (will be skipped)

**Valid Configuration:**
```
Frames: 1-100
Job 1: Frames 1-50 (enabled) ✅
Job 2: Frames 51-100 (enabled) ✅
Result: isValid = true
```

**Invalid Configuration:**
```
Frames: 1-100
Job 1: Frames 1-50 (enabled) ✅
Job 2: Frames 60-100 (enabled) ✅
Gap: Frames 51-59 uncovered ❌
Result: isValid = false
```

---

## Understanding Coverage Validation

### What is Coverage?

**Coverage** means every frame has at least one enabled job assigned to it. Without full coverage, the simulation cannot run.

### Visual Feedback

The timeline provides color-coded visual feedback:

| Color | Meaning |
|-------|---------|
| 🟢 **Green Fill** | Frame is covered by an enabled job |
| 🔴 **Red Fill** | Frame is uncovered (validation fails) |
| 🟡 **Yellow Outline** | Frame has overlapping jobs (will run in sequence) |

### Coverage Warnings

The system provides helpful warnings:

**Warning Types:**
1. **Uncovered Frames:** "Frames 51-59 are not covered by any enabled job"
2. **Overlapping Jobs:** "Frame 25 has overlapping jobs: Job A, Job B (will execute sequentially)"
3. **Disabled Jobs:** "Job 'Light Erosion' is disabled and will be skipped"

**Example Validation Result:**
```json
{
  "isValid": false,
  "uncoveredFrames": [51, 52, 53, 54, 55],
  "warnings": [
    "Frame 25 has overlapping jobs: Heavy Erosion, Light Smoothing",
    "Job 'Experimental Effect' is disabled"
  ]
}
```

### Fixing Coverage Issues

**Problem:** Gap in coverage (frames 51-59)

**Solutions:**
1. **Extend existing job:** Change Job 1 end frame from 50 to 59
2. **Create new job:** Add Job 3 covering frames 51-59
3. **Shift job:** Move Job 2 start frame from 60 to 51

---

## Working with Jobs

### Job Execution Model

**IMPORTANT:** When multiple jobs overlap on the same frame, they execute **sequentially** in the order they were created.

**Example:**
```
Frame 25 has 3 jobs:
  1. Job A: Hydraulic Erosion (created first)
  2. Job B: Thermal Erosion (created second)
  3. Job C: Hydraulic Erosion (created third)

Execution Flow:
  Input (Frame 24)
    → Job A executes → Result A
    → Job B executes on Result A → Result B
    → Job C executes on Result B → Result C
    → Result C becomes Frame 25
```

**This allows you to:**
- Layer multiple effects on the same frames
- Create complex multi-step processing
- Build sophisticated terrain evolution pipelines

### Creating a Job

**Basic Steps:**
1. Click "Create Job" button in Job Manager panel
2. Enter job name (e.g., "Heavy Erosion")
3. Select step type (Hydraulic or Thermal)
4. Set frame range (start and end)
5. Configure step parameters
6. Preview coverage impact
7. Click "Create"

**Job Configuration Example:**

**Hydraulic Erosion Job:**
```json
{
  "name": "Heavy Erosion",
  "startFrame": 1,
  "endFrame": 50,
  "step": "hydraulicErosion",
  "config": {
    "numParticles": 100000,
    "erosionRate": 0.5,
    "depositionRate": 0.1,
    "sedimentCapacity": 4.0,
    "minSlope": 0.01,
    "inertia": 0.3,
    "evaporationRate": 0.01,
    "gravity": 4.0,
    "erosionRadius": 3.0
  }
}
```

**Thermal Erosion Job:**
```json
{
  "name": "Thermal Smoothing",
  "startFrame": 51,
  "endFrame": 100,
  "step": "thermalErosion",
  "config": {
    "talusAngle": 30.0,
    "transferRate": 0.5
  }
}
```

### Editing Jobs

**To edit an existing job:**
1. Click job in Job Manager panel
2. Click "Edit" button
3. Modify parameters
4. Preview changes
5. Click "Save"

**Note:** Editing a job may affect coverage. The system will revalidate automatically.

### Deleting Jobs

**To delete a job:**
1. Click job in Job Manager panel
2. Click "Delete" button
3. Confirm deletion

**Warning:** Deleting a job may create coverage gaps. Always check validation after deletion.

### Enabling/Disabling Jobs

**To toggle a job:**
1. Click the enable/disable toggle in Job Manager
2. Validation updates automatically

**Use cases:**
- Temporarily disable a job to test variations
- Compare results with/without specific effects
- Debug which job is causing unexpected results

---

## Using Templates

Templates provide pre-configured job settings for common effects.

### Available Templates

**Hydraulic Erosion Templates:**

1. **Heavy Erosion**
   - 100,000 particles
   - High erosion rate (0.5)
   - Creates deep valleys and dramatic features
   - Best for: Mountainous terrain, canyon formation

2. **Light Smoothing**
   - 50,000 particles
   - Lower erosion rate (0.3)
   - Gentle terrain modification
   - Best for: Final polish, subtle detail

**Thermal Erosion Templates:**

1. **Aggressive Collapse**
   - 25° talus angle (steep slopes collapse quickly)
   - High transfer rate (0.7)
   - Creates cliff faces and sharp features
   - Best for: Rocky terrain, steep mountains

2. **Gentle Settling**
   - 35° talus angle (gradual slope adjustment)
   - Lower transfer rate (0.4)
   - Smooth, natural-looking slopes
   - Best for: Hills, dunes, gentle landscapes

### Using Templates

**To create a job from template:**
1. Click "Create Job" button
2. Click "Use Template" dropdown
3. Select a template
4. Parameters auto-populate
5. Adjust as needed
6. Set frame range
7. Click "Create"

**Template Workflow:**
```
1. Select "Heavy Erosion" template
2. Auto-populated with recommended settings
3. Adjust frame range: 1-50
4. Tweak erosion rate if needed: 0.5 → 0.6
5. Create job
```

### Customizing Templates

Templates are starting points. Feel free to adjust:
- **Particle count:** More = more detail, slower
- **Erosion rate:** Higher = more aggressive erosion
- **Talus angle:** Lower = steeper allowed slopes

---

## Save and Load Workflows

### Saving Configurations

**To save your pipeline:**
1. Click "Save Configuration" button
2. Enter a descriptive name (e.g., "Mountain Valley v1")
3. Configuration downloads as `.terrainconfig.json`
4. Store in your project folder

**Saved Configuration Format:**
```json
{
  "step0": { ... },
  "totalFrames": 100,
  "jobs": [ ... ]
}
```

**Best Practices:**
- Use descriptive names with versions
- Save before major changes
- Keep backups of working configurations
- Document what each configuration does

### Loading Configurations

**To load a saved configuration:**
1. Click "Load Configuration" button
2. Select `.terrainconfig.json` file
3. System validates configuration
4. If valid, pipeline populates
5. Review and simulate

**Loading Process:**
```
1. User clicks "Load"
2. File picker opens
3. Select terrainconfig.json
4. System parses JSON
5. Validates against current rules
6. Populates UI if valid
7. Shows errors if invalid
```

### Auto-Save (Draft Recovery)

The system automatically saves your work to browser localStorage every 30 seconds.

**Features:**
- Automatic backup while editing
- Survives browser crashes
- Survives page refreshes
- No manual intervention needed

**To recover a draft:**
1. Refresh the page
2. Click "Recover Draft" notification
3. System loads last auto-saved state

**Note:** Draft recovery only works on the same computer/browser.

### Recent Configurations

The system maintains a list of recently used configurations.

**To access:**
1. Click "Recent" dropdown
2. Select from last 10 configurations
3. Configuration loads immediately

**Recent List Shows:**
- Configuration name
- Last modified date
- Frame count
- Job count

---

## Troubleshooting

### Common Issues

#### Issue: "Configuration invalid: Uncovered frames"

**Symptom:** Validation fails with red timeline segments

**Solutions:**
1. Check which frames are uncovered (shown in validation result)
2. Extend an existing job to cover the gap
3. Create a new job for the missing range
4. Reduce totalFrames to match your job coverage

**Example Fix:**
```
Problem: Frames 51-59 uncovered
Solution: Change Job 2 startFrame from 60 to 51
```

---

#### Issue: "Jobs overlapping - unexpected results"

**Symptom:** Yellow outline on timeline, results differ from expectations

**Understanding:**
- Overlapping jobs execute **sequentially**
- Later jobs modify results from earlier jobs
- This is by design and allows layering effects

**Solutions:**
1. **Intentional overlaps:** Keep them for multi-step effects
2. **Unintentional overlaps:** Adjust frame ranges to eliminate overlap
3. **Check job order:** Earlier jobs run first

**Example:**
```
Frame 25:
  Job A (Hydraulic): Creates valleys
  Job B (Thermal): Smooths those valleys
Result: Smooth valleys (both effects applied)
```

---

#### Issue: "Simulation runs but results look wrong"

**Diagnostic Steps:**
1. Check job order (earlier jobs run first)
2. Verify enabled/disabled status
3. Review parameter values (too extreme?)
4. Test with one job at a time
5. Compare with template defaults

**Common Parameter Issues:**
- **Too many particles:** Slow, over-eroded
- **Too few particles:** Minimal effect
- **Erosion rate too high:** Terrain flattens
- **Talus angle too low:** Everything collapses

---

#### Issue: "Cannot simulate - disabled jobs"

**Symptom:** Validation passes but simulate button disabled

**Solutions:**
1. Check if all jobs are marked as enabled
2. Enable at least one job per uncovered frame
3. Review warnings in validation result

**Example:**
```
Frames: 1-100
Job 1: Frames 1-50 (disabled) ❌
Job 2: Frames 51-100 (enabled) ✅
Problem: Frames 1-50 have no enabled jobs
Solution: Enable Job 1
```

---

#### Issue: "Configuration won't load"

**Symptom:** Error loading saved .terrainconfig.json file

**Solutions:**
1. Verify JSON syntax (use JSON validator)
2. Check file extension is exactly `.terrainconfig.json`
3. Ensure all required fields present
4. Validate frame ranges don't exceed limits
5. Try opening in text editor to inspect

**Required Fields:**
```json
{
  "step0": { "method": "..." },
  "totalFrames": 100,
  "jobs": [ ... ]
}
```

---

#### Issue: "Simulation too slow"

**Symptom:** Frame execution takes too long

**Optimization Tips:**
1. Reduce particle count (100k → 50k)
2. Use smaller terrain size (512×512 → 256×256)
3. Reduce total frames
4. Disable detailed logging
5. Use fewer jobs per frame

**Performance Benchmarks:**
- 256×256, 50k particles: ~1-2 seconds/frame
- 512×512, 100k particles: ~5-10 seconds/frame
- 1024×1024, 100k particles: ~20-40 seconds/frame

---

## Tips and Best Practices

### Pipeline Design

1. **Start simple:** 2-3 jobs maximum initially
2. **Test incrementally:** Add one job at a time
3. **Use templates:** Start with proven configurations
4. **Save often:** Before making major changes
5. **Document:** Add descriptive job names

### Frame Planning

1. **Allow time for effects:** Hydraulic erosion needs 20-50 frames to show
2. **Smooth transitions:** Overlap jobs by 5-10 frames for gradual changes
3. **Budget frames:** Complex effects need more frames
4. **Test ranges:** Try 10-frame test before full 100-frame simulation

### Parameter Tuning

1. **Start with templates:** Adjust from proven baselines
2. **One parameter at a time:** Isolate cause of changes
3. **Document what works:** Keep notes on good configurations
4. **Compare results:** Save before/after configurations

### Workflow Efficiency

1. **Use auto-save:** Don't worry about manual saves during edits
2. **Leverage recent list:** Quick access to working configurations
3. **Template library:** Build your own template collection
4. **Keyboard shortcuts:** (when implemented) for faster editing

---

## Advanced Techniques

### Multi-Stage Erosion

Layer multiple erosion types for realistic results:

```
Stage 1: Heavy Hydraulic (Frames 1-30)
  → Creates initial valleys and drainage

Stage 2: Thermal Collapse (Frames 31-50)
  → Stabilizes slopes, creates cliffs

Stage 3: Light Hydraulic (Frames 51-70)
  → Polishes details, smooths transitions

Stage 4: Final Thermal (Frames 71-100)
  → Final settling, natural appearance
```

### Gradual Parameter Changes

Create smooth transitions by overlapping jobs with different parameters:

```
Job 1: Frames 1-50, Erosion Rate 0.8 (aggressive)
Job 2: Frames 41-80, Erosion Rate 0.5 (moderate)
Job 3: Frames 71-100, Erosion Rate 0.3 (gentle)

Overlap zones create smooth intensity transitions
```

### Selective Erosion

Use multiple jobs on same frames for complex effects:

```
Frame Range: 1-100
Job A: Hydraulic (creates drainage)
Job B: Thermal (stabilizes slopes)
Job C: Hydraulic (adds detail)

Sequential execution creates layered, realistic terrain
```

---

## Keyboard Shortcuts (Future)

*Coming in future iteration*

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save configuration |
| `Ctrl+O` | Open/Load configuration |
| `Ctrl+N` | New job |
| `Ctrl+D` | Duplicate selected job |
| `Delete` | Delete selected job |
| `Space` | Play/Pause simulation |
| `←/→` | Previous/Next frame |

---

## Getting Help

### Resources

- **API Documentation:** `/docs/doc/JOB_SYSTEM_API.md`
- **Architecture Notes:** `/docs/plan/JOB_EXECUTION_MODEL.md`
- **Algorithm Details:** `/docs/algorithms/HYDRAULIC_EROSION.md`

### Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/lmvcruz/TerrainSim/issues)
- **Discussions:** [Ask questions and share configurations](https://github.com/lmvcruz/TerrainSim/discussions)

---

## Version History

- **v1.0.0** (2026-01-16): Initial user guide
  - Job creation and management
  - Coverage validation
  - Template system
  - Save/load workflows
  - Troubleshooting guide
