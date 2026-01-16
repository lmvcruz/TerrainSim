# Job-Based Pipeline System API

## Overview

The Job-Based Pipeline System allows users to create complex terrain simulation pipelines by combining multiple simulation steps (hydraulic erosion, thermal erosion) across frame ranges. The system validates coverage, manages sessions, and executes frame-by-frame simulations.

## Base URL

- **Production:** `https://api.lmvcruz.work`
- **Development:** `http://localhost:3001`

---

## Configuration Endpoints

### Validate Configuration

Validates a pipeline configuration to ensure full frame coverage and detect issues.

**Endpoint:** `POST /config/validate`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "step0": {
    "method": "Perlin",
    "seed": 12345,
    "frequency": 0.05,
    "amplitude": 50.0,
    "octaves": 6,
    "persistence": 0.5,
    "lacunarity": 2.0
  },
  "totalFrames": 100,
  "jobs": [
    {
      "id": "job-1",
      "name": "Heavy Erosion",
      "startFrame": 1,
      "endFrame": 50,
      "step": "hydraulicErosion",
      "enabled": true,
      "config": {
        "hydraulicErosion": {
          "numParticles": 100000,
          "erosionRate": 0.5,
          "depositionRate": 0.1,
          "sedimentCapacity": 4.0,
          "minSlope": 0.01,
          "inertia": 0.3,
          "evaporationRate": 0.01,
          "gravity": 4.0,
          "erosionRadius": 3.0
        }
      }
    },
    {
      "id": "job-2",
      "name": "Thermal Smoothing",
      "startFrame": 51,
      "endFrame": 100,
      "step": "thermalErosion",
      "enabled": true,
      "config": {
        "thermalErosion": {
          "talusAngle": 30.0,
          "transferRate": 0.5
        }
      }
    }
  ]
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `step0` | object | Yes | Initial terrain generation configuration |
| `step0.method` | string | Yes | Generation method: `"Perlin"`, `"FBM"`, `"SemiSphere"`, `"Cone"`, `"Sigmoid"` |
| `totalFrames` | integer | Yes | Total number of frames in the simulation (1-10000) |
| `jobs` | array | Yes | Array of simulation jobs |
| `jobs[].id` | string | Yes | Unique job identifier |
| `jobs[].name` | string | Yes | Human-readable job name |
| `jobs[].startFrame` | integer | Yes | First frame (1-indexed) |
| `jobs[].endFrame` | integer | Yes | Last frame (inclusive) |
| `jobs[].step` | string | Yes | Step type: `"hydraulicErosion"` or `"thermalErosion"` |
| `jobs[].enabled` | boolean | Yes | Whether job is active |
| `jobs[].config` | object | Yes | Step-specific configuration parameters |

#### Response

**Success (200 OK)**

```json
{
  "isValid": true,
  "uncoveredFrames": [],
  "warnings": []
}
```

**Validation Failure (200 OK)**

