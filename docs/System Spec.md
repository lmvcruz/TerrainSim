# System Specification: Terrain Simulation Project

**Project Name:** Terrain Simulation Engine
**Architect:** Leandro Cruz
**Version:** 1.0.0-MVP
**Status:** Initial Specification

---

## 1. Executive Summary
The Terrain Simulation Project is a high-performance system designed to simulate and visualize dynamic terrain changes (erosion, deformation, noise generation) in real-time. The system utilizes a hybrid architecture: a high-efficiency C++ core for computational physics and a modern TypeScript/React frontend for 3D visualization.

## 2. System Architecture

### 2.1 Overview
The system follows a **Monorepo** architecture to ensure tight coupling between the simulation logic and the visualization interface while maintaining strict boundary separation through technical contracts.

### 2.2 Component Breakdown
*   **`libs/core` (The Engine):** A C++20 library.
    *   **Responsibility:** Terrain data structures, physics calculations (e.g., hydraulic erosion), and heightmap generation.
    *   **Design Pattern:** Data-Oriented Design (DOD) to optimize CPU cache hits during large-scale grid traversals.
*   **`apps/web` (The Visualizer):** A React-based Single Page Application (SPA).
    *   **Responsibility:** Rendering the terrain heightmap in 3D, providing user controls for simulation parameters.
    *   **Rendering Strategy:** GPU-accelerated vertex displacement via React Three Fiber (R3F).
*   **`apps/simulation-api` (The Bridge):**
    *   **Responsibility:** Exposing the C++ engine logic via a REST or WebSocket API.
    *   **Protocol:** Preference for binary data transfer (Float32Arrays) to minimize serialization overhead between the backend and the frontend.

---

## 3. Technical Stack

### 3.1 Backend (Simulation Core)
| Component | Technology |
| :--- | :--- |
| Language | C++20 |
| Build System | CMake |
| Testing | GoogleTest (gTest) |
| Memory Management | Manual/RAII (with AddressSanitizer for safety) |
| Core Logic | Grid-based heightmap simulation |

### 3.2 Frontend (Visualization)
| Component | Technology |
| :--- | :--- |
| Framework | React 18+ (Vite) |
| Language | TypeScript 5+ |
| 3D Engine | Three.js |
| React Wrapper | React Three Fiber (R3F) |
| Testing | Vitest + Playwright (Visual Regression) |

### 3.3 Infrastructure & DevOps
| Component | Technology |
| :--- | :--- |
| Monorepo Tool | pnpm Workspaces |
| CI/CD | GitHub Actions |
| Environment | Docker (for consistent build environments) |

---

## 4. Data Specification

### 4.1 The Heightmap Model
The terrain is represented as a 2D grid of elevation values.
*   **Data Type:** 32-bit Floating Point (`float` in C++, `Float32Array` in TS).
*   **Coordinate System:** Left-handed (Y-up for 3D rendering).
*   **Format:** A flattened 1D array representing a 2D grid of size $N \times M$.

### 4.2 API Contract (Draft)
```typescript
interface TerrainFrame {
  id: string;          // Simulation step identifier
  resolution: number;  // Grid size (e.g., 256 for 256x256)
  data: Float32Array;  // Elevation values
  stats: {
    minHeight: number;
    maxHeight: number;
    iterationTime: number; // ms
  };
}
```

---

## 5. Performance & Computational Efficiency
The backend simulation is designed to be fully parameterized, allowing for variable grid resolutions and interchangeable simulation algorithms. Performance is defined by the system's ability to maximize hardware throughput regardless of the chosen parameters.

*   **Algorithmic Efficiency:**
    *   **Linear Scaling:** Simulation methods (erosion, noise, deformation) must aim for $O(N)$ complexity, where $N$ is the total number of grid cells, to ensure predictable scaling as resolution increases.
    *   **Spatial Partitioning:** For neighborhood-dependent calculations (like thermal erosion), the system must use optimized stencil operations to minimize redundant lookups.

*   **Data-Oriented Optimization (DOD):**
    *   **Cache Locality:** Grid data must be stored in contiguous memory blocks (Row-Major Order) to ensure the CPU pre-fetcher can effectively utilize L1/L2 caches during traversal.
    *   **SIMD Vectorization:** The core simulation loops must be written to facilitate Auto-Vectorization (AVX/SSE) by avoiding branching logic within the hot path, ensuring "optimal" cycles-per-cell.

