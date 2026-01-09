# TerrainSim API Server

HTTP API server for procedural terrain generation using Perlin noise and Fractional Brownian Motion (fBm).

## Features

- **Perlin Noise Generation**: Classic gradient-based noise for smooth terrain
- **Fractional Brownian Motion (fBm)**: Multi-octave layered noise for realistic terrain
- **CORS Support**: Configured for local development with the frontend
- **Parameter Validation**: Comprehensive input validation with helpful error messages

## Installation

```bash
pnpm install
```

## Development

Start the development server with hot reload:

```bash
pnpm dev
```

The server will start on `http://localhost:3001` by default.

## Production

Build and start the production server:

```bash
pnpm build
pnpm start
```

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-09T12:00:00.000Z"
}
```

### POST /generate

Generate a heightmap using Perlin noise or fBm.

**Request Body:**

```json
{
  "method": "perlin",      // or "fbm"
  "width": 256,            // 1-2048
  "height": 256,           // 1-2048
  "seed": 42,              // Random seed
  "frequency": 0.05,       // Scale of features
  "amplitude": 10.0,       // Height variation

  // fBm-specific parameters:
  "octaves": 4,            // Number of noise layers (1-16)
  "persistence": 0.5,      // Amplitude decay per octave
  "lacunarity": 2.0        // Frequency increase per octave
}
```

**Response:**

```json
{
  "width": 256,
  "height": 256,
  "data": [0.5, -0.3, ...], // Float32Array as regular array
  "statistics": {
    "min": -8.5,
    "max": 9.2,
    "range": 17.7
  },
  "parameters": {
    "method": "fbm",
    "seed": 42,
    "frequency": 0.05,
    "amplitude": 10.0,
    "octaves": 4,
    "persistence": 0.5,
    "lacunarity": 2.0
  }
}
```

## Environment Variables

- `PORT`: Server port (default: 3001)
- `CORS_ORIGIN`: Allowed CORS origin (default: http://localhost:5173)

## Examples

### Generate Perlin Noise

```bash
curl -X POST http://localhost:3001/generate \
  -H "Content-Type: application/json" \
  -d '{
    "method": "perlin",
    "width": 128,
    "height": 128,
    "seed": 42,
    "frequency": 0.1,
    "amplitude": 5.0
  }'
```

### Generate fBm Terrain

```bash
curl -X POST http://localhost:3001/generate \
  -H "Content-Type: application/json" \
  -d '{
    "method": "fbm",
    "width": 256,
    "height": 256,
    "seed": 12345,
    "octaves": 6,
    "frequency": 0.02,
    "amplitude": 20.0,
    "persistence": 0.5,
    "lacunarity": 2.0
  }'
```

## Architecture

- **Express.js**: Fast, minimalist web framework
- **TypeScript**: Type-safe development
- **PerlinNoise**: Port of C++ implementation for consistent results
- **Parameter Validation**: Matches C++ implementation constraints
