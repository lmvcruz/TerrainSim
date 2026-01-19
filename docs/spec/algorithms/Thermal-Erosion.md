# Thermal Erosion

## Purpose
Simulates terrain weathering through slope stability, creating realistic cliff erosion and talus slopes by moving material from steep angles to neighboring cells.

## Core Concept

Thermal erosion models how real terrain settles over time due to gravity. Unlike hydraulic erosion (water-based), thermal erosion is **slope-based weathering**:
- Material on slopes steeper than the **talus angle** becomes unstable
- Unstable material slides to neighboring lower cells
- Process continues until all slopes are below the stability threshold

This creates natural-looking **rounded slopes** and **scree fields** (talus piles at cliff bases). The algorithm is particularly effective for post-processing hydraulic erosion results, smoothing unrealistic sharp features.

The choice of grid-based (vs particle-based) erosion was deliberate—thermal weathering affects entire regions uniformly, not through directed flow. Grid methods efficiently model this bulk material movement without artificial flow patterns.

## Parameters

| Parameter | Type | Range | Default | Effect |
|-----------|------|-------|---------|--------|
| talusAngle | number | 0.1-1.5 | 0.5 | Slope stability threshold in radians (higher = steeper cliffs) |
| numIterations | integer | 1-20 | 5 | Weathering passes per frame (more = smoother slopes) |
| c | number | 0.1-0.9 | 0.5 | Material transfer coefficient (fraction moved per iteration) |

## Behavior

### Normal Operation
- **Before:** Sharp ridges, steep cliffs, abrupt elevation changes
- **After:** Rounded peaks, gradual slopes, talus accumulation at cliff bases

The algorithm iterates over the heightmap, comparing each cell's slope to its 4-8 neighbors:
1. Calculate height difference to each neighbor
2. Convert to slope angle (radians)
3. If slope > talusAngle, transfer material downslope
4. Repeat for numIterations passes

Slopes converge toward the talus angle asymptotically—more iterations = closer to target.

### Edge Cases

**Low talusAngle (0.1-0.3):**
- Nearly flat terrain (everything smoothed)
- Useful for desert/dune landscapes
- Removes all mountainous features

**High talusAngle (1.0-1.5):**
- Preserves steep cliffs (angle ≈ 60-85°)
- Minimal smoothing effect
- Use when sharp features desired

**Single iteration (numIterations = 1):**
- Partial erosion only
- Slopes still exceed talus angle
- Requires many frames to converge

**Many iterations (numIterations = 20+):**
- Smooth, rounded terrain
- Loss of fine detail
- Diminishing returns beyond 10 iterations

### Visual Results

| Talus Angle | Resulting Terrain |
|-------------|-------------------|
| 0.2 (11°) | Rolling hills, no cliffs |
| 0.5 (29°) | Gentle slopes, natural appearance |
| 0.8 (46°) | Steep hillsides, preserved peaks |
| 1.2 (69°) | Dramatic cliffs, minimal smoothing |

| Iterations | Convergence |
|------------|-------------|
| 1 | 20% toward target angle |
| 5 | 80% toward target angle (recommended) |
| 10 | 95% toward target angle |
| 20 | 99% toward target angle (overkill) |

## Integration

Thermal erosion typically **follows** hydraulic erosion to smooth results:
1. **Frames 1-50:** Hydraulic erosion (creates valleys, may produce artifacts)
2. **Frames 51-100:** Thermal erosion (smooths cliffs, removes spikes)

This two-stage approach combines the **directionality** of hydraulic erosion with the **smoothing** of thermal erosion, producing realistic terrain with natural slopes and defined drainage patterns.

The algorithm modifies heightmap data directly, updating cells in-place. Unlike hydraulic erosion, no sediment tracking is needed—only height redistribution.

## Constraints

**Performance:**
- Each iteration: O(width × height × 8) slope comparisons
- 5 iterations × 512×512 = 10.5M comparisons/frame
- Typical frame time: 5-20ms (much faster than hydraulic erosion)

**Stability:**
- Algorithm is **guaranteed to converge** (slopes monotonically decrease)
- No oscillation or instability with valid parameters
- Height conservation: total terrain mass preserved exactly

**Resolution limits:**
- Works efficiently at all resolutions (O(n) complexity)
- No lower limit (effective even at 64×64)
- Upper limit: 4096×4096 (memory-bound, not compute-bound)

**Neighbor calculations:**
- Supports 4-neighbor (Manhattan) or 8-neighbor (Moore) modes
- 8-neighbor recommended for smoother, more isotropic results
- Edge cells use reduced neighbor sets (no out-of-bounds access)

**Browser/System Requirements:**
- C++ native addon required (same as hydraulic erosion)
- Lower computational cost than hydraulic (no particle simulation)
- Single-threaded execution (parallelization possible but not implemented)