```json
{
  "isValid": false,
  "uncoveredFrames": [51, 52, 53],
  "warnings": [
    "Frame 25 has overlapping jobs: job-1, job-3 (will execute sequentially)",
    "Job 'Light Erosion' is disabled and will be skipped"
  ]
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `isValid` | boolean | `true` if all frames 1-N are covered by enabled jobs |
| `uncoveredFrames` | integer[] | List of frames without coverage (empty if valid) |
| `warnings` | string[] | Non-blocking issues (overlaps, disabled jobs) |

**Error Response (400 Bad Request)**

```json
{
  "error": "Invalid configuration: totalFrames must be between 1 and 10000"
}
```

---

### Save Configuration

Saves a pipeline configuration to disk for later reuse.

**Endpoint:** `POST /config/save`

**Content-Type:** `application/json`

#### Request Body

Same as `/config/validate` - complete pipeline configuration.

#### Response

**Success (200 OK)**

```json
{
  "configId": "config-1737046834567",
  "message": "Configuration saved successfully"
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `configId` | string | Unique identifier for the saved configuration |
| `message` | string | Success confirmation message |

**Error Response (400 Bad Request)**

```json
{
  "error": "Invalid configuration format"
}
```

---

### Load Configuration

Retrieves a previously saved pipeline configuration.

**Endpoint:** `GET /config/load/:id`

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Configuration ID returned from `/config/save` |

#### Response

**Success (200 OK)**

Returns the complete configuration object:

```json
{
  "step0": { ... },
  "totalFrames": 100,
  "jobs": [ ... ]
}
```

**Error Response (404 Not Found)**

```json
{
  "error": "Configuration not found"
}
```

---

## Simulation Endpoints

### Create Simulation Session

Initializes a new simulation session with the given configuration. Generates the initial terrain (frame 0) and prepares for frame-by-frame execution.

**Endpoint:** `POST /simulate/create`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "config": {
    "width": 256,
    "height": 256
  },
  "initialTerrain": [0.0, 12.5, 34.2, ...]
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | object | Yes | Session configuration |
| `config.width` | integer | Yes | Terrain width (1-4096) |
| `config.height` | integer | Yes | Terrain height (1-4096) |
| `initialTerrain` | number[] | Yes | Initial heightmap data (frame 0) as flat array |

#### Response

**Success (200 OK)**

```json
{
  "sessionId": "session-1737046834567",
  "message": "Session created successfully"
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session identifier for subsequent operations |
| `message` | string | Success confirmation |

**Session Management:**
- Sessions expire after 30 minutes of inactivity
- Sessions are automatically cleaned up when deleted or expired
- Each session maintains its own terrain state

**Error Response (400 Bad Request)**

```json
{
  "error": "Invalid terrain dimensions: width and height must be between 1 and 4096"
}
```

---

### Execute Frame

Executes simulation for a specific frame using the jobs assigned to that frame. Jobs execute sequentially in creation order.

**Endpoint:** `POST /simulate/execute`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "sessionId": "session-1737046834567",
  "frame": 25,
  "jobs": [
    {
      "step": "hydraulicErosion",
      "config": {
        "numParticles": 100000,
        "erosionRate": 0.5,
        "depositionRate": 0.1,
        "sedimentCapacity": 4.0,
        "minSlope": 0.01,
        "inertia": 0.3,
        "evaporationRate": 0.01,
        "gravity": 4.0,
        "erosionRadius": 3.0
      }
    }
  ]
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID from `/simulate/create` |
| `frame` | integer | Yes | Frame number to execute (1-10000) |
| `jobs` | array | Yes | Jobs to execute for this frame (in order) |
| `jobs[].step` | string | Yes | `"hydraulicErosion"` or `"thermalErosion"` |
| `jobs[].config` | object | Yes | Step-specific parameters |

#### Response

**Success (200 OK)**

```json
{
  "frame": 25,
  "heightmap": {
    "data": [0.0, 12.5, 34.2, ...],
    "width": 256,
    "height": 256,
    "min": -23.45,
    "max": 48.67
  },
  "metadata": {
    "particlesDropped": 100000,
    "executionTimeMs": 1234
  }
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `frame` | integer | Frame number that was executed |
| `heightmap.data` | number[] | Resulting heightmap as flat array (row-major order) |
| `heightmap.width` | integer | Terrain width |
| `heightmap.height` | integer | Terrain height |
| `heightmap.min` | number | Minimum elevation value |
| `heightmap.max` | number | Maximum elevation value |
| `metadata` | object | Execution statistics |

**Execution Model:**
- Jobs execute **sequentially** in the order provided
- Each job uses the output of the previous job as input
- First job uses the previous frame (frame-1) as input
- Last job's output is returned as the result

**Error Response (404 Not Found)**

```json
{
  "error": "Session not found or expired"
}
```

**Error Response (400 Bad Request)**

```json
{
  "error": "Frame must be greater than 0"
}
```

---

### Delete Session

Cleans up a simulation session and frees associated memory.

**Endpoint:** `DELETE /simulate/session/:id`

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Session ID to delete |

#### Response

**Success (200 OK)**

```json
{
  "message": "Session deleted successfully"
}
```

**Error Response (404 Not Found)**

```json
{
  "error": "Session not found"
}
```

---

## WebSocket Events

### Connection

Connect to the WebSocket server to receive real-time simulation progress updates.

**URL:** `wss://api.lmvcruz.work` (Production) or `ws://localhost:3001` (Development)

### Event: `frame:complete`

Emitted when a frame finishes executing during a multi-frame simulation.

**Payload:**

```json
{
  "sessionId": "session-1737046834567",
  "frame": 25,
  "heights": [0.0, 12.5, 34.2, ...],
  "width": 256,
  "height": 256
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Session identifier |
| `frame` | integer | Completed frame number |
| `heights` | number[] | Heightmap data (flat array) |
| `width` | integer | Terrain width |
| `height` | integer | Terrain height |

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters or configuration |
| 404 | Not Found - Session or configuration doesn't exist |
| 500 | Internal Server Error - Simulation or processing error |

---

## Rate Limits

- **No rate limits** currently enforced
- Sessions automatically expire after **30 minutes** of inactivity
- Maximum **10,000 frames** per configuration
- Maximum terrain size: **4096×4096** (16.7 million cells)

---

## Example: Complete Workflow

```javascript
// 1. Validate configuration
const validateResponse = await fetch('https://api.lmvcruz.work/config/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(pipelineConfig)
});
const validation = await validateResponse.json();

if (!validation.isValid) {
  console.error('Invalid config:', validation.uncoveredFrames);
  return;
}

// 2. Create session
const createResponse = await fetch('https://api.lmvcruz.work/simulate/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: { width: 256, height: 256 },
    initialTerrain: terrainData
  })
});
const { sessionId } = await createResponse.json();

// 3. Execute frame
const executeResponse = await fetch('https://api.lmvcruz.work/simulate/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    frame: 1,
    jobs: [
      {
        step: 'hydraulicErosion',
        config: { /* ... */ }
      }
    ]
  })
});
const result = await executeResponse.json();

// 4. Cleanup
await fetch(`https://api.lmvcruz.work/simulate/session/${sessionId}`, {
  method: 'DELETE'
});
```

---

## Version History

- **v1.0.0** (2026-01-16): Initial job system API release
  - Configuration validation endpoints
  - Session-based simulation
  - Sequential job execution model
  - WebSocket progress events
