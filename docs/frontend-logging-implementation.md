# Frontend Remote Logging - Implementation Summary

## ✅ Completed Tasks

### 1. Remote Logger Created
**File**: `apps/web/src/utils/remote-logger.ts`

**Features**:
- Batching with 5-second flush interval
- Session ID generation and storage (sessionStorage)
- Auto-flush on errors
- Auto-flush on page unload
- Environment-based configuration
- Console mirroring for immediate visibility
- Max buffer size (50 entries)

### 2. Backend Endpoint Created
**File**: `apps/simulation-api/src/routes/frontend-logs.ts`

**Endpoint**: `POST /api/logs/frontend`

**Features**:
- Receives batched logs from frontend
- Writes to Winston simulation logger
- Tags logs with `source: 'frontend'`
- Error logs also written to main app log
- Returns success/failure status

### 3. Environment Configuration
Created environment files for frontend:

**`.env.development`**:
```bash
VITE_API_URL=http://localhost:3001
VITE_LOG_LEVEL=trace
VITE_REMOTE_LOGGING=true
VITE_LOG_ENDPOINT=/api/logs/frontend
```

**`.env.production`**:
```bash
VITE_API_URL=https://api.lmvcruz.work
VITE_LOG_LEVEL=info
VITE_REMOTE_LOGGING=true
VITE_LOG_ENDPOINT=/api/logs/frontend
```

**`.env.example`** - Template with comments

### 4. Backend Integration
- Imported frontend logs router in `index.ts`
- Mounted at `/api/logs` path
- CORS already configured for all origins in development

### 5. Test Component Created
**File**: `apps/web/src/components/TestRemoteLogging.tsx`

Features:
- Demonstrates all log levels
- Shows session ID
- Timed logs (2s warning, 4s error)
- Manual log button
- Visual feedback

## 📊 How It Works

### Frontend Flow
```
1. Component calls: remoteLogger.info('message', data, 'component')
2. Log added to buffer with session ID
3. Buffer flushes every 5 seconds (or immediately on error/full)
4. POST request to backend: /api/logs/frontend
5. Backend writes to Winston simulation log
```

### Log Entry Format
```json
{
  "timestamp": "2026-01-23T11:48:00.000Z",
  "level": "info",
  "message": "Component mounted",
  "component": "TerrainMesh",
  "data": { "vertices": 1024 },
  "sessionId": "session-1737633480000-abc123",
  "userAgent": "Mozilla/5.0...",
  "url": "http://localhost:5173/",
  "source": "frontend"
}
```

### Backend Storage
Frontend logs are written to:
- `simulation-YYYY-MM-DD.log` (all frontend logs)
- `app-YYYY-MM-DD.log` (frontend errors only)

Logs include `source: 'frontend'` tag for easy filtering.

## 🧪 Testing

### Test in Browser
1. Start both frontend and backend:
   ```bash
   cd apps/simulation-api
   npm run dev

   # In another terminal
   cd apps/web
   npm run dev
   ```

2. Import test component in `App.tsx`:
   ```typescript
   import { TestRemoteLogging } from './components/TestRemoteLogging';

   function App() {
     return (
       <div>
         <TestRemoteLogging />
         {/* rest of your app */}
       </div>
     );
   }
   ```

3. Open browser to `http://localhost:5173`
4. Open browser console - logs appear locally
5. Check backend logs - logs also sent to backend

### Verify Backend Logs
```bash
# View simulation log (contains frontend logs)
tail -f apps/simulation-api/logs/simulation-$(date +%Y-%m-%d).log

# Filter for frontend logs only
grep '"source":"frontend"' apps/simulation-api/logs/simulation-*.log | jq .
```

## 📝 Usage Examples

### Basic Usage
```typescript
import { remoteLogger } from './utils/remote-logger';

// Simple logs
remoteLogger.info('User logged in');
remoteLogger.warn('API rate limit approaching');
remoteLogger.error('Failed to load data');

// With data
remoteLogger.info('Terrain generated', {
  width: 256,
  height: 256,
  seed: 12345,
  duration: 234
});

// With component context
remoteLogger.debug('Rendering frame', { fps: 60 }, 'TerrainRenderer');
```