*   **Parameter-Relative Targets:**
    *   **Latency Budget:** For real-time interaction, the "Optimal Step Time" ($T$) is defined as:
        $$T < \frac{Budget}{Steps \times Resolution^2}$$
        where $Budget$ is the frame time (e.g., 16ms), allowing the user to trade off grid resolution for simulation complexity.
    *   **Throughput:** In "Headless/Batch" mode, the engine must saturate available CPU threads using parallel execution (OpenMP or Task-based parallelism) to maximize total simulated years per second.

*   **Performance Benchmarking (TDD Integration):**
    *   Every simulation algorithm must include a **Google Benchmark** suite.
    *   The CI/CD pipeline will track "Cycles Per Cell" as a KPI to detect regressions when new parameters or simulation logic are introduced.
---

## 6. Simulation Methods (Hybrid Practical Approach)

The simulation workflow is divided into three distinct stages, each with specific responsibilities and technical considerations. This separation enables clear boundaries between terrain initialization, parameter configuration, and the active simulation runtime.

### 6.1 Pre-Modeling Stage

The pre-modeling stage establishes the initial terrain state before any dynamic simulation occurs. This stage combines procedural generation, data import, and manual sculpting capabilities.

#### 6.1.1 Terrain Generation Methods
*   **Procedural Noise Functions:**
    *   **Perlin Noise:** Classic gradient-based noise for smooth, natural-looking terrain.
    *   **Simplex Noise:** Improved variant with lower computational cost and fewer directional artifacts.
    *   **Worley Noise (Cellular):** For creating distinct features like craters or cellular patterns.
    *   **Fractional Brownian Motion (fBm):** Layered octaves of noise to achieve multi-scale detail (mountains, hills, ridges).

*   **Import from External Sources:**
    *   **Heightmap Images:** Load grayscale PNG/EXR files where pixel intensity maps to elevation.
    *   **GeoTIFF/DEM Data:** Import real-world elevation data for terrain reconstruction.
    *   **Procedural Presets:** Pre-configured seed values and parameters for specific terrain types (canyon, volcanic, coastal).

*   **Manual Sculpting Tools (Future Enhancement):**
    *   Interactive brush tools for user-driven heightmap editing.
    *   Raise/lower, smooth, flatten operations for artistic control.

#### 6.1.2 Initial Processing Pipeline
1.  **Seed-Based Generation:** Initialize heightmap using configured noise algorithms with deterministic seeds.
2.  **Normalization:** Scale elevation values to fit within defined min/max bounds.
3.  **Baseline Filtering:** Apply optional Gaussian blur or median filters to remove artifacts.
4.  **Validation:** Ensure grid resolution matches system constraints and memory limits.

**Output:** A static heightmap ready for simulation configuration.

---

### 6.2 Simulation Configuration Stage

This stage bridges the pre-modeled terrain and the active simulation runtime. It focuses on parameter setup, validation, and pre-processing optimization.

#### 6.2.1 Parameter Configuration (UI-Driven)
The configuration interface exposes all tunable simulation parameters, organized by physical model:

*   **Hydraulic Erosion Parameters:**
    *   Rain intensity, evaporation rate, sediment capacity, deposition/erosion coefficients.
    *   Particle count (for particle-based simulations) or grid resolution (for velocity-field methods).

*   **Thermal Erosion Parameters:**
    *   Talus angle (angle of repose), material transfer rate, rock hardness coefficient.

*   **Tectonic Deformation:**
    *   Uplift rate, folding intensity, fault line placement (future).

*   **Temporal Configuration:**
    *   Time step size ($\Delta t$), total simulation duration, iteration count.
    *   Real-time mode (interactive) vs. batch mode (offline processing).

*   **Performance Trade-offs:**
    *   Grid resolution (LOD selection), thread count, SIMD optimization toggles.

#### 6.2.2 Pre-Processing Operations
Before entering the simulation loop, the system performs optimization passes:

1.  **Gradient Pre-Computation:**
    *   Calculate terrain slope and normal vectors for every grid cell.
    *   Store in auxiliary buffers to avoid redundant calculations during simulation.

2.  **Flow Direction Analysis (for Hydraulic Erosion):**
    *   Compute water flow direction using steepest-descent or multi-flow algorithms.
    *   Pre-build drainage networks to optimize sediment transport calculations.

3.  **Material Property Mapping:**
    *   Assign rock hardness, soil cohesion, or other material properties per grid cell.
    *   Enable heterogeneous terrain behavior (e.g., soft soil vs. hard bedrock).

4.  **Memory Layout Optimization:**
    *   Reorganize data structures for cache-friendly access patterns.
    *   Allocate scratch buffers for temporary simulation state.

