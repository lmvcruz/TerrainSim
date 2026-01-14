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
*   **Geometric Primitives (TerrainGenerators):**
    *   **Flat Plane:** Uniform elevation baseline for testing or as a starting point for additive generation.
    *   **Semi-Sphere (Hemisphere):** Smooth hemispherical dome using the equation $z = \sqrt{r^2 - d^2}$, useful for mountain peaks or testing terrain rendering.
    *   **Cone:** Linear slope from peak to base, ideal for volcanic formations or simple elevation features.
    *   These factory functions provide deterministic, parameterized shapes for rapid prototyping and testing.

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