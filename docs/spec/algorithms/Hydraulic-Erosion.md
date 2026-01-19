# Hydraulic Erosion

## Purpose
Simulates realistic terrain weathering through water droplet physics, creating valleys, gullies, and natural drainage patterns by eroding high terrain and depositing sediment in lower areas.

## Core Concept

The hydraulic erosion algorithm uses particle-based simulation where thousands of water droplets traverse the terrain following natural slopes. Each droplet:
- **Erodes** material from steep slopes (picking up sediment)
- **Transports** sediment while maintaining velocity
- **Deposits** sediment in flat areas or when capacity is exceeded
- **Evaporates** gradually, losing erosive power over time

This simulates how real water carves terrain through continuous flow and sediment transport. The key innovation is using **sediment capacity**—faster droplets on steeper slopes can carry more material, naturally creating realistic erosion patterns without manual tuning.

The algorithm was chosen over grid-based approaches because particle simulation produces more natural, directional flow patterns. Grid methods tend to create artificial square artifacts, while particles follow natural gradients organically.

## Parameters

| Parameter | Type | Range | Default | Effect |
|-----------|------|-------|---------|--------|
| numParticles | integer | 1,000-500,000 | 100,000 | Water droplets simulated per frame |
| erosionRate | number | 0.1-0.9 | 0.3 | Material pickup strength (higher = deeper cuts) |
| depositionRate | number | 0.01-0.5 | 0.1 | Sediment drop rate (higher = more buildup) |
| evaporationRate | number | 0.001-0.1 | 0.01 | Water loss per step (higher = shorter droplet life) |
| minSlope | number | 0.0-0.1 | 0.01 | Minimum gradient for erosion (prevents flat erosion) |
| inertia | number | 0.0-0.5 | 0.05 | Flow smoothness (higher = straighter paths) |
| sedimentCapacity | number | 1.0-10.0 | 4.0 | Base carrying capacity multiplier |
| gravity | number | 1.0-10.0 | 4.0 | Downslope acceleration factor |
| maxDropletLifetime | integer | 10-100 | 30 | Maximum simulation steps per droplet |

## Behavior

### Normal Operation
- **High erosion areas:** Ridge peaks, steep slopes, mountain tops
- **High deposition areas:** Valley floors, flat plains, basin bottoms
- **Flow patterns:** Droplets follow steepest descent, creating natural river-like channels

With default parameters, 100,000 particles create visible erosion in 1-10 frames. Results are cumulative—more frames = more pronounced effects.

### Edge Cases

**Extreme erosionRate (0.8-0.9):**
- Deep, unrealistic gullies form rapidly
- Terrain can become artificially spiky
- Recommended: Keep below 0.5 for natural results

**Low numParticles (<10,000):**
- Sparse, random erosion patterns
- No coherent drainage networks
- Recommended: Use 50,000+ for realistic terrain

**High evaporationRate (>0.05):**
- Droplets die quickly, reducing long-distance transport
- Erosion concentrated near spawn points
- Use for localized weathering effects only

**Flat terrain (slopes <0.01):**
- Minimal erosion occurs naturally
- Adjust minSlope downward for subtle effects
- Consider using thermal erosion instead

### Visual Results

| Erosion Rate | Visual Effect |
|--------------|---------------|
| 0.1 | Gentle weathering, subtle valleys |
| 0.3 | Balanced erosion, natural river formation |
| 0.5 | Deep canyons, prominent drainage |
| 0.8 | Extreme carving, artificial appearance |

| Particle Count | Terrain Impact |
|----------------|----------------|
| 10,000 | Sparse, random marks |
| 100,000 | Coherent river networks (recommended) |
| 500,000 | Fine detail, smooth erosion (slow) |

## Integration

Hydraulic erosion typically follows initial terrain generation (Perlin noise):
1. **Frame 0:** Generate base terrain with Perlin noise
2. **Frames 1-50:** Apply hydraulic erosion (creates valleys)
3. **Frames 51-100:** Optional thermal erosion (smooths slopes)

The algorithm modifies heightmap data directly using bilinear interpolation for smooth terrain updates. Each particle affects 4 neighboring grid cells with weighted contributions, preventing blocky artifacts.

## Constraints

**Performance:**
- 100,000 particles × 30 lifetime steps = 3M calculations/frame
- Typical frame time: 50-200ms (depends on terrain resolution)
- Memory: O(width × height) for heightmap, O(1) per particle

**Stability:**
- Droplets respect heightmap boundaries (particles exit cleanly)
- Sediment capacity never negative (clamped to minSedimentCapacity)
- Height changes distributed across neighbors (prevents spikes)

**Resolution limits:**
- Works best with 256×256 to 1024×1024 heightmaps
- Below 128×128: Artifacts visible, insufficient detail
- Above 2048×2048: Performance degrades significantly

**Browser/System Requirements:**
- C++ native addon required (not available in pure WebAssembly)
- Desktop browsers recommended (mobile too slow for real-time)
- Multi-threading not implemented (single-core execution)
