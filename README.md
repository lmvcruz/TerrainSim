# TerrainSim

A real-time terrain simulation and visualization system built with C++ (backend) and React Three Fiber (frontend). Features GPU-accelerated terrain rendering with custom GLSL shaders and physics-based erosion simulation.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and **pnpm** 8+
- **CMake** 3.20+ (for C++ backend)
- **C++ Compiler** with C++17 support (GCC, Clang, or MSVC)

### Installation

```bash
# Clone the repository
git clone https://github.com/lmvcruz/TerrainSim.git
cd TerrainSim

# Install dependencies
pnpm install
```

### Development

#### Frontend (React + Vite + R3F)

```bash
# Run the web app in development mode
pnpm --filter @terrain/web run dev

# Run tests
pnpm --filter @terrain/web run test

# Build for production
pnpm --filter @terrain/web run build
```

The app will be available at http://localhost:5173

#### Backend (C++ Core Library)

```bash
# Configure CMake
cmake -S libs/core -B libs/core/build -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build libs/core/build --config Release

# Run tests
cd libs/core/build
ctest --output-on-failure
```

## 📦 Project Structure

```
TerrainSim/
├── apps/
│   └── web/                    # React Three Fiber frontend
│       ├── src/
│       │   ├── components/     # TerrainMesh, UI components
│       │   ├── utils/          # terrainGenerators, helpers
│       │   └── App.tsx         # Main application
│       └── vite.config.ts
├── libs/
│   └── core/                   # C++ core library
│       ├── include/            # Header files
│       │   ├── Heightmap.h     # 2D heightmap data structure
│       │   └── TerrainGenerators.h
│       ├── src/                # Implementation files
│       ├── tests/              # GoogleTest unit tests
│       └── CMakeLists.txt
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline (tests)
│       └── deploy.yml          # GitHub Pages deployment
└── docs/
    └── Iterations Planning     # Development roadmap
```

## 🌐 Deployment

### GitHub Pages

The project automatically deploys to GitHub Pages on every push to `main`:

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions

2. **Configure base path** in `.github/workflows/deploy.yml`:
   ```yaml
   env:
     BASE_PATH: /TerrainSim  # Change to your repo name
   ```

3. **Push to main branch**:
   ```bash
   git push origin main
   ```

The site will be available at: `https://lmvcruz.github.io/TerrainSim/`

### Manual Build

```bash
# Build the web app
pnpm --filter @terrain/web run build

# Output will be in apps/web/dist/
# Deploy the dist folder to any static hosting service
```

## 🎨 Features

### Current (Iteration 1)

- ✅ **GPU-Accelerated Rendering**: Custom GLSL shaders for vertex displacement
- ✅ **Heightmap Visualization**: Real-time 3D terrain from Float32Array data
- ✅ **Terrain Generators**: Semi-sphere, cone, and flat terrain functions
- ✅ **Interactive Camera**: Orbit controls for navigation
- ✅ **Monorepo Structure**: Organized workspace with pnpm
- ✅ **CI/CD Pipeline**: Automated testing and deployment

### Upcoming (Iteration 2+)

- 🔄 **Perlin Noise Generation**: Procedural terrain with configurable parameters
- 🔄 **Hydraulic Erosion**: Physics-based water erosion simulation
- 🔄 **Thermal Erosion**: Talus-angle based material slippage
- 🔄 **Material System**: Rock hardness and heterogeneous terrain behavior
- 🔄 **Performance Optimization**: SIMD, OpenMP parallelization

See [docs/Iterations Planning](./docs/Iterations%20Planning) for the complete roadmap.

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **React Three Fiber** - Declarative Three.js rendering
- **Three.js** - WebGL 3D graphics
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Vitest** - Unit testing framework

### Backend
- **C++17** - Core simulation engine
- **GoogleTest** - Unit testing framework
- **CMake** - Build system
- **Google Benchmark** - Performance profiling (planned)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run TypeScript type checking
pnpm typecheck

# Run frontend tests only
pnpm --filter @terrain/web run test

# Run backend tests only
cd libs/core/build && ctest --output-on-failure
```

### Local CI Validation

Run the complete CI pipeline locally before pushing to catch issues early:

```bash
# Quick way - Run all CI steps via pnpm
pnpm run ci

# Or use Python directly for more options:

# Run all CI steps (frontend tests, backend tests, build, deploy check)
python scripts/run-ci-locally.py

# Run specific steps (1=frontend, 2=backend, 3=build, 4=deploy)
python scripts/run-ci-locally.py --steps 1,2,3

# Skip backend tests (useful if C++ compiler not available)
python scripts/run-ci-locally.py --skip-backend

# Show detailed output
python scripts/run-ci-locally.py --verbose

# Get help
python scripts/run-ci-locally.py --help
```

**CI Steps:**
1. **Test Frontend** - TypeScript type check + Vitest tests
2. **Test Backend** - CMake + C++ build + CTest
3. **Build** - Production build of web app
4. **Deploy Check** - Verify build artifacts (dry run)

This script mimics exactly what GitHub Actions does in the CI/CD pipeline.

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct before submitting PRs.

## 📧 Contact

Lucas Cruz - [@lmvcruz](https://github.com/lmvcruz)

Project Link: [https://github.com/lmvcruz/TerrainSim](https://github.com/lmvcruz/TerrainSim)
