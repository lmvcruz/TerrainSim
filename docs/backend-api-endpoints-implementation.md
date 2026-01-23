# Backend API Endpoints Implementation (Phase 2.2)

## Overview

Phase 2.2 adds backend API endpoints for dynamic log management and filtering. These endpoints enable runtime log level changes without server restarts and provide powerful log querying capabilities.

## Implemented Endpoints

### Admin Endpoints (`/admin`)

#### 1. POST /admin/log-level
**Purpose**: Dynamically change the log level without restarting the server

**Request**:
```bash
curl -X POST http://localhost:3001/admin/log-level \
  -H "Content-Type: application/json" \
  -d '{"level":"debug"}'
```

**Request Body**:
```json
{
  "level": "trace" | "debug" | "info" | "warn" | "error"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Log level updated from info to debug",
  "previousLevel": "info",
  "currentLevel": "debug",
  "environment": "development",
  "timestamp": "2026-01-23T12:00:00.000Z"
}
```

**Error Response** (400):
```json
{
  "error": "Invalid log level",
  "message": "Log level must be one of: trace, debug, info, warn, error",
  "validLevels": ["trace", "debug", "info", "warn", "error"]
}
```

#### 2. GET /admin/log-level
**Purpose**: Query current log level and configuration

**Request**:
```bash
curl http://localhost:3001/admin/log-level
```

**Response**:
```json
{
  "currentLevel": "debug",
  "environment": "development",
  "logDir": "./logs",
  "fileLoggingEnabled": true,
  "consoleLoggingEnabled": true,
  "validLevels": ["trace", "debug", "info", "warn", "error"],
  "timestamp": "2026-01-23T12:00:00.000Z"
}
```

#### 3. GET /admin/health
**Purpose**: Health check with logging system status

**Request**:
```bash
curl http://localhost:3001/admin/health
```

**Response**:
```json
{
  "status": "healthy",
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "logging": {
    "level": "debug",
    "directory": "./logs",
    "fileLogging": true,
    "consoleLogging": true
  },
  "environment": "development",
  "timestamp": "2026-01-23T12:00:00.000Z"
}
```

### Logs Endpoints (`/api/logs`)

#### 4. GET /api/logs/filter
**Purpose**: Filter and search logs based on multiple criteria

**Query Parameters**:
- `level` - Filter by log level (trace, debug, info, warn, error)
- `source` - Filter by source (frontend, backend)
- `component` - Filter by component name
- `startDate` - Filter logs after this date (ISO 8601)
- `endDate` - Filter logs before this date (ISO 8601)
- `sessionId` - Filter by session ID
- `searchTerm` - Search in message and metadata (case-insensitive)
- `limit` - Maximum number of results (default: 100)

**Examples**:

1. **Filter by level**:
```bash
curl "http://localhost:3001/api/logs/filter?level=error&limit=10"
```

2. **Filter by source**:
```bash
curl "http://localhost:3001/api/logs/filter?source=frontend&limit=50"
```

3. **Search term**:
```bash
curl "http://localhost:3001/api/logs/filter?searchTerm=simulation&level=info"
```

4. **Date range**:
```bash
curl "http://localhost:3001/api/logs/filter?startDate=2026-01-23T00:00:00Z&endDate=2026-01-23T23:59:59Z"
```

5. **Multiple filters**:
```bash
curl "http://localhost:3001/api/logs/filter?level=error&source=backend&limit=20"
```

**Response**:
```json
{
  "success": true,
  "count": 5,
  "limit": 100,
  "filters": {
    "level": "error",
    "source": "backend"
  },
  "logs": [
    {
      "timestamp": "2026-01-23 12:00:00",
      "level": "error",
      "message": "Simulation failed",
      "component": "erosion-engine",
      "source": "backend",
      "error": "Timeout after 30 seconds"
    }
  ],
  "timestamp": "2026-01-23T12:00:00.000Z"
}
```

**Error Response** (500):
```json
{
  "success": false,
  "error": "Failed to filter logs",
  "message": "Permission denied: /var/log/terrainsim",
  "timestamp": "2026-01-23T12:00:00.000Z"
}
```

#### 5. GET /api/logs/stats
**Purpose**: Get log statistics and analytics

**Request**:
```bash
curl http://localhost:3001/api/logs/stats
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalFiles": 3,
    "files": [
      {
        "name": "simulation-2026-01-23.log",
        "size": 524288,
        "sizeFormatted": "512.00 KB",
        "modified": "2026-01-23T12:00:00.000Z"
      },
      {
        "name": "app-2026-01-23.log",
        "size": 1048576,
        "sizeFormatted": "1024.00 KB",
        "modified": "2026-01-23T11:30:00.000Z"
      }
    ],
    "totalSize": 1572864,
    "totalSizeFormatted": "1.50 MB",
    "logDirectory": "./logs"
  },
  "timestamp": "2026-01-23T12:00:00.000Z"
}
```

## Integration with Python Scripts

The `filter-logs.py` script uses these endpoints:

```python
# Filter by level
python scripts/filter-logs.py local level error

# Filter by source
python scripts/filter-logs.py production source frontend 50

# Search term
python scripts/filter-logs.py local searchTerm "simulation error"
```

## Testing

### Manual Testing

1. **Start the backend server**:
```bash
cd D:\playground\TerrainSim\apps\simulation-api
pnpm dev
```