**Output:** A fully parameterized simulation ready for execution, with pre-computed data structures to maximize runtime performance.

---

### 6.3 Simulation Execution Stage

This is the active runtime where the configured simulation parameters drive the evolution of the terrain over time.

#### 6.3.1 Simulation Method Categories

*   **Procedural vs. Physics-Based:**
    *   **Procedural:** Fast, artist-controlled methods (noise layering, filter-based erosion).
    *   **Physics-Based:** Scientifically accurate models (Navier-Stokes for water, momentum transfer for sediment).

*   **Grid-Based vs. Particle-Based:**
    *   **Grid-Based:** Operate on fixed heightmap cells (faster, predictable memory).
    *   **Particle-Based:** Simulate discrete water droplets or sediment particles (higher fidelity, variable performance).

*   **Real-Time vs. Offline:**
    *   **Real-Time:** Interactive simulations with frame-rate constraints (60 FPS target).
    *   **Offline:** High-resolution, multi-hour simulations for cinematic results.

#### 6.3.2 Core Simulation Loop
The execution follows a fixed update loop, typically structured as:

```cpp
while (simulation.isRunning()) {
    // 1. Update physical state
    erosion.applyHydraulicStep(heightmap, deltaTime);
    erosion.applyThermalStep(heightmap, deltaTime);

    // 2. Apply user interactions (if real-time)
    if (realTimeMode) {
        handleUserInput(heightmap);
    }

    // 3. Enforce boundary conditions
    heightmap.clampValues(minHeight, maxHeight);

    // 4. Increment simulation time
    simulation.advance(deltaTime);

    // 5. Emit frame to frontend (if visualization enabled)
    if (frameCounter % renderInterval == 0) {
        api.sendTerrainFrame(heightmap.toFloat32Array());
    }
}
```

#### 6.3.3 Algorithm Selection and Fallback Strategies

*   **Adaptive LOD (Level of Detail):**
    *   Dynamically reduce grid resolution for distant terrain regions.
    *   Use hierarchical grids (quadtree/octree) for multi-resolution simulation.

*   **Approximation Modes:**
    *   Switch from full physics simulation to simplified heuristics when performance drops below target FPS.
    *   Example: Replace particle-based water with simplified heightmap-based flow.

*   **Parallel Execution:**
    *   Distribute grid cells across CPU threads using OpenMP or custom task schedulers.
    *   Minimize thread contention by partitioning the grid into independent blocks.

#### 6.3.4 Output and Checkpointing
*   **Live Streaming:** Send terrain frames to the frontend at configurable intervals (e.g., every 10 simulation steps).
*   **Snapshot Export:** Save heightmap state to disk for later resumption or analysis.
*   **Statistics Tracking:** Log min/max elevations, total sediment moved, iteration times.

**Output:** A continuously evolving terrain heightmap streamed to the visualization layer or saved for post-processing.

---

## 7. User Interface Elements

The frontend provides an intuitive interface for configuring simulations, visualizing results, and interacting with the terrain in real-time.

### 7.1 Core UI Components

#### 7.1.1 3D Viewport (Primary Display)
*   **Rendering Engine:** React Three Fiber (R3F) with Three.js backend.
*   **Camera Controls:**
    *   Orbit controls (rotate, pan, zoom) for scene navigation.
    *   First-person mode for immersive terrain exploration.
*   **Terrain Mesh:**
    *   Vertex displacement shader driven by heightmap texture.
    *   Dynamic LOD to maintain performance with high-resolution terrains.
*   **Visual Enhancements:**
    *   Wireframe toggle for debugging grid structure.
    *   Color gradients or texture mapping based on elevation/slope.
    *   Real-time shadows and ambient occlusion for depth perception.

#### 7.1.2 Parameter Control Panel
A collapsible side panel organized by simulation stage:

*   **Pre-Modeling Tab:**
    *   Noise type selector (Perlin, Simplex, Worley).
    *   Seed input field for reproducible generation.
    *   Octave count, frequency, amplitude sliders for fBm configuration.
    *   "Generate" button to create initial heightmap.

*   **Configuration Tab:**
    *   Erosion type selector (Hydraulic, Thermal, Combined).
    *   Sliders for physical parameters (rain intensity, sediment capacity, etc.).
    *   Time step and duration inputs.
    *   "Apply Configuration" button to validate and prepare simulation.

