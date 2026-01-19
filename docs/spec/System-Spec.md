# TerrainSim System Specification

**Version**: 1.0.0
**Last Updated**: January 19, 2026
**Status**: Production

---

## System Overview

TerrainSim is a high-performance terrain simulation and visualization system that combines C++ computational physics with modern web technologies for real-time 3D rendering. The system uses a job-based execution model to process complex terrain simulations (erosion, noise generation) and stream results to the frontend via WebSocket.

**Architecture Pattern**: Hybrid monorepo with split deployment
- **Frontend**: React SPA with Three.js/React Three Fiber (Cloudflare Pages)
- **Backend**: Node.js + Express + Socket.IO (AWS EC2)
- **Engine**: C++ native addon via Node-API (N-API)

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User's Browser                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  React Frontend (Cloudflare Pages CDN)                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │  │
│  │  │ PipelineUI   │  │ JobManager   │  │ 3D Terrain Viewer  │  │  │
│  │  │ (Timeline)   │  │ (Config)     │  │ (React Three       │  │  │
│  │  │              │  │              │  │  Fiber/WebGL)      │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬─────────────┘  │  │
│  │         │                  │                  │                 │  │
│  │         └──────────────────┴──────────────────┘                 │  │
│  │                            │                                     │  │
│  │                    Zustand State Manager                         │  │
│  └────────────────────────────┼─────────────────────────────────────┘  │
└─────────────────────────────────┼─────────────────────────────────────┘
                                  │
                    HTTP/WebSocket (Socket.IO)
                                  │
