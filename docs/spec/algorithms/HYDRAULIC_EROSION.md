# Hydraulic Erosion Algorithm

## Overview

The hydraulic erosion system simulates realistic terrain weathering through water droplet physics. Each water droplet follows the terrain's natural slopes, eroding material from higher elevations and depositing sediment in lower areas, creating valleys, gullies, and realistic drainage patterns.

## Algorithm Flow

### 1. Particle Initialization
Each water droplet starts at a random position on the heightmap with:
- **Position** (x, y): Random spawn location
- **Velocity** (vx, vy): Initial movement vector (typically derived from `initialSpeed` parameter)
- **Water Volume**: Initial amount of water (`initialWaterVolume` parameter)
- **Sediment**: Starts at 0 (droplet has no sediment initially)
- **Lifetime**: Constrained by `maxDropletLifetime` iterations

### 2. Iteration Loop
For each timestep (up to `maxDropletLifetime`):

#### A. Calculate Gradient
- Sample heightmap at particle's current position using bilinear interpolation
- Compute terrain gradient: `∇h = (∂h/∂x, ∂h/∂y)`
- Gradient points in the direction of steepest ascent

#### B. Update Velocity
The particle's new velocity is a blend of:
- **Previous direction** (inertia): Maintains momentum
- **Gradient direction**: Follows steepest descent (negative gradient)

```
newDir = normalize(inertia * velocity + (1 - inertia) * (-gradient))
velocity = newDir * speed
```

Where:
- `inertia` ∈ [0, 0.5]: Higher values = smoother, more natural water flow
- `speed` increases with gravity: `speed += gravity * gradientMagnitude * deltaTime`

#### C. Update Position
Move particle in the direction of velocity:
```
position = position + velocity * deltaTime
```

#### D. Calculate Sediment Capacity
The maximum sediment a droplet can carry depends on:
- **Slope**: Steeper slopes = higher capacity
- **Speed**: Faster droplets carry more sediment
- **Water volume**: More water = more carrying capacity

```
sedimentCapacity = max(
    minSedimentCapacity,
    -gradientMagnitude * speed * waterVolume * sedimentCapacityFactor
)
```

#### E. Erosion/Deposition
Compare current sediment to capacity:

**If sediment < capacity (Erosion):**
- Droplet picks up material from terrain
- Amount eroded: `erodeAmount = min(erodeSpeed * (capacity - sediment), heightDifference)`
- Heightmap is lowered at particle position
- Sediment increases

**If sediment > capacity (Deposition):**
- Droplet deposits excess sediment
- Amount deposited: `depositAmount = depositSpeed * (sediment - capacity)`
- Heightmap is raised at particle position
- Sediment decreases

#### F. Evaporation
Water volume decreases over time:
```
waterVolume *= (1 - evaporateSpeed)
```

When water volume drops too low, the particle stops (no more erosive power).

#### G. Boundary Checks
- If particle exits heightmap bounds, stop simulation
- If water volume drops below threshold, stop simulation
- If lifetime expires, stop simulation

### 3. Terrain Modification
Height changes are distributed across the 4 neighboring grid cells using bilinear interpolation weights, ensuring smooth erosion/deposition patterns.

## Parameters

### Core Erosion Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `numParticles` | int | 100 - 50,000 | 5,000 | Number of water droplets to simulate |
| `erodeSpeed` | float | 0.0 - 1.0 | 0.3 | Rate of terrain erosion (material pickup) |
| `depositSpeed` | float | 0.0 - 1.0 | 0.3 | Rate of sediment deposition |
| `evaporateSpeed` | float | 0.001 - 0.1 | 0.01 | Rate of water evaporation per iteration |

### Physics Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `gravity` | float | 1.0 - 10.0 | 4.0 | Gravitational acceleration (affects speed gain) |
| `inertia` | float | 0.0 - 0.5 | 0.05 | Particle momentum (0 = instant direction change, higher = smoother paths) |
| `initialSpeed` | float | 0.5 - 2.0 | 1.0 | Starting velocity magnitude |
| `initialWaterVolume` | float | 0.5 - 2.0 | 1.0 | Starting water amount |

### Capacity Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `sedimentCapacityFactor` | float | 1.0 - 10.0 | 4.0 | Multiplier for sediment carrying capacity |
| `minSedimentCapacity` | float | 0.0 - 0.1 | 0.01 | Minimum capacity (prevents zero capacity on flat terrain) |

### Lifetime Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `maxDropletLifetime` | int | 10 - 100 | 30 | Maximum iterations per particle |

## Mathematical Formulas

### Gradient Calculation
```
∇h(x, y) = (∂h/∂x, ∂h/∂y)

Using central differences:
∂h/∂x ≈ [h(x+1, y) - h(x-1, y)] / 2
∂h/∂y ≈ [h(x, y+1) - h(x, y-1)] / 2
```

### Velocity Update
```
newDirection = normalize(
    inertia * oldDirection + (1 - inertia) * (-gradient)
)

speed = sqrt(speed² + gravity * |gradient| * Δt)

velocity = newDirection * speed
```

### Sediment Capacity
```
capacity = max(
    C_min,
    -|∇h| * v * w * C_factor
)

Where:
- C_min = minSedimentCapacity
- |∇h| = gradient magnitude (slope)
- v = speed
- w = water volume
- C_factor = sedimentCapacityFactor
```

