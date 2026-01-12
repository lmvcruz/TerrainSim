# Debugging Terrain Update Issues

## The Problem

After changing noise parameters and clicking "Generate Terrain", the 3D mesh doesn't visually update with the new terrain data.

## Why Standard Tests Can't Detect This

1. **JSDOM Limitations**: Our unit/integration tests run in JSDOM, which cannot render WebGL/Three.js content
2. **State vs Visual**: Tests can verify React state changes and API calls, but not actual 3D rendering
3. **Three.js Internals**: The issue might be in how Three.js updates textures/geometry, which happens outside React's control

## Debugging Approach

I've added **console logging** throughout the terrain update flow. This will help you see exactly where the update chain breaks.

### What I Added:

#### 1. **App.tsx** - State Update Tracking
- Logs when API response is received
- Logs when `new Float32Array` is created
- Logs when `setHeightmap()` is called

#### 2. **TerrainMesh.tsx** - Component Update Tracking
- Logs every time component renders
- Logs when heightmap texture is recreated (useMemo)
- Shows first 3 heightmap values for comparison

### How to Use:

1. **Start the application:**
   ```bash
   pnpm --filter @terrain-sim/api run dev  # Terminal 1
   pnpm --filter @terrain/web run dev       # Terminal 2
   ```

2. **Open browser DevTools** (F12) and go to the **Console** tab

3. **Perform the test:**
   - Change frequency slider from 0.05 to 0.08
   - Click "Generate Terrain"
   - Watch the console output

### Expected Console Output (If Working):

```
🌐 API Call #2 - /generate
  Parameters: { seed: 42, frequency: 0.08, ... }

✅ API Response #2
  Data length: 16384
  Statistics: { min: -39.34, max: 44.58, ... }
  First 5 values: [-9.32, ...]

📥 Setting New Heightmap State
  Data length: 16384
  First 3 values: [-9.32, ...]
  Creating new Float32Array...

🔄 Calling setHeightmap()
  New heightmap created: Float32Array(16384) [...]
  This should trigger TerrainMesh re-render!

🎨 TerrainMesh Rendered
  Heightmap length: 16384
  First 3 values: [-9.32, ...]

🖼️ Creating New Heightmap Texture
  This should happen when heightmap changes!
```

### Diagnosing the Issue:

#### ✅ **If you see all these logs:**
- The React flow is working correctly
- The issue is in **Three.js texture update**
- Solution: Force texture refresh with `texture.needsUpdate = true`

#### ⚠️ **If "Creating New Heightmap Texture" doesn't appear:**
- React's `useMemo` is not detecting the change
- Possible causes:
  - Dependencies not configured correctly
  - React optimization preventing update
- Solution: Add more dependencies or use `useEffect` instead

#### ❌ **If "TerrainMesh Rendered" doesn't appear:**
- React is not re-rendering the component
- Possible causes:
  - `heightmap` reference not changing
  - Component wrapped in `React.memo()` without proper comparison
- Solution: Verify `setHeightmap(new Float32Array(data.data))` creates new reference

#### 🔴 **If API call doesn't show frequency 0.08:**
- Issue is in the UI state management
- NoiseParametersPanel not updating parameters correctly
- Solution: Check parameter state flow in NoiseParametersPanel

## Common Fixes:

### Fix 1: Force Texture Update
In `TerrainMesh.tsx`, ensure texture always updates:

```typescript
const texture = new DataTexture(data, width, height, RGBAFormat, FloatType)
texture.needsUpdate = true
texture.version++ // Force Three.js to recognize change
return texture
```

### Fix 2: Use Key Prop
Force complete component remount when data changes:

```tsx
<TerrainMesh
  key={heightmap.length} // Changes when heightmap changes
  heightmap={heightmap}
  // ... other props
/>
```

### Fix 3: UseEffect Instead of UseMemo
Replace the useMemo for texture with useEffect:

```typescript
const [heightmapTexture, setHeightmapTexture] = useState(...)

useEffect(() => {
  const texture = new DataTexture(...)
  texture.needsUpdate = true
  setHeightmapTexture(texture)

  return () => texture.dispose() // Cleanup
}, [heightmap])
```

## Next Steps:

1. Run the application with these debug logs
2. Share the console output here
3. Based on what you see, we'll identify the exact breaking point
4. Apply the appropriate fix

The console logs will tell us **exactly** where the update chain breaks! 🔍