┌─────────────────────────────────┼─────────────────────────────────────┐
│              AWS EC2 (Ubuntu + nginx + PM2)                           │
│  ┌────────────────────────────┼─────────────────────────────────────┐ │
│  │      Node.js Backend       │                                     │ │
│  │  ┌───────────────────────┐ │ ┌─────────────────────────────────┐ │ │
│  │  │  Express REST API     │ │ │   Socket.IO WebSocket Server    │ │ │
│  │  │  - /health            ├─┼─┤   - progress events             │ │ │
│  │  │  - /config/*          │ │ │   - frame streaming              │ │ │
│  │  │  - /simulate/*        │ │ │   - error handling               │ │ │
│  │  └───────────┬───────────┘ │ └────────────┬────────────────────┘ │ │
│  │              │               │              │                      │ │
│  │              └───────────────┴──────────────┘                      │ │
│  │                            │                                       │ │
│  │                     Session Manager                                │ │
│  │                     (In-memory state)                              │ │
│  │                            │                                       │ │
│  │                  ┌─────────┴─────────┐                            │ │
│  │                  │  Node-API Bridge  │                            │ │
│  │                  │  (N-API bindings) │                            │ │
│  │                  └─────────┬─────────┘                            │ │
│  └────────────────────────────┼─────────────────────────────────────┘ │
│  ┌────────────────────────────┼─────────────────────────────────────┐ │
│  │    C++ Native Addon        │  (terrain_erosion_native.node)      │ │
│  │  ┌─────────────────────────▼───────────────────────────────────┐ │ │
│  │  │  Terrain Engine (C++20, CMake)                              │ │ │
│  │  │  - Heightmap data structures                                │ │ │
│  │  │  - Hydraulic erosion algorithm                              │ │ │
│  │  │  - Thermal erosion algorithm                                │ │ │
│  │  │  - Perlin noise generation (fBm)                            │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘

Data Flow:
1. User configures jobs in UI → Zustand state
2. Start simulation → HTTP POST /simulate/create
3. Backend validates → Creates session → Calls C++ engine
4. C++ computes frame-by-frame → Returns heightmap arrays
5. Backend streams results → WebSocket (binary + JSON)
6. Frontend receives frames → Updates 3D view (React Three Fiber)
```

---

## Technology Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Frontend Runtime** | React | 18.3.x | Component-based UI, virtual DOM, large ecosystem |
| **3D Rendering** | React Three Fiber | 8.18.x | Declarative Three.js, React integration |
| **Build Tool** | Vite | 6.3.x | Fast HMR, optimized production builds |
| **State Management** | Zustand | 5.0.x | Minimal boilerplate, TypeScript support |
| **UI Framework** | Tailwind CSS | 4.0.x | Utility-first, rapid prototyping |
| **Backend Runtime** | Node.js | 20.x LTS | Mature, extensive native addon support |
| **Backend Framework** | Express | 5.x | Minimalist, flexible middleware architecture |
| **Real-time Communication** | Socket.IO | 4.8.x | WebSocket with fallbacks, reconnection handling |
| **Package Manager** | pnpm | 10.27.x | Fast, disk-efficient, strict dependency resolution |
| **Computation Engine** | C++20 | GCC/MSVC | Native performance, data-oriented design |
| **Native Bindings** | Node-API (N-API) | Stable ABI | Cross-version compatibility, no rebuilds |
| **Build System** | CMake | 3.29.x | Cross-platform, flexible configuration |
| **Testing - Frontend** | Vitest | 4.0.x | Vite-native, fast execution |
| **Testing - Backend** | Jest | 29.x | Node.js standard, extensive mocking |
| **Testing - C++** | GoogleTest | 1.15.x | Industry standard, rich assertion library |

---

## Core Subsystems

### 1. Terrain Generation Pipeline

**Purpose**: Job-based execution model for multi-stage terrain processing

**Architecture**:
- **Job**: Single simulation operation (e.g., "Apply Hydraulic Erosion to frames 5-10")
- **Configuration**: Immutable job definition with algorithm type, parameters, frame range
- **Session**: Runtime execution context with temporary state

**Execution Flow**:
```
1. User creates jobs via PipelineBuilder
2. Frontend sends job configuration to backend (/simulate/create)
3. Backend creates session with initial heightmap
4. Jobs execute sequentially in frame-order
5. Each job reads previous frame, processes, outputs next frame
6. Results streamed to frontend via WebSocket
```

**Key Design Decisions**:
- **Sequential execution**: Jobs execute in creation order, not "last wins"
- **Frame-based output**: Each job produces frames within its assigned range
- **Stateless jobs**: No persistent state between executions
- **Session lifecycle**: Temporary, expires after execution or timeout

### 2. Real-time Communication

**Purpose**: Stream simulation progress and results from backend to frontend

**Protocol**: WebSocket via Socket.IO
- **Connection**: Persistent bidirectional channel
- **Messages**: JSON for metadata, binary for heightmap data (Float32Array)
- **Events**: `progress` (status updates), `frame` (heightmap), `complete` (done), `error` (failure)

**Key Design Decisions**:
- **WebSocket over HTTP polling**: Reduced latency, lower overhead
- **Binary data transfer**: Float32Array for heightmaps (no serialization cost)
- **Automatic reconnection**: Socket.IO handles network interruptions
- **Multiplexing**: Single WebSocket connection, multiple message types

### 3. Native Engine Integration

**Purpose**: High-performance terrain algorithms via C++ native addon

**Architecture**:
- **C++ Library** (`libs/core`): Terrain data structures, erosion algorithms
- **Node-API Bindings**: JavaScript-accessible wrapper functions
- **Addon Loading**: Dynamic library (`terrain_erosion_native.node`) loaded by backend

**Algorithms**:
- **Hydraulic Erosion**: Particle-based water simulation (droplet tracking)
- **Thermal Erosion**: Slope-based material transport (sediment flow)
- **Perlin Noise**: fBm-based terrain generation (multi-octave)

**Key Design Decisions**:
- **C++ over JavaScript**: 10-100x faster for numerical computations
- **Node-API over native abstractions**: ABI-stable across Node.js versions
- **Data-oriented design**: Cache-friendly memory layout for large grids
- **Platform-specific builds**: Native addon compiled on target platform

**Performance Characteristics**:
- Heightmap Creation (256²): ~6 μs
- Perlin Noise fBm (256², 4 octaves): ~7 ms
- Hydraulic Erosion (50K droplets): ~98 ms
- Linear scaling: ~2,000 ns per erosion droplet

### 4. Configuration Management

**Purpose**: Save/load job configurations for repeatable simulations

**Schema**:
```typescript
interface Configuration {
  name: string;
  jobs: Job[];
  terrain: {
    resolution: number;
    scale: number;
  };
}

interface Job {
  id: string;
  type: 'hydraulic' | 'thermal' | 'noise';
  parameters: Record<string, number>;
  startFrame: number;
  endFrame: number;
}
```

**Storage**: JSON files on backend filesystem (`presets/*.json`)
- **Save**: POST `/config/save` with configuration payload
- **Load**: GET `/config/load/:id` returns configuration JSON
- **List**: GET `/config/list` returns all saved configurations

**Key Design Decisions**:
- **JSON over binary**: Human-readable, easy debugging
- **Filesystem over database**: Simpler deployment, no DB overhead
- **Immutable configurations**: Saved configs never modified, versioned by name

---

## Design Principles

### Why Job-Based Over Single-Operation?

**Single-Operation Limitation**:
- Rigid: One algorithm per simulation run
- Non-repeatable: Manual re-execution for iterations
- No branching: Cannot compare different parameters

**Job-Based Benefits**:
- Flexible: Combine multiple algorithms in sequence
- Reproducible: Save/load exact configurations
- Iterative: Apply same operation across frame ranges
- Comparative: Create multiple job sets, compare results

### Why WebSocket Over HTTP Polling?

**HTTP Polling Problems**:
- High latency: Request/response roundtrip every poll
- Server load: Constant connection overhead
- Bandwidth waste: Headers + empty responses

**WebSocket Advantages**:
- Low latency: Server pushes data immediately
- Persistent connection: Single handshake, then bidirectional
- Efficient: Minimal framing overhead, binary support

### Why C++ Native Addon?

**JavaScript Limitation**:
- 10-100x slower for numerical loops
- No SIMD/vector instructions
- Garbage collection pauses

**C++ Benefits**:
- Native speed: Direct CPU instructions
- Data-oriented: Cache-friendly memory layout
- Zero-cost abstractions: Compile-time optimizations
- SIMD potential: Future vectorization opportunities

### Why Canvas Over DOM for Timeline?

**DOM Limitation**:
- Slow rendering: Layout reflow for many elements
- Memory overhead: Each element = object allocation
- Limited control: CSS/HTML constraints

**Canvas Benefits**:
- Direct pixel control: No DOM abstraction
- High frame rate: 60fps rendering
- Custom interactions: Full control over events

---

## Performance Characteristics

**Frontend**:
- Initial load: ~200ms (code splitting, lazy loading)
- 3D rendering: 60fps at 256² resolution (React Three Fiber + WebGL)
- Timeline rendering: 60fps for 100+ frames (HTML5 Canvas)

**Backend**:
- Health check: <10ms (`/health` endpoint)
- Session creation: <50ms (`/simulate/create`)
- Frame execution: Variable (algorithm-dependent)
  - Hydraulic erosion: ~2 μs per droplet
  - Thermal erosion: ~50ms per frame (256² grid)
  - Perlin noise: ~7ms per frame (256², 4 octaves)

**Scalability Limits**:
- Grid resolution: Tested up to 512² (memory limited)
- Frame count: Tested up to 1000 frames (execution time limited)
- Concurrent sessions: Single-threaded, sequential execution
- WebSocket connections: Tested up to 50 simultaneous clients

---

## Security & Data Flow

### Authentication
- **Current**: None (public demo)
- **Planned**: API key-based authentication for production

### Data Validation
- **Frontend**: TypeScript type checking, Zod schema validation
- **Backend**: Express middleware validation, parameter range checks
- **C++ Engine**: Bounds checking, assertion guards

### Error Handling
- **Frontend**: React Error Boundaries, user-friendly messages
- **Backend**: Express error middleware, structured logging
- **C++ Engine**: Exception handling, graceful degradation

### Data Flow
```
User Input (UI)
  ↓ (Validation)
Frontend State (Zustand)
  ↓ (HTTP POST)
Backend API (Express)
  ↓ (Validation)
C++ Engine (N-API)
  ↓ (Computation)
Backend API (Express)
  ↓ (WebSocket)
Frontend 3D View (React Three Fiber)
```

---

## Deployment Architecture

### Frontend: Cloudflare Pages
- **Build**: Vite production build (`pnpm build`)
- **Deployment**: Automatic on `git push` to `main`
- **CDN**: Global edge network, automatic SSL
- **Custom Domain**: `terrainsim.lmvcruz.work`

### Backend: AWS EC2 t3.micro
- **OS**: Ubuntu 22.04 LTS
- **Process Manager**: PM2 (auto-restart, systemd integration)
- **Reverse Proxy**: nginx (SSL termination, rate limiting, WebSocket proxy)
- **Runtime**: tsx (direct TypeScript execution, no transpilation needed)
- **Deployment**: Manual trigger via GitHub Actions (`.github/workflows/deploy-backend.yml`)
- **Custom Domain**: `api.lmvcruz.work`

### CI/CD Pipeline

**Continuous Integration** (`.github/workflows/ci.yml`):
- Triggers: Push to `main`, pull requests
- Steps:
  1. Install dependencies (`pnpm install`)
  2. Type checking (`tsc --noEmit`)
  3. Linting (`eslint`)
  4. Unit tests (Vitest + Jest)Hydraulic Erosion Model](./algorithms/HYDRAULIC_EROSION_MODEL.md)
- **Features**: [Job System](./Job-System.md), [API Reference](./API.md)
- **Infrastructure**: [Deployment Guide](../infra/DEPLOYMENT.md), [Testing Guide](../infra/TESTING_GUIDE.md), [Monitoring](../infra/MONITORING.md)
- **Development**: [Local Environment](../infra/LOCAL_ENVIRONMENT_GUIDE.md), [Environment Validation](../infra/ENVIRONMENT_VALIDATION.md)
- **Planning**: [Repository Improvement Plan](../plan/REPO_IMPROVEMENT_PLAN.md), [Backlog](../plan/Backlog
**Frontend Deployment**:
- Platform: Cloudflare Pages
- Trigger: Automatic on `git push` to `main`
- Build: `pnpm build` (Vite production build)
- Deploy: Instant global CDN propagation
- Rollback: Automatic via Cloudflare dashboard

**Backend Deployment** (`.github/workflows/deploy-backend.yml`):
- Platform: AWS EC2 via SSH
- Trigger: Manual (workflow_dispatch)
- Steps:
  1. Pre-deployment scan (security checks)
  2. SSH to EC2 instance
  3. Pull latest code (`git pull`)
  4. Install dependencies (`pnpm install`)
  5. Build C++ addon (`cmake --build`)
  6. Restart PM2 (`pm2 restart`)
  7. Health check verification
- Rollback: Manual via PM2 (`pm2 restart --update-env`)

**Load Testing** (`.github/workflows/load-test.yml`):
- Trigger: Manual (workflow_dispatch)
- Tool: k6 (stress testing, spike testing)
- Scenarios: CI scenario (3 min), stress test (10 min), spike test (5 min)
- Artifacts: Performance reports, baseline comparison

---

## Related Documentation

- **Algorithms**: [Hydraulic Erosion](./algorithms/HYDRAULIC_EROSION.md), [Perlin Noise](./algorithms/)
- **Features**: [Job System](./JOB_SYSTEM_ARCHITECTURE.md), [API Reference](./API.md)
- **Infrastructure**: [Deployment Guide](../infra/DEPLOYMENT.md), [Testing Guide](../infra/TESTING_GUIDE.md)
- **Development**: [Local Environment](../infra/LOCAL_ENVIRONMENT_GUIDE.md), [Validation Scripts](../infra/ENVIRONMENT_VALIDATION.md)

---

**Status**: ✅ System operational in production
**Next Review**: After major architectural changes
