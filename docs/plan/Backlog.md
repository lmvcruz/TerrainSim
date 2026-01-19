# Feature Backlog

Features deferred from active iterations for future consideration. Each feature contains a clear description of what must be done and open questions.

---

## Parameter Interpolation (Smooth Transitions)

Add optional smooth parameter transitions at job boundaries. Add a `transitionFrames` property to jobs that interpolates parameter values across N frames at boundaries. For example, if Job A (frames 0-50, erosionRate=0.8) transitions to Job B (frames 51-100, erosionRate=0.2) with `transitionFrames=5`, then frames 48-52 would interpolate: 0.8 → 0.7 → 0.5 → 0.3 → 0.2.

---

## Live Editing with Re-computation

Allow users to modify job configurations during playback. The system must detect which frames are affected by changes, invalidate only those frames, and re-compute them. Add visual indicators showing which regions have been recomputed and implement dependency tracking to determine frame computation chains.

**Open Questions:**
- How to handle edits that cascade to many frames?
- Should there be a "lock" mode to prevent accidental edits?
- How to visualize "stale" vs "fresh" frames?

---

## Job Priorities & Conflict Resolution

Add priority levels for jobs when multiple jobs apply to the same frame. Add a `priority` field to jobs (1-10 scale) where highest priority wins when jobs overlap. Update UI to show priority badges/indicators and add validation warnings for priority conflicts.

---

## User-Created Job Templates

Allow users to save custom job configurations as reusable templates. Add "Save as Template" button in job creation modal, create a template library panel in UI, and implement import/export functionality for template files.

---

## Extreme Parameter Value Warnings

Add visual warnings when users configure jobs with extreme parameter values. Define thresholds for very short (<5 frames) or very long (>100 frames) job ranges, and for extreme erosion parameters (e.g., erosionRate > 0.9). Display warning icons (⚠️) in job creation modal with tooltips explaining potential issues. Allow users to proceed despite warnings (non-blocking).

**Open Questions:**
- What specific thresholds should trigger warnings?
- Should warnings be configurable or dismissible?
- Show warnings during job creation or after submission?

---

## Advanced Validation Features

Enhanced validation UI including error banners at top of PipelineLayout, tooltips showing exact uncovered frame ranges, real-time validation feedback during job creation, warning badges when overlaps are detected, and tooltips listing which jobs overlap on each frame. Add POST /config/validate API integration to compare client-side validation with server validation and display server-side warnings in UI.

---

## Branching Pipelines

Support non-linear simulation pipelines where multiple simulation paths can be explored from a single starting point. Implement tree-based pipeline structure with branch points at specific frames. Allow users to compare different branch outcomes side-by-side and merge branches with blending.

**Open Questions:**
- How to visualize tree structure in UI?
- Storage strategy for multiple branches?
- Branch merging algorithm for terrain blending?

---

## Thermal Erosion & Combined Simulation

Implement thermal erosion using talus-angle based material slippage. Create ThermalErosion class with parameters for angle of repose and material transfer logic. Add material property system with per-cell rock hardness coefficients to enable heterogeneous terrain behavior (soft valleys, hard peaks). Implement combined simulation orchestrator that allows simultaneous execution of hydraulic + thermal erosion. Add thermal erosion UI controls with method selector (Hydraulic Only, Thermal Only, Combined) and expand statistics dashboard to show sediment movement graphs and average slope calculations.

---

## Performance Optimization & Parallel Execution

Optimize simulation for high-resolution grids (512×512, 1024×1024) and multi-core CPUs. Add OpenMP parallelization to simulation loops with grid partitioning for thread distribution. Implement SIMD-optimized stencil operations (AVX/SSE) for neighbor lookups. Add adaptive LOD (Level of Detail) system using quadtree structure with distance-based resolution switching. Optimize particle allocation using object pools and improve memory access patterns for cache locality. Create performance profiler overlay UI component displaying FPS counter, CPU/GPU usage metrics, and memory consumption tracker. Implement dynamic LOD rendering in R3F for distant terrain regions. Integrate Google Benchmark scalability tests into CI pipeline for regression tracking.

**Open Questions:**
- Target performance: 1024×1024 grid at what FPS?
- Which SIMD instruction set to prioritize (SSE4.2, AVX2, AVX-512)?
- LOD switching distance thresholds?

---

## Preset Library & Export Features

Implement heightmap serialization to save/load terrains from disk in binary format. Add PNG export (grayscale heightmap) and EXR export (HDR elevation data) with /export API endpoint. Create preset configuration system using JSON schema with preset loader/validator. Build PresetLibrary UI component with thumbnails of pre-configured terrains (Canyon, Mountain, Coastal) and one-click load functionality. Add preset search/filter and user-created preset saving dialog. Implement share link generator with URL encoding of simulation parameters and clipboard copy functionality. Add custom cache headers for API responses (Cache-Control, ETag) and optimize CDN asset delivery.

**Open Questions:**
- Preset thumbnail generation: server-side or client-side?
- Maximum preset file size limit?
- Share link expiration policy?

---

## Tectonic Deformation

Implement tectonic plate simulation with uplift, folding, and fault line generation. Model plate boundaries (convergent, divergent, transform) and simulate long-term geological processes that shape terrain at macro scale.

---

## Interactive Sculpting Tools

Add real-time terrain editing with sculpting brushes: raise/lower, smooth, flatten, and noise brushes. Implement brush size/strength controls and undo/redo functionality for interactive terrain modification.

---

## Build Optimization (CI/CD)

Optimize build times for local development and CI/CD pipelines. Measure baseline build times for all workspaces (frontend, backend, C++ libs). Enable TypeScript incremental builds with `.tsbuildinfo` files. Configure GitHub Actions caching for pnpm store and CMake build artifacts. Add build time reporting to CI workflow summaries. Verify Vite HMR is properly configured for instant hot-reloading during development. Document build performance baselines and improvements in repository documentation.

**Target Metrics:**
- CI builds 30% faster with cache enabled
- Local frontend rebuilds complete in under 5 seconds
- C++ library rebuilds cached across CI runs

**Deferred Reason:** Current build times are acceptable for the team's workflow. Can be revisited if build performance becomes a bottleneck as the codebase grows.

---

## Real-World Data Import

Support importing real-world elevation data from GeoTIFF and DEM files. Implement coordinate system conversion, resampling for different resolutions, and preview functionality before import.

---

## Advanced Rendering

Upgrade visual quality with PBR (Physically Based Rendering) materials, atmospheric effects (fog, haze), dynamic shadows, and time-of-day lighting. Add camera presets and cinematic path recording.

---

## Multiplayer/Collaborative Editing

Enable real-time collaborative terrain editing with multiple users. Implement operational transformation for conflict resolution, user presence indicators, and shared simulation sessions.

**Open Questions:**
- Conflict resolution strategy for simultaneous edits?
- Maximum concurrent users per session?
- Real-time sync protocol (WebRTC, WebSocket, CRDT)?

---

## Machine Learning Integration

Integrate ML models for erosion pattern prediction and terrain generation from text prompts. Train models on simulation data to accelerate computation and enable natural language terrain creation ("create a mountainous region with deep valleys").

**Open Questions:**
- Training data requirements and collection strategy?
- Model architecture (CNN, Transformer, Diffusion)?
- On-device inference vs cloud API?