### In React Components
```typescript
import { useEffect } from 'react';
import { remoteLogger } from '../utils/remote-logger';

function MyComponent() {
  useEffect(() => {
    remoteLogger.info('Component mounted', {}, 'MyComponent');

    return () => {
      remoteLogger.info('Component unmounted', {}, 'MyComponent');
    };
  }, []);

  const handleClick = () => {
    remoteLogger.info('Button clicked', { button: 'generate' }, 'MyComponent');
  };

  return <button onClick={handleClick}>Generate</button>;
}
```

### Error Handling
```typescript
try {
  await generateTerrain();
} catch (error) {
  remoteLogger.error('Terrain generation failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  }, 'TerrainGenerator');
}
```

## 🔧 Configuration

### Change Log Level
Edit `.env.development` or `.env.production`:
```bash
# trace - most detailed (development)
# debug - debugging info
# info - general info (production default)
# warn - warnings only
# error - errors only
VITE_LOG_LEVEL=info
```

### Disable Remote Logging
```bash
VITE_REMOTE_LOGGING=false
```

### Change Flush Interval
Edit `remote-logger.ts`:
```typescript
private flushInterval = 5000; // Change to desired milliseconds
```

## 🚀 Production Deployment

1. Ensure `.env.production` is configured:
   ```bash
   VITE_API_URL=https://api.lmvcruz.work
   VITE_LOG_LEVEL=info
   VITE_REMOTE_LOGGING=true
   ```

2. Build frontend:
   ```bash
   cd apps/web
   npm run build
   ```

3. Deploy to Cloudflare Pages (automatic on push to main)

4. Backend should already have the endpoint deployed

5. Test production logging:
   - Open production site
   - Open browser console
   - Perform actions
   - Check backend logs on EC2:
     ```bash
     ssh ubuntu@54.242.131.12
     tail -f /var/log/terrainsim/simulation-$(date +%Y-%m-%d).log | grep frontend
     ```

## 🎯 Success Criteria

- ✅ Remote logger created with batching
- ✅ Session ID generation working
- ✅ Backend endpoint receives and stores logs
- ✅ Frontend logs tagged with `source: 'frontend'`
- ✅ Errors flushed immediately
- ✅ Environment-based configuration
- ✅ Test component demonstrates usage
- ✅ CORS configured correctly

## 📈 Monitoring

### View Frontend Logs
```bash
# All frontend logs
grep '"source":"frontend"' logs/simulation-*.log | jq .

# By level
grep '"level":"error"' logs/simulation-*.log | grep frontend | jq .

# By session
grep '"sessionId":"session-xxx"' logs/simulation-*.log | jq .

# By component
grep '"component":"TerrainMesh"' logs/simulation-*.log | jq .
```

### Log Volume
```bash
# Count frontend logs today
grep -c '"source":"frontend"' logs/simulation-$(date +%Y-%m-%d).log

# Errors only
grep '"source":"frontend"' logs/simulation-*.log | grep -c '"level":"error"'
```

## 🔗 Related Files

- `apps/web/src/utils/remote-logger.ts` - Frontend logger
- `apps/simulation-api/src/routes/frontend-logs.ts` - Backend endpoint
- `apps/web/src/components/TestRemoteLogging.tsx` - Test component
- `apps/web/.env.{development,production,example}` - Frontend config
- `apps/simulation-api/src/index.ts` - Route mounting

---

**Implementation Date**: January 23, 2026
**Status**: ✅ Phase 1.2 COMPLETE (Local Development)
**Next Phase**: 1.3 Deployment Log Capture

---

## 🎯 Phase 1.2 Summary

**✅ All 9 tasks completed:**
1. ✅ Remote logger with batching created
2. ✅ 5-second flush interval implemented
3. ✅ Session ID generation working
4. ✅ Backend endpoint created
5. ✅ POST /api/logs/frontend handler implemented
6. ✅ CORS pre-configured
7. ✅ Environment variables added
8. ✅ Usage examples documented
9. ✅ Test component created

**Ready for**: Phase 1.3 (Deployment Log Capture) or Phase 2 (Management Scripts)
