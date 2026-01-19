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
- **Reverse Proxy**: nginx (SSL termination, rate limiting)
- **Runtime**: tsx (direct TypeScript execution)
- **Deployment**: Manual trigger via GitHub Actions

### CI/CD
- **Testing**: GitHub Actions (frontend + backend + C++ tests)
- **Frontend Deploy**: Automatic (Cloudflare Pages Git integration)
- **Backend Deploy**: Manual trigger (GitHub Actions workflow)

---

## Related Documentation

- **Algorithms**: [Hydraulic Erosion](./algorithms/HYDRAULIC_EROSION.md), [Perlin Noise](./algorithms/)
- **Features**: [Job System](./JOB_SYSTEM_ARCHITECTURE.md), [API Reference](./API.md)
- **Infrastructure**: [Deployment Guide](../infra/DEPLOYMENT.md), [Testing Guide](../infra/TESTING_GUIDE.md)
- **Development**: [Local Environment](../infra/LOCAL_ENVIRONMENT_GUIDE.md), [Validation Scripts](../infra/ENVIRONMENT_VALIDATION.md)

---

**Status**: ✅ System operational in production
**Next Review**: After major architectural changes