*   **Playback Tab:**
    *   Play/Pause/Stop controls for simulation execution.
    *   Speed multiplier (1x, 2x, 5x, 10x) for time-lapse mode.
    *   Step-forward button for manual frame-by-frame advancement.
    *   "Export Heightmap" button to save current state.

#### 7.1.3 Statistics Dashboard
A compact overlay displaying real-time metrics:

*   **Terrain Info:** Current min/max elevation, average slope, total grid cells.
*   **Performance Metrics:** Frame rate (FPS), simulation iteration time (ms), CPU usage.
*   **Simulation Progress:** Elapsed simulation time, current iteration, estimated time remaining.

#### 7.1.4 Preset Library
A gallery of pre-configured scenarios:

*   **Templates:** Canyon, Mountain Range, Coastal Plain, Volcanic Island.
*   **Thumbnail Previews:** Small 3D renders of each preset.
*   **One-Click Load:** Apply preset parameters and generate terrain instantly.

### 7.2 Interaction Modes

#### 7.2.1 Observation Mode (Default)
*   User can only view and navigate the terrain.
*   All simulation parameters are locked until explicitly entering edit mode.

#### 7.2.2 Edit Mode
*   Unlock parameter controls for real-time adjustments.
*   Changes trigger re-configuration and simulation restart.

#### 7.2.3 Interactive Sculpting Mode (Future Enhancement)
*   Direct terrain manipulation using mouse/stylus input.
*   Brush tools for raising, lowering, smoothing terrain regions.
*   Undo/redo stack for non-destructive editing.

### 7.3 Responsive Design Considerations

*   **Desktop (Primary Target):**
    *   Full-featured interface with side panels, toolbars, and dual-monitor support.

*   **Tablet:**
    *   Touch-optimized controls with gesture support (pinch-to-zoom, two-finger pan).
    *   Simplified parameter panel with modal overlays.

*   **Mobile (View-Only Mode):**
    *   Minimal UI showing only 3D viewport and basic playback controls.
    *   Parameter editing disabled; mobile users can view shared simulation links.

### 7.4 Accessibility Features

*   **Keyboard Shortcuts:** Full keyboard navigation for power users (e.g., `Space` to play/pause, `R` to reset).
*   **Screen Reader Support:** ARIA labels for all interactive controls.
*   **High Contrast Mode:** Alternative color schemes for visually impaired users.
*   **Adjustable Font Sizes:** Scalable UI text for readability.

---

## 8. Implementation Roadmap (Iterative Development)

The project follows an iterative development model, with each iteration delivering a functional, testable increment that builds upon the previous iteration. This approach ensures continuous integration, early feedback, and incremental complexity growth.

---

### **Iteration 1: Foundation & Basic Visualization**
**Goal:** Establish the core infrastructure and render a simple, static heightmap.

**Backend Deliverables:**
*   Set up Monorepo structure with pnpm workspaces.
*   Configure CI/CD pipeline (GitHub Actions) with basic linting and test runners.
*   Implement a simple `Heightmap` class in C++ (`libs/core`):
    *   Fixed-size 2D grid (e.g., 256×256).
    *   Function based initialiation: all values out of a circle of ray 100px are set to 0.0, and those inside of the circle be the semi-sphere with center in 128,128 px.
    *   No parameters or procedural generation yet.
    *   Basic getters/setters for grid access.
*   Write initial GoogleTest suite for `Heightmap` class (boundary checks, memory layout).

**Frontend Deliverables:**
*   Set up React + Vite + TypeScript project (`apps/web`).
*   Implement basic R3F terrain component:
    *   Plane geometry with vertex displacement shader.
    *   Load heightmap data from a static Float32Array.
    *   Simple grayscale or single-color material.
*   Add orbit controls for camera navigation.
*   Display a flat or manually defined heightmap (e.g., a pyramid or ramp).

**Integration:**
*   No API yet; frontend uses hardcoded heightmap data for testing.

