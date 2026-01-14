# Agent Debugging Workflow

This document describes how AI agents can access browser console logs to debug issues without requiring manual copy/paste from users.

## Overview

The TerrainSim application automatically captures browser console logs and sends them to the backend API, making them accessible for debugging without user intervention.

### Architecture

```
Browser (localhost:5173)
  ↓ Logger.ts - Structured logging
  ↓ LogCollector.ts - Captures all logs
  ↓ Auto-send every 30s (if backend available)
  ↓
Backend API (localhost:3001)
  ↓ POST /dev/logs - Receives logs
  ↓ Stores in .dev-logs/browser-logs.json (max 5000 entries)
  ↓
Agent
  ↓ GET /dev/logs?filters - Queries logs
  ↓ Analyzes logs to diagnose issues
```

## Using the Log API

### 1. Health Check

First, verify the API is running:

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-12T14:30:00.000Z"
}
```

### 2. Retrieve All Logs

Get all logs:

```bash
curl http://localhost:3001/dev/logs
```

**Response:**
```json
{
  "logs": [
    {
      "component": "TerrainMesh",
      "timestamp": 1704987600000,
      "level": "info",
      "message": "Terrain mesh updated",
      "metadata": {
        "vertexCount": 10201,
        "triangleCount": 20000
      }
    }
  ],
  "count": 1,
  "total": 1,
  "timestamp": 1704987650000
}
```

### 3. Filter Logs

Query parameters:
- **level** - Filter by log level: `debug`, `info`, `warn`, `error`
- **component** - Filter by component name: `TerrainMesh`, `App`, etc.
- **since** - Unix timestamp - only logs after this time
- **limit** - Maximum number of logs to return

**Examples:**

Get only errors:
```bash
curl "http://localhost:3001/dev/logs?level=error"
```

Get TerrainMesh logs:
```bash
curl "http://localhost:3001/dev/logs?component=TerrainMesh"
```

Get recent logs (last 60 seconds):
```bash
curl "http://localhost:3001/dev/logs?since=$(date -d '60 seconds ago' +%s)000"
```

Get last 10 logs:
```bash
curl "http://localhost:3001/dev/logs?limit=10"
```

Combine filters:
```bash
curl "http://localhost:3001/dev/logs?level=error&component=TerrainMesh&limit=5"
```

### 4. Clear Logs

Remove all stored logs:

```bash
curl -X DELETE http://localhost:3001/dev/logs
```

**Response:**
```json
{
  "message": "All logs cleared",
  "timestamp": 1704987700000
}
```

## Log Entry Structure

Each log entry has the following structure:

```typescript
interface CapturedLog {
  component: string      // Component name (e.g., "TerrainMesh", "App")
  timestamp: number      // Unix timestamp in milliseconds
  level: string          // Log level: "debug" | "info" | "warn" | "error"
  message: string        // Log message
  metadata: object       // Additional structured data
}
```

## Agent Debugging Workflow

### Step 1: User Reports Issue

User: "The terrain isn't updating when I change the scale"

### Step 2: Agent Retrieves Recent Logs

```bash
curl "http://localhost:3001/dev/logs?component=TerrainMesh&limit=20"
```

### Step 3: Agent Analyzes Logs

Look for:
- Error messages
- Warning messages
- Missing expected log entries
- Unexpected values in metadata
- Timing issues (compare timestamps)

### Step 4: Agent Identifies Issue

Example findings:
```json
{
  "level": "warn",
  "component": "TerrainMesh",
  "message": "Scale parameter out of range",
  "metadata": {
    "scale": -5,
    "validRange": [0.1, 10]
  }
}
```

### Step 5: Agent Suggests Fix

Based on the logs, the agent can:
- Identify the exact cause of the issue
- Suggest code changes
- Ask clarifying questions
- Implement the fix

## Performance Monitoring

The logging system includes performance timing:

```bash
curl "http://localhost:3001/dev/logs?component=TerrainMesh"
```

Look for logs with timing metadata:
```json
{
  "level": "info",
  "message": "Terrain generated",
  "metadata": {
    "duration": 1250,
    "vertexCount": 10201
  }
}
```

## Troubleshooting

### No logs available

**Possible causes:**
1. Backend API not running
2. Browser hasn't sent logs yet (auto-send every 30s)
3. User hasn't interacted with the app yet

**Solution:**
Ask user to:
1. Verify the backend is running: `pnpm --filter @terrain-sim/api run dev`
2. Open the app in a regular browser (not Simple Browser)
3. Interact with the app to generate logs
4. Wait 30 seconds for auto-send to trigger

### Backend not receiving logs

**Possible causes:**
1. CORS issue
2. Health check failed
3. Browser blocked the request

**Solution:**
Check browser console for errors:
```javascript
// In browser console
window.logCollector.sendToBackend()
```

### Logs too old

**Solution:**
Use the `since` parameter to filter recent logs:
```bash
# Get logs from last 5 minutes
curl "http://localhost:3001/dev/logs?since=$(date -d '5 minutes ago' +%s)000"
```

## Development Notes

- **Storage:** Logs are stored in `.dev-logs/browser-logs.json`
- **Max entries:** 5000 (oldest logs are removed automatically)
- **Auto-send interval:** 30 seconds
- **Fallback:** If backend unavailable, logs stay in browser localStorage
- **Development only:** These endpoints are only available in dev mode

## Example Agent Query Script

```bash
#!/bin/bash
# Script to quickly get relevant debugging info

echo "=== Recent Errors ==="
curl -s "http://localhost:3001/dev/logs?level=error&limit=10" | jq '.logs'

echo "\n=== TerrainMesh Logs ==="
curl -s "http://localhost:3001/dev/logs?component=TerrainMesh&limit=20" | jq '.logs'

echo "\n=== Performance Data ==="
curl -s "http://localhost:3001/dev/logs" | jq '.logs[] | select(.metadata.duration != null)'
```

## Security Notes

- **Development only:** These endpoints are disabled in production
- **No authentication:** Logs are publicly accessible in dev mode
- **No sensitive data:** Never log passwords, tokens, or personal information
- **Local only:** Endpoints only accept connections from localhost

## Next Steps

- [ ] Add log viewing UI (optional)
- [ ] Add log export in different formats
- [ ] Add real-time log streaming via WebSocket
- [ ] Add log aggregation across multiple sessions
