# Perlin Noise Generation

## Purpose
Generates procedural terrain heightmaps using Fractional Brownian Motion (fBm), creating natural-looking landscapes with controllable scale, roughness, and detail.

## Core Concept

Perlin noise is a gradient noise function that produces smooth, continuous random patterns. Unlike pure random noise (white noise), Perlin noise:
- **Appears organic:** No abrupt jumps between values
- **Is deterministic:** Same seed always produces same result
- **Scales well:** Meaningful at any resolution

The algorithm uses **Fractional Brownian Motion (fBm)**, which layers multiple octaves of Perlin noise at different frequencies and amplitudes. This creates **multi-scale detail**—large mountains with fine surface texture—mimicking how real terrain has features at many scales.

**Why Perlin noise?** It's computationally efficient, produces natural-looking results without artifacts, and is highly tunable. Alternative algorithms (Simplex noise, Wavelet noise) offer marginal improvements but lack ecosystem support and predictable behavior.

The key insight: natural terrain is **self-similar** across scales (fractal-like). fBm captures this by combining noise at octave intervals, where each octave adds finer detail.

## Parameters

| Parameter | Type | Range | Default | Effect |
|-----------|------|-------|---------|--------|
| seed | integer | 0-2³² | Random | Random seed for reproducibility |
| frequency | number | 0.001-1.0 | 0.05 | Feature scale (lower = larger terrain features) |
| amplitude | number | 0.1-1000 | 50.0 | Maximum height variation |
| octaves | integer | 1-16 | 6 | Number of noise layers (more = more detail) |
| persistence | number | 0.001-0.99 | 0.5 | Amplitude decay per octave (higher = rougher) |
| lacunarity | number | 1.5-10.0 | 2.0 | Frequency increase per octave |

## Behavior

### Normal Operation

The fBm algorithm combines octaves as follows:
```
height(x, y) = Σ(i=0 to octaves-1) [
    amplitude × persistence^i ×
    noise(x × frequency × lacunarity^i, y × frequency × lacunarity^i, seed)
]
```

**Octave contributions:**
- Octave 0: Large-scale features (mountain ranges)
- Octave 1-3: Medium-scale features (hills, valleys)
- Octave 4-6: Fine-scale features (surface texture, bumps)

Each successive octave adds half the amplitude (with persistence=0.5) at double the frequency (with lacunarity=2.0), creating natural detail hierarchy.

### Edge Cases

**Single octave (octaves = 1):**
- Smooth, featureless terrain (single noise layer)
- Useful for simple height variations
- No fine detail or texture

**Many octaves (octaves = 12-16):**
- Highly detailed terrain with fine surface bumps
- Computation cost increases linearly
- Diminishing visual returns beyond 8-10 octaves

**Low frequency (0.01-0.02):**
- Continental-scale features (huge smooth mountains)
- Individual peaks span hundreds of pixels
- Good for distant skybox terrain

**High frequency (0.2-0.5):**
- Tightly packed small features
- Noisy, chaotic appearance
- Suitable for rocky/rough surfaces only

**Low persistence (0.1-0.3):**
- Smooth terrain dominated by first octave
- Fine details barely visible
- Creates gentle, rolling landscapes

**High persistence (0.7-0.9):**
- Rough, craggy terrain with strong fine detail
- Can appear artificially noisy
- Good for alien or extreme landscapes

### Visual Results

| Configuration | Terrain Type |
|---------------|--------------|
| frequency=0.02, octaves=4, persistence=0.4 | Smooth rolling hills |
| frequency=0.05, octaves=6, persistence=0.5 | Balanced mountains (default) |
| frequency=0.08, octaves=8, persistence=0.6 | Rugged peaks with detail |
| frequency=0.1, octaves=12, persistence=0.7 | Highly detailed, rough terrain |

**Seed effects:**
- Different seeds produce entirely different terrain layouts
- Same seed with same parameters = identical terrain (reproducible)
- Useful for sharing configurations or debugging

## Integration

Perlin noise generation is typically **step 0** in terrain workflows:
1. **Frame 0:** Generate base terrain with Perlin noise
2. **Frames 1-50:** Apply hydraulic erosion (carve valleys)
3. **Frames 51-100:** Apply thermal erosion (smooth slopes)

The generated heightmap serves as the **initial condition** for subsequent simulation steps. Without Perlin noise, users must provide custom heightmaps or use geometric shapes (cones, planes).

The C++ implementation uses:
- **Gradient vectors** at integer lattice points
- **Fade function:** 6t⁵ - 15t⁴ + 10t³ (smooth interpolation)
- **Permutation table:** Seeded hash for deterministic gradients

## Constraints

**Performance:**
- Generation time: O(width × height × octaves)
- Typical 512×512×6 octaves: 40-80ms
- Linear scaling with octaves (6 octaves = 6× cost of 1 octave)

**Memory:**
- Heightmap storage: width × height × 4 bytes (Float32)
- 512×512 = 1MB, 1024×1024 = 4MB
- Permutation table: 512 bytes (negligible)

**Numerical stability:**
- Noise values clamped to [-1, 1] range
- Final heightmap normalized to [0, max_height]
- No overflow or precision issues with valid parameters

**Resolution limits:**
- Minimum: 16×16 (noise patterns visible but coarse)
- Maximum: 4096×4096 (generation time >2 seconds, memory 64MB)
- Recommended: 256×256 to 1024×1024

**Browser/System Requirements:**
- C++ native addon for performance (10-100× faster than JS)
- Pure JavaScript fallback available but slow
- Works on all platforms (no special hardware required)