**Tasks:**
- [x] **INFRA-001:** Initialize pnpm-workspace.yaml and root package.json
- [x] **INFRA-002:** Set up GitHub Actions workflow (build + test jobs)
- [x] **INFRA-003:** Configure linting tools (ESLint for TS, clang-format for C++)
- [x] **CORE-001:** Create Heightmap class with 2D grid storage (Row-Major Order)
- [ ] **CORE-002:** Implement semi-sphere initialization function
- [ ] **CORE-003:** Add getter/setter methods (at(), set(), width(), height())
- [ ] **CORE-004:** Write GoogleTest suite (10+ test cases)
- [x] **CORE-005:** Add CMakeLists.txt with GoogleTest integration
- [x] **WEB-001:** Scaffold React + Vite + TypeScript app (apps/web)
- [x] **WEB-002:** Install Three.js and React Three Fiber dependencies
- [ ] **WEB-003:** Create TerrainMesh component with PlaneGeometry
- [ ] **WEB-004:** Implement vertex displacement shader (basic GLSL)
- [x] **WEB-005:** Add OrbitControls for camera navigation
- [ ] **WEB-006:** Load hardcoded Float32Array heightmap data
- [ ] **WEB-007:** Apply simple material (MeshStandardMaterial)
- [x] **TEST-001:** Verify CI pipeline passes all checks
- [ ] **TEST-002:** Manual test: Render semi-sphere in 3D viewport
- [ ] **DOC-001:** Update README with build and run instructions

**Success Criteria:**
*   CI pipeline runs successfully (build + tests pass).
*   3D viewport renders a simple terrain mesh.
*   User can rotate, pan, and zoom the camera.

---

### **Iteration 2: Procedural Noise Generation**
**Goal:** Add parameterized noise functions for terrain generation.

**Backend Deliverables:**
*   Implement Perlin Noise algorithm in `libs/core`:
    *   Configurable parameters: seed, frequency, amplitude.
    *   Pure function: `generatePerlinNoise(width, height, seed, frequency, amplitude) -> Heightmap`.
*   Add unit tests for noise generation (deterministic output, value ranges).
*   Implement Fractional Brownian Motion (fBm):
    *   Layered octaves of Perlin noise.
    *   Parameters: octave count, persistence, lacunarity.

**Frontend Deliverables:**
*   Add UI controls for noise generation:
    *   Seed input field.
    *   Sliders for frequency, amplitude, octaves.
    *   "Generate" button to trigger terrain creation.
*   Improve visualization:
    *   Color gradient based on elevation (low = blue, mid = green, high = white).
    *   Wireframe toggle for debugging.
*   Add basic statistics display (min/max elevation).

**Integration:**
*   Create a simple local API endpoint (e.g., HTTP server or direct WASM binding) to call C++ noise functions from the frontend.
*   Frontend sends parameters and receives heightmap as Float32Array.

**Tasks:**
- [ ] **CORE-006:** Implement Perlin Noise gradient generation
- [ ] **CORE-007:** Add interpolation functions (smoothstep, lerp)
- [ ] **CORE-008:** Create generatePerlinNoise() function
- [ ] **CORE-009:** Write unit tests for noise determinism
- [ ] **CORE-010:** Implement fBm with octave layering
- [ ] **CORE-011:** Add parameter validation (range checks)
- [ ] **API-001:** Set up simple HTTP server (Express.js or Crow C++)
- [ ] **API-002:** Create /generate endpoint accepting noise parameters
- [ ] **API-003:** Serialize Heightmap to Float32Array in response
- [ ] **API-004:** Add CORS support for local development
- [ ] **WEB-008:** Create NoiseParametersPanel UI component
- [ ] **WEB-009:** Add seed input field with validation
- [ ] **WEB-010:** Implement sliders (frequency, amplitude, octaves)
- [ ] **WEB-011:** Wire "Generate" button to API call
- [ ] **WEB-012:** Implement elevation-based color gradient shader
- [ ] **WEB-013:** Add wireframe toggle button
- [ ] **WEB-014:** Create StatisticsPanel component (min/max elevation)
- [ ] **WEB-015:** Handle loading states and error messages
- [ ] **TEST-003:** Verify same seed produces identical terrain
- [ ] **TEST-004:** Test different parameter combinations
- [ ] **DOC-002:** Document API endpoints and parameters

**Success Criteria:**
*   User can generate varied terrains by adjusting noise parameters.
*   Different seeds produce reproducible but distinct terrains.
*   Color-coded elevation provides visual feedback.

---

### **Iteration 3: Hydraulic Erosion Simulation**
**Goal:** Implement physics-based hydraulic erosion as the first dynamic simulation method.

**Backend Deliverables:**
*   Implement a particle-based hydraulic erosion algorithm:
    *   Simulate water droplets traversing the terrain.
    *   Sediment pickup, transport, and deposition based on slope and velocity.
    *   Configurable parameters: rain intensity, erosion rate, deposition rate, particle count.
*   Add simulation loop:
    *   Iterate erosion over multiple steps.
    *   Return intermediate heightmaps for animation.
*   Write performance benchmarks (cycles-per-cell, total iteration time).