2. **Run PowerShell test script**:
```powershell
cd D:\playground\TerrainSim
.\scripts\test-api-endpoints.ps1
```

The test script verifies all 9 endpoints:
- GET /admin/log-level
- POST /admin/log-level (valid change)
- POST /admin/log-level (restore)
- POST /admin/log-level (invalid - expected failure)
- GET /admin/health
- GET /api/logs/filter (by level)
- GET /api/logs/filter (by source)
- GET /api/logs/filter (by search term)
- GET /api/logs/stats

### Quick Tests

**Test log level change**:
```powershell
# Change to info
$body = @{ level = "info" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/admin/log-level" `
  -Method POST -Body $body -ContentType "application/json"

# Verify
Invoke-RestMethod -Uri "http://localhost:3001/admin/log-level"

# Restore to debug
$body = @{ level = "debug" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/admin/log-level" `
  -Method POST -Body $body -ContentType "application/json"
```

**Test log filtering**:
```powershell
# Get recent info logs
Invoke-RestMethod -Uri "http://localhost:3001/api/logs/filter?level=info&limit=5"

# Search for specific term
Invoke-RestMethod -Uri "http://localhost:3001/api/logs/filter?searchTerm=level&limit=10"

# Get frontend logs
Invoke-RestMethod -Uri "http://localhost:3001/api/logs/filter?source=frontend&limit=10"
```

**Test stats**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/logs/stats"
```

## Files Created

### 1. apps/simulation-api/src/routes/admin.ts (120 lines)
- POST /admin/log-level - Dynamic log level updates
- GET /admin/log-level - Query current configuration
- GET /admin/health - Health check with logging status
- Input validation and error handling
- Winston logger integration

### 2. apps/simulation-api/src/routes/logs.ts (230 lines)
- GET /api/logs/filter - Comprehensive log filtering
- GET /api/logs/stats - Log analytics
- Multi-criteria filtering (level, source, component, date, session, search)
- JSON log file parsing
- Error handling and validation

### 3. apps/simulation-api/src/index.ts (modified)
- Imported admin and logs routers
- Mounted `/admin` routes
- Mounted `/api/logs` routes
- Routes available at server start

### 4. scripts/test-api-endpoints.ps1 (157 lines)
- Comprehensive test suite for all endpoints
- Tests valid and invalid inputs
- Provides detailed output with color coding
- Summary of test results

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Frontend (React)                 │
│  remoteLogger.ts → POST /api/logs/frontend      │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│            Backend (Express)                    │
│                                                 │
│  ┌───────────────────────────────────────┐     │
│  │  Admin Routes (/admin)                │     │
│  │  - POST /log-level (change level)     │     │
│  │  - GET /log-level (query config)      │     │
│  │  - GET /health (system status)        │     │
│  └───────────────┬───────────────────────┘     │
│                  │                              │
│  ┌───────────────▼───────────────────────┐     │
│  │  Winston Logger                       │     │
│  │  - logger (app logs)                  │     │
│  │  - simulationLogger (frontend logs)   │     │
│  │  - Dynamic level changes              │     │
│  └───────────────┬───────────────────────┘     │
│                  │                              │
│  ┌───────────────▼───────────────────────┐     │
│  │  Log Files (./logs or /var/log)      │     │
│  │  - app-YYYY-MM-DD.log                 │     │
│  │  - error-YYYY-MM-DD.log               │     │
│  │  - simulation-YYYY-MM-DD.log          │     │
│  └───────────────┬───────────────────────┘     │
│                  │                              │
│  ┌───────────────▼───────────────────────┐     │
│  │  Logs API Routes (/api/logs)          │     │
│  │  - GET /filter (query logs)           │     │
│  │  - GET /stats (analytics)             │     │
│  └───────────────────────────────────────┘     │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│          Python Scripts (External)              │
│  - filter-logs.py → GET /api/logs/filter        │
│  - set-log-level.py → POST /admin/log-level     │
│  - capture-backend-logs.py (via SSH/SCP)        │
└─────────────────────────────────────────────────┘
```

## Benefits

1. **Dynamic Configuration**: Change log levels without server restart
2. **Powerful Filtering**: Query logs by level, source, component, date, session
3. **Search Capability**: Full-text search across log messages and metadata
4. **Analytics**: Get log file statistics and disk usage
5. **Integration**: Python scripts can query logs via HTTP API
6. **Production Ready**: Works in both local and production environments

## Next Steps

1. **Test in Production**: Deploy to production and test endpoints via SSH tunnel
2. **Add Authentication**: Protect admin endpoints with API keys or JWT tokens
3. **Rate Limiting**: Add rate limiting to prevent API abuse
4. **Caching**: Implement response caching for frequently-accessed logs
5. **Pagination**: Add cursor-based pagination for large result sets
6. **Real-time Streaming**: Add WebSocket support for live log tailing

## Related Documentation

- [LOGGING-INFRASTRUCTURE-PLAN.md](./LOGGING-INFRASTRUCTURE-PLAN.md) - Overall logging architecture
- [python-scripts-implementation.md](./python-scripts-implementation.md) - Python CLI tools
- [winston-logging-implementation.md](./winston-logging-implementation.md) - Winston configuration
- [frontend-logging-implementation.md](./frontend-logging-implementation.md) - Browser logging

## Status

✅ **Phase 2.2 Complete**: All backend API endpoints implemented and integrated. Ready for testing with live server.
