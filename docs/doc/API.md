# TerrainSim API Documentation

## Overview

The TerrainSim API provides procedural terrain generation capabilities using Perlin noise and Fractional Brownian Motion (fBm) algorithms. The API is implemented as a Node.js Express server that interfaces with the C++ terrain generation core library.

## Base URL

Development: `http://localhost:3000`

## Endpoints

### Generate Terrain

Generates a procedural terrain heightmap using fBm (Fractional Brownian Motion) noise.

**Endpoint:** `POST /generate`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "seed": 12345,
  "frequency": 0.05,
  "amplitude": 50.0,
  "octaves": 6,
  "persistence": 0.5,
  "lacunarity": 2.0,
  "width": 256,
  "height": 256
}
```

#### Parameters

| Parameter | Type | Required | Default | Range | Description |
|-----------|------|----------|---------|-------|-------------|
| `seed` | integer | No | Random | 0 - 2^32-1 | Random seed for noise generation. Same seed produces identical terrain. |
| `frequency` | number | No | 0.05 | 0.001 - 1.0 | Controls the scale of terrain features. Lower = larger features. |
| `amplitude` | number | No | 50.0 | 0.001 - 1000 | Maximum height variation. Higher = more mountainous terrain. |
| `octaves` | integer | No | 6 | 1 - 16 | Number of noise layers. More octaves = more detail. |
| `persistence` | number | No | 0.5 | 0.001 - 0.99 | Controls amplitude decrease per octave. Higher = rougher terrain. |
| `lacunarity` | number | No | 2.0 | 0.001 - 10.0 | Controls frequency increase per octave. Higher = more varied detail. |
| `width` | integer | No | 256 | 1 - 4096 | Width of the heightmap in cells. |
| `height` | integer | No | 256 | 1 - 4096 | Height of the heightmap in cells. |

#### Response

**Success (200 OK)**

```json
{
  "heightmap": [0.0, 12.5, 34.2, ...],
  "width": 256,
  "height": 256,
  "metadata": {
    "seed": 12345,
    "frequency": 0.05,
    "amplitude": 50.0,
    "octaves": 6,
    "persistence": 0.5,
    "lacunarity": 2.0,
    "min": -23.45,
    "max": 48.67,
    "avg": 15.23
  }
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `heightmap` | number[] | Flat array of elevation values in row-major order. Length = width × height. |
| `width` | integer | Width of the heightmap. |
| `height` | integer | Height of the heightmap. |
| `metadata.seed` | integer | Seed used for generation. |
| `metadata.frequency` | number | Frequency parameter used. |
| `metadata.amplitude` | number | Amplitude parameter used. |
| `metadata.octaves` | integer | Number of octaves used. |
| `metadata.persistence` | number | Persistence parameter used. |
| `metadata.lacunarity` | number | Lacunarity parameter used. |
| `metadata.min` | number | Minimum elevation value in the heightmap. |
| `metadata.max` | number | Maximum elevation value in the heightmap. |
| `metadata.avg` | number | Average elevation value across the heightmap. |

**Error Response (400 Bad Request)**

```json
{
  "error": "Invalid parameter: octaves must be between 1 and 16"
}
```

**Error Response (500 Internal Server Error)**

```json
{
  "error": "Failed to generate terrain: <error details>"
}
```

## Parameter Guide

### Seed

The seed controls the randomness of terrain generation. Using the same seed with identical parameters will always produce the exact same terrain, enabling reproducibility and sharing of terrain configurations.

**Examples:**
- `seed: 12345` - Produces a specific, reproducible terrain
- `seed: 99999` - Produces a different, but equally reproducible terrain

### Frequency

Frequency controls the scale of terrain features. Think of it as "zoom level" for the noise pattern.

**Effects:**
- **Low frequency (0.01 - 0.03):** Large, smooth hills and valleys
- **Medium frequency (0.04 - 0.08):** Balanced terrain with moderate-sized features
- **High frequency (0.1 - 0.5):** Small, detailed features with rapid elevation changes

**Typical Values:**
- `0.02` - Continental scale (large mountain ranges)
- `0.05` - Regional scale (medium hills)
- `0.1` - Local scale (small detailed terrain)

### Amplitude

Amplitude determines the maximum height variation in the terrain.

**Effects:**
- **Low amplitude (1 - 10):** Gentle, rolling terrain
- **Medium amplitude (20 - 50):** Hills and moderate mountains
- **High amplitude (100+):** Dramatic mountains and deep valleys

**Typical Values:**
- `10.0` - Plains and gentle hills
- `50.0` - Mountainous terrain
- `100.0` - Extreme elevation changes

### Octaves

Octaves add layers of detail at different scales. Each octave adds finer detail to the terrain.

**Effects:**
- **Few octaves (1 - 3):** Smooth, simple terrain with large features only
- **Medium octaves (4 - 8):** Realistic terrain with multiple scales of detail
- **Many octaves (10 - 16):** Highly detailed terrain with fine features

**Typical Values:**
- `1` - Simple, smooth noise
- `6` - Balanced detail (recommended)
- `12` - High detail for close-up viewing

### Persistence

Persistence controls how much each octave contributes to the final result. It determines the amplitude decay between octaves.

**Effects:**
- **Low persistence (0.1 - 0.3):** Smooth terrain dominated by large features
- **Medium persistence (0.4 - 0.6):** Balanced contribution from all octaves
- **High persistence (0.7 - 0.9):** Rough, detailed terrain with strong fine features

**Typical Values:**
- `0.3` - Smooth, gentle terrain
- `0.5` - Natural-looking terrain (recommended)
- `0.8` - Rough, craggy terrain

### Lacunarity

Lacunarity controls how rapidly the frequency increases for each octave.

**Effects:**
- **Low lacunarity (1.5 - 2.0):** Uniform detail at all scales
- **Medium lacunarity (2.0 - 3.0):** Natural variation in detail scales
- **High lacunarity (4.0+):** Sharp contrast between large and small features

**Typical Values:**
- `2.0` - Natural terrain (recommended)
- `2.5` - Varied detail levels
- `3.0` - High contrast between scales

## Usage Examples

### Example 1: Smooth Rolling Hills

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "seed": 1234,
    "frequency": 0.03,
    "amplitude": 20.0,
    "octaves": 4,
    "persistence": 0.4,
    "lacunarity": 2.0
  }'