### Erosion Rate
```
If sediment < capacity:
    Δh_erosion = -min(
        k_erode * (capacity - sediment),
        h_current - h_target
    )

Where:
- k_erode = erodeSpeed
- h_current = current height
- h_target = target height (usually neighboring cell)
```

### Deposition Rate
```
If sediment > capacity:
    Δh_deposition = k_deposit * (sediment - capacity)

Where:
- k_deposit = depositSpeed
```

## Usage Examples

### Gentle Erosion (Natural Landscapes)
```cpp
HydraulicErosionParams params;
params.numParticles = 10000;
params.erodeSpeed = 0.2f;
params.depositSpeed = 0.2f;
params.inertia = 0.1f;
params.gravity = 4.0f;
```
**Effect**: Smooth, gradual erosion patterns. Suitable for mature landscapes.

### Aggressive Erosion (Deep Canyons)
```cpp
HydraulicErosionParams params;
params.numParticles = 20000;
params.erodeSpeed = 0.8f;
params.depositSpeed = 0.1f;
params.inertia = 0.02f;
params.gravity = 8.0f;
params.sedimentCapacityFactor = 8.0f;
```
**Effect**: Deep valleys and gullies. High erosion, low deposition creates dramatic terrain.

### Fast Preview (Low Quality)
```cpp
HydraulicErosionParams params;
params.numParticles = 1000;
params.maxDropletLifetime = 15;
```
**Effect**: Quick simulation for prototyping. Fewer particles = faster but less detailed erosion.

### High Detail (Production Quality)
```cpp
HydraulicErosionParams params;
params.numParticles = 50000;
params.maxDropletLifetime = 50;
params.sedimentCapacityFactor = 5.0f;
```
**Effect**: Intricate drainage patterns. More particles = more realistic but slower.

### Balanced (Recommended)
```cpp
HydraulicErosionParams params; // Uses defaults
params.numParticles = 5000;
```
**Effect**: Good balance of quality and performance. Suitable for most use cases.

## Implementation Notes

### Performance Considerations
- **Particle count** is the primary performance factor
- Each particle iterates up to `maxDropletLifetime` times
- Grid size (width × height) affects bilinear interpolation cost
- Total operations ≈ `numParticles * maxDropletLifetime * interpolationCost`

### Optimization Tips
1. **Reduce particles for real-time previews**: 500-1000 particles
2. **Lower lifetime for faster iteration**: 15-20 iterations
3. **Use coarser grids during prototyping**: 64×64 or 128×128
4. **Increase particles for final quality**: 10,000-50,000 particles

### Edge Cases Handled
The implementation robustly handles:
- **Zero erosion/deposition rates**: Prevents NaN/division by zero
- **Boundary conditions**: Particles stop at grid edges
- **Negative heights**: Supports below-sea-level terrain
- **Extreme parameters**: Clamps values to prevent instability
- **Very small grids**: Works correctly down to 3×3 grids
- **Large particle counts**: Tested up to 10,000 particles without issues

### Bilinear Interpolation
Height sampling uses bilinear interpolation for smooth transitions:
```
h(x, y) = h00 * (1-fx) * (1-fy) +
          h10 * fx * (1-fy) +
          h01 * (1-fx) * fy +
          h11 * fx * fy

Where:
- fx = fractional x (x - floor(x))
- fy = fractional y (y - floor(y))
- h00, h10, h01, h11 = heights at 4 corners
```

## Visual Effects

### Expected Terrain Changes
1. **Peak Smoothing**: Sharp peaks become rounded
2. **Valley Formation**: Water carves channels down slopes
3. **Gully Networks**: Interconnected erosion paths
4. **Sediment Deltas**: Deposits in flat areas (alluvial fans)
5. **Realistic Drainage**: Natural-looking water flow patterns

### Common Artifacts (and Fixes)
- **Flat areas remain unchanged**: Increase `minSedimentCapacity`
- **Over-erosion (spiky terrain)**: Reduce `erodeSpeed`, increase `depositSpeed`
- **Too smooth (no detail)**: Increase `numParticles`, reduce `inertia`
- **Unrealistic straight lines**: Increase `inertia` for curved paths

## References

- **Algorithm inspiration**: Sebastian Lague's "Coding Adventure: Hydraulic Erosion" (2019)
- **Physics model**: Based on simple Newtonian particle physics
- **Sediment transport**: Simplified model of real-world fluvial erosion

## Code Location

- **Core implementation**: `libs/core/src/HydraulicErosion.cpp`
- **Header file**: `libs/core/include/HydraulicErosion.hpp`
- **Tests**: `libs/core/tests/HydraulicErosionTest.cpp` (102 tests including edge cases)
- **Node.js binding**: `apps/simulation-api/src/erosion_addon/erosion_addon.cpp`
- **WebSocket server**: `apps/simulation-api/src/index.ts` (frame streaming)

## See Also

- [System Specification](../System%20Spec.md) - Overall project architecture
- [Iterations Planning](../Iterations%20Planning) - Project roadmap
- [Perlin Noise Generation](./PERLIN_NOISE.md) - Initial terrain generation (TODO)
- [Thermal Erosion](./THERMAL_EROSION.md) - Future erosion method (TODO)