**Frontend Deliverables:**
*   Add erosion parameter controls:
    *   Sliders for rain intensity, erosion rate, sediment capacity.
    *   Time step and iteration count inputs.
*   Implement playback controls:
    *   Play/Pause/Stop buttons.
    *   Speed multiplier for time-lapse viewing.
*   Real-time terrain updates:
    *   Receive heightmap frames from backend at regular intervals.
    *   Smooth transitions between frames (optional interpolation).

**Integration:**
*   Extend API to support streaming simulation frames (WebSocket or Server-Sent Events).
*   Backend sends `TerrainFrame` objects (heightmap + metadata) to frontend.

**Tasks:**
- [ ] **CORE-012:** Implement WaterParticle class (position, velocity, sediment)
- [ ] **CORE-013:** Add gradient calculation for Heightmap (slope, normal vectors)
- [ ] **CORE-014:** Implement particle movement logic (steepest descent)
- [ ] **CORE-015:** Add sediment pickup calculation (erosion rate × slope)
- [ ] **CORE-016:** Implement deposition logic (sediment capacity threshold)
- [ ] **CORE-017:** Create HydraulicErosion class with configurable parameters
- [ ] **CORE-018:** Implement simulation loop (multi-step iteration)
- [ ] **CORE-019:** Add frame snapshot functionality (save intermediate states)
- [ ] **CORE-020:** Write GoogleTest suite for erosion logic
- [ ] **CORE-021:** Set up Google Benchmark for performance tracking
- [ ] **CORE-022:** Add benchmark tests (cycles-per-cell, throughput)
- [ ] **API-005:** Upgrade to WebSocket server (Socket.io or native WebSockets)
- [ ] **API-006:** Create /simulate endpoint (accept erosion parameters)
- [ ] **API-007:** Implement frame streaming (send TerrainFrame objects)
- [ ] **API-008:** Add simulation control messages (start/stop/pause)
- [ ] **WEB-016:** Create ErosionParametersPanel UI component
- [ ] **WEB-017:** Add sliders (rain intensity, erosion rate, sediment capacity)
- [ ] **WEB-018:** Implement PlaybackControls component (Play/Pause/Stop)
- [ ] **WEB-019:** Add speed multiplier selector (1x, 2x, 5x, 10x)
- [ ] **WEB-020:** Set up WebSocket client connection
- [ ] **WEB-021:** Handle incoming TerrainFrame messages
- [ ] **WEB-022:** Update terrain mesh with new heightmap data
- [ ] **WEB-023:** Add frame interpolation for smooth transitions
- [ ] **WEB-024:** Display simulation progress (iteration count, elapsed time)
- [ ] **WEB-025:** Add error handling for connection failures
- [ ] **TEST-005:** Verify erosion produces realistic valley formation
- [ ] **TEST-006:** Test parameter edge cases (zero erosion rate, max particles)
- [ ] **TEST-007:** Performance test: 256×256 grid at 30+ FPS
- [ ] **DOC-003:** Document hydraulic erosion algorithm and parameters

**Success Criteria:**
*   User can start/stop erosion simulation with configurable parameters.
*   Terrain visibly evolves over time (valleys form, peaks erode).
*   Simulation runs at acceptable frame rates (target: 30+ FPS for 256×256 grid).

---

### **Iteration 4: Thermal Erosion & Combined Simulation**
**Goal:** Add thermal erosion and enable multi-method simulations.

**Backend Deliverables:**
*   Implement thermal erosion (talus-angle based material slippage).
*   Allow simultaneous execution of hydraulic + thermal erosion.
*   Add material property system:
    *   Per-cell rock hardness coefficient.
    *   Heterogeneous terrain behavior (e.g., soft valleys, hard peaks).

**Frontend Deliverables:**
*   Add thermal erosion controls to UI.
*   Multi-method selector (Hydraulic Only, Thermal Only, Combined).
*   Improved statistics dashboard:
    *   Total sediment moved, average slope, erosion rate graph.