```

### Example 2: Mountainous Terrain

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "seed": 5678,
    "frequency": 0.05,
    "amplitude": 80.0,
    "octaves": 8,
    "persistence": 0.6,
    "lacunarity": 2.5
  }'
```

### Example 3: Desert Dunes

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "seed": 9999,
    "frequency": 0.08,
    "amplitude": 15.0,
    "octaves": 5,
    "persistence": 0.5,
    "lacunarity": 2.0
  }'
```

### Example 4: Alien Landscape

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "seed": 42,
    "frequency": 0.1,
    "amplitude": 100.0,
    "octaves": 12,
    "persistence": 0.7,
    "lacunarity": 3.0
  }'
```

## Integration with Frontend

The frontend web application communicates with the API using the Fetch API:

```typescript
const generateTerrain = async (params: NoiseParameters) => {
  const response = await fetch('http://localhost:3000/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate terrain');
  }

  return await response.json();
};
```

## Algorithm Details

### Fractional Brownian Motion (fBm)

The terrain generation uses fBm, which combines multiple octaves of Perlin noise:

```
fBm(x, y) = Σ(i=0 to octaves-1) [
  amplitude × persistence^i ×
  PerlinNoise(x × frequency × lacunarity^i, y × frequency × lacunarity^i, seed)
]
```

### Perlin Noise

The underlying Perlin noise algorithm uses:
- Gradient vectors at integer lattice points
- Interpolation using fade function: `6t^5 - 15t^4 + 10t^3`
- Deterministic permutation table based on seed

## Performance Considerations

### Generation Time

Approximate generation times on modern hardware:

| Resolution | Octaves | Time |
|------------|---------|------|
| 128×128 | 6 | ~10ms |
| 256×256 | 6 | ~40ms |
| 512×512 | 6 | ~160ms |
| 1024×1024 | 6 | ~650ms |

**Note:** Time scales linearly with the number of octaves.

### Memory Usage

Heightmap memory usage: `width × height × 4 bytes`

- 256×256: 256 KB
- 512×512: 1 MB
- 1024×1024: 4 MB

## Error Handling

The API validates all parameters and returns descriptive error messages:

- **Invalid dimensions:** "Width and height must be positive integers"
- **Invalid octaves:** "Octaves must be between 1 and 16"
- **Invalid frequency:** "Frequency must be greater than 0"
- **Invalid amplitude:** "Amplitude must be greater than 0"
- **Invalid persistence:** "Persistence must be between 0 and 1"
- **Invalid lacunarity:** "Lacunarity must be greater than 0"

## CORS Configuration

The API is configured with CORS to allow requests from the frontend development server:

```javascript
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  methods: ['GET', 'POST'],
  credentials: true
}));
```

For production deployment, update the `origin` to match your deployed frontend URL.

## Version

Current API Version: **1.0.0**

## Future Endpoints (Planned)

- `POST /simulate/hydraulic` - Start hydraulic erosion simulation
- `POST /simulate/thermal` - Start thermal erosion simulation
- `GET /export/png` - Export heightmap as PNG image
- `GET /export/exr` - Export heightmap as EXR (HDR)
- `GET /presets` - List available terrain presets
- `POST /presets/:name` - Load terrain from preset

## Support

For issues, questions, or contributions, please visit:
- GitHub Repository: https://github.com/lmvcruz/TerrainSim
- Documentation: [README.md](../README.md)
- System Specification: [System Spec.md](./System%20Spec.md)
