# Configuration Timeline

## Purpose
Visual timeline component that displays job coverage across simulation frames, enabling users to see, navigate, and validate their pipeline configuration at a glance.

## Core Concept

The Configuration Timeline translates the abstract job-based pipeline into a **visual representation**:
- **Horizontal axis:** Simulation frames (0 to totalFrames)
- **Color-coded bars:** Each job rendered as a horizontal bar spanning its frame range
- **Gaps highlighted:** Missing frame coverage shown as warnings

This solves a critical UX problem: understanding complex job configurations. Without visual feedback, users must mentally calculate frame ranges and detect gaps manually—error-prone and tedious. The timeline makes coverage **immediately obvious**.

**Why Canvas rendering?** DOM-based timelines lag with 100+ frames due to excessive element creation. Canvas renders thousands of frames at 60fps with pixel-perfect control. We sacrifice accessibility (screen readers) for performance and visual fidelity.

## UI Interactions

### Frame Navigation
- **Click timeline:** Jump to clicked frame
- **Drag playhead:** Scrub through frames interactively
- **Play button:** Animate from current frame to end (30 fps)
- **Pause button:** Stop playback at current frame
- **Frame input:** Type exact frame number (keyboard navigation)

### Visual Feedback
- **Current frame indicator:** Red vertical line (playhead)
- **Job bars:** Color-coded by erosion type
  - Blue: Hydraulic erosion
  - Orange: Thermal erosion
  - Gray: Disabled jobs (striped pattern)
- **Coverage gaps:** Red highlighted regions with warning icon
- **Hover tooltips:** Job name, frame range, parameters preview

### Timeline Controls
- **Zoom:** Mousewheel to zoom in/out (5-100% scale)
- **Pan:** Click-drag background to scroll timeline
- **Loop mode:** Checkbox to replay from start when reaching end
- **Speed control:** Slider to adjust playback speed (1-60 fps)

## State Management

### Component State (React)
```typescript
{
  currentFrame: number,        // Active frame (0 to totalFrames)
  isPlaying: boolean,          // Playback animation active
  zoomLevel: number,           // Timeline scale (0.05-1.0)
  panOffset: number,           // Horizontal scroll position
  selectedJobId: string | null // Highlighted job for editing
}
```

### Props (from PipelineContext)
```typescript
{
  totalFrames: number,   // Maximum frame count
  jobs: Job[],           // All pipeline jobs
  onFrameChange: (frame: number) => void,
  onJobClick: (jobId: string) => void
}
```

### Animation Loop
- Uses `requestAnimationFrame` for smooth 60fps rendering
- Increments currentFrame at configurable rate (default: 30 fps)
- Stops at totalFrames (or loops if loop mode enabled)
- Pauses on user interaction (click, drag)

## Edge Cases

### Empty Pipeline
- No jobs defined: Timeline shows warning "No jobs defined"
- Disable play button (nothing to simulate)
- Show "Add Job" prompt with CTA button

### Coverage Gaps
- Detect gaps using coverage validation algorithm
- Highlight gap regions in red
- Display tooltip: "Frames X-Y not covered by any enabled job"
- Prevent terrain generation until gaps resolved

### Overlapping Jobs
- Multiple jobs covering same frames: **allowed** (intentional feature)
- Render bars stacked vertically with slight offset
- Hover shows all jobs affecting hovered frame
- No conflict warnings (overlaps are valid)

### Boundary Conditions
- Frame 0: Always shows initial terrain (no jobs apply)
- CurrentFrame = totalFrames: Playback stops, loop restarts at frame 1
- Jobs extending beyond totalFrames: Truncated visually, flagged as error

### Resize Handling
- Canvas dimensions adapt to container width (responsive)
- Maintains frame proportions during window resize
- Uses ResizeObserver API for efficient updates
- Debounced redraw (50ms) to avoid excessive rendering

## Constraints

**Performance:**
- Canvas rendering: O(num_jobs) per frame
- Typical: 50 jobs rendered in <5ms
- No performance degradation up to 10,000 frames
- Animation runs at solid 60fps on mid-range hardware

**Rendering limits:**
- Maximum canvas width: 32,767 pixels (browser limit)
- With 10,000 frames: each frame = 3.2 pixels wide (barely visible)
- Practical limit: 1,000-2,000 frames for usable UI

**Browser compatibility:**
- Requires Canvas 2D API (supported everywhere)
- requestAnimationFrame for smooth animation
- ResizeObserver for responsive layout (polyfill available)

**Accessibility considerations:**
- Canvas content not screen-reader accessible
- Keyboard shortcuts provided: Space (play/pause), Arrow keys (frame navigation)
- ARIA labels on control buttons
- Consider SVG alternative for accessibility-first applications