**Tasks:**
- [ ] **CORE-023:** Implement talus angle calculation (angle of repose)
- [ ] **CORE-024:** Add material transfer logic (neighbor height difference)
- [ ] **CORE-025:** Create ThermalErosion class with parameters
- [ ] **CORE-026:** Implement combined simulation orchestrator
- [ ] **CORE-027:** Add MaterialProperties layer to Heightmap
- [ ] **CORE-028:** Implement rock hardness coefficient system
- [ ] **CORE-029:** Write unit tests for thermal erosion
- [ ] **CORE-030:** Add integration tests (hydraulic + thermal combined)
- [ ] **CORE-031:** Benchmark thermal erosion performance
- [ ] **WEB-026:** Create ThermalErosionPanel UI component
- [ ] **WEB-027:** Add simulation method selector (radio buttons/dropdown)
- [ ] **WEB-028:** Implement talus angle slider
- [ ] **WEB-029:** Add material transfer rate control
- [ ] **WEB-030:** Expand StatisticsPanel with new metrics
- [ ] **WEB-031:** Add sediment movement graph (real-time chart)
- [ ] **WEB-032:** Display average slope calculation
- [ ] **API-009:** Extend /simulate endpoint for combined simulations
- [ ] **API-010:** Add material properties in TerrainFrame payload
- [ ] **TEST-008:** Verify thermal erosion smooths sharp peaks
- [ ] **TEST-009:** Test combined simulation produces realistic results
- [ ] **DOC-004:** Document thermal erosion algorithm

**Success Criteria:**
*   Both erosion methods work independently and in combination.
*   User can observe realistic terrain aging (sharp peaks → rounded hills).

---

### **Iteration 5: Performance Optimization & Parallel Execution**
**Goal:** Optimize simulation for high-resolution grids and multi-core CPUs.

**Backend Deliverables:**
*   Add OpenMP parallelization to simulation loops.
*   Implement SIMD-optimized stencil operations for neighbor lookups.
*   Add adaptive LOD (Level of Detail) system for large grids.
*   Integrate Google Benchmark into CI pipeline for regression tracking.

**Frontend Deliverables:**
*   Support for high-resolution terrains (512×512, 1024×1024).
*   Dynamic LOD rendering in R3F (lower detail for distant regions).
*   Performance profiler overlay (FPS, CPU usage, memory consumption).

**Tasks:**
- [ ] **CORE-032:** Add OpenMP pragmas to main simulation loops
- [ ] **CORE-033:** Implement grid partitioning for thread distribution
- [ ] **CORE-034:** Add SIMD intrinsics for height calculations (AVX/SSE)
- [ ] **CORE-035:** Optimize memory access patterns (cache locality)
- [ ] **CORE-036:** Implement quadtree LOD structure
- [ ] **CORE-037:** Add distance-based resolution switching
- [ ] **CORE-038:** Write scalability benchmarks (1-16 threads)
- [ ] **CORE-039:** Add benchmark regression checks to CI
- [ ] **CORE-040:** Profile with Valgrind/perf for hotspot identification
- [ ] **CORE-041:** Optimize particle allocation (object pools)
- [ ] **WEB-033:** Add resolution selector (256, 512, 1024)
- [ ] **WEB-034:** Implement R3F LOD components
- [ ] **WEB-035:** Add distance culling for far terrain chunks
- [ ] **WEB-036:** Create PerformanceProfiler overlay component
- [ ] **WEB-037:** Display FPS counter (real-time)
- [ ] **WEB-038:** Add CPU/GPU usage metrics (if available)
- [ ] **WEB-039:** Show memory consumption tracker
- [ ] **WEB-040:** Implement performance graph (historical data)
- [ ] **TEST-010:** Verify linear scaling with thread count (1-8 cores)
- [ ] **TEST-011:** Test 1024×1024 grid at 15+ FPS
- [ ] **TEST-012:** Validate SIMD calculations match scalar results
- [ ] **DOC-005:** Document performance tuning guidelines

**Success Criteria:**
*   Simulation achieves near-linear scaling with thread count.
*   1024×1024 grid runs at interactive frame rates (15+ FPS).
*   No performance regressions detected in CI benchmarks.

---

### **Iteration 6: Preset Library & Export Features**
**Goal:** Add user convenience features for saving, loading, and sharing terrains.

**Backend Deliverables:**
*   Implement heightmap serialization (save/load from disk).
*   Add preset configuration system (JSON-based parameter templates).

**Frontend Deliverables:**
*   Preset library UI:
    *   Thumbnails of pre-configured terrains (Canyon, Mountain, Coastal).
    *   One-click load functionality.
*   Export features:
    *   Download heightmap as PNG/EXR.
    *   Export simulation parameters as JSON.
    *   Share link generation (URL-encoded parameters).

**Tasks:**
- [ ] **CORE-042:** Implement Heightmap serialization to binary format
- [ ] **CORE-043:** Add PNG export (heightmap as grayscale image)
- [ ] **CORE-044:** Implement EXR export (HDR elevation data)
- [ ] **CORE-045:** Create JSON schema for preset configurations
- [ ] **CORE-046:** Add preset loader/validator
- [ ] **CORE-047:** Write unit tests for serialization
- [ ] **API-011:** Create /export endpoint (supports PNG/EXR/JSON)
- [ ] **API-012:** Add /presets endpoint (list available presets)
- [ ] **API-013:** Implement /load-preset endpoint
- [ ] **WEB-041:** Create PresetLibrary UI component
- [ ] **WEB-042:** Design preset cards with thumbnails
- [ ] **WEB-043:** Add preset search/filter functionality
- [ ] **WEB-044:** Implement one-click load button
- [ ] **WEB-045:** Create ExportPanel UI component
- [ ] **WEB-046:** Add format selector (PNG/EXR/JSON)
- [ ] **WEB-047:** Implement download functionality
- [ ] **WEB-048:** Add share link generator (URL encoding)
- [ ] **WEB-049:** Implement clipboard copy for share links
- [ ] **WEB-050:** Add preset saving dialog (user-created presets)
- [ ] **TEST-013:** Verify exported heightmaps load correctly in Blender
- [ ] **TEST-014:** Test JSON parameter round-trip (save → load)
- [ ] **TEST-015:** Validate share links restore exact simulation state
- [ ] **DOC-006:** Document export formats and preset structure

**Success Criteria:**
*   User can save and restore simulation sessions.
*   Presets provide quick-start templates for experimentation.
*   Exported heightmaps are compatible with external 3D tools (Blender, Unity).
    *   Heterogeneous terrain behavior (e.g., soft valleys, hard peaks).

**Frontend Deliverables:**
*   Add thermal erosion controls to UI.
*   Multi-method selector (Hydraulic Only, Thermal Only, Combined).
*   Improved statistics dashboard:
    *   Total sediment moved, average slope, erosion rate graph.

**Success Criteria:**
*   Both erosion methods work independently and in combination.
*   User can observe realistic terrain aging (sharp peaks → rounded hills).

---

### **Iteration 5: Performance Optimization & Parallel Execution**
**Goal:** Optimize simulation for high-resolution grids and multi-core CPUs.

**Backend Deliverables:**
*   Add OpenMP parallelization to simulation loops.
*   Implement SIMD-optimized stencil operations for neighbor lookups.
*   Add adaptive LOD (Level of Detail) system for large grids.
*   Integrate Google Benchmark into CI pipeline for regression tracking.

**Frontend Deliverables:**
*   Support for high-resolution terrains (512×512, 1024×1024).
*   Dynamic LOD rendering in R3F (lower detail for distant regions).
*   Performance profiler overlay (FPS, CPU usage, memory consumption).

**Success Criteria:**
*   Simulation achieves near-linear scaling with thread count.
*   1024×1024 grid runs at interactive frame rates (15+ FPS).
*   No performance regressions detected in CI benchmarks.

---

### **Iteration 6: Preset Library & Export Features**
**Goal:** Add user convenience features for saving, loading, and sharing terrains.

**Backend Deliverables:**
*   Implement heightmap serialization (save/load from disk).
*   Add preset configuration system (JSON-based parameter templates).

**Frontend Deliverables:**
*   Preset library UI:
    *   Thumbnails of pre-configured terrains (Canyon, Mountain, Coastal).
    *   One-click load functionality.
*   Export features:
    *   Download heightmap as PNG/EXR.
    *   Export simulation parameters as JSON.
    *   Share link generation (URL-encoded parameters).

**Success Criteria:**
*   User can save and restore simulation sessions.
*   Presets provide quick-start templates for experimentation.
*   Exported heightmaps are compatible with external 3D tools (Blender, Unity).

---

### **Future Iterations (Roadmap Extensions)**

*   **Iteration 7:** Tectonic deformation (uplift, folding, fault lines).
*   **Iteration 8:** Interactive sculpting tools (raise/lower, smooth, flatten brushes).
*   **Iteration 9:** Real-world data import (GeoTIFF, DEM files).
*   **Iteration 10:** Advanced rendering (PBR materials, atmospheric effects, shadows).
*   **Iteration 11:** Multiplayer/collaborative editing (real-time shared simulations).
*   **Iteration 12:** Machine learning integration (erosion pattern prediction, terrain generation from text prompts).

---

**Iteration Principles:**
*   Each iteration is fully tested and deployable.
*   CI/CD pipeline validates all changes before merging.
*   User feedback informs priority adjustments between iterations.
*   Technical debt is addressed incrementally (no "big bang" refactors).