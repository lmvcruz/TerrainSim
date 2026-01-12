import { useRef, useMemo, useEffect } from 'react'
import { Mesh, DataTexture, RGBAFormat, FloatType } from 'three'

interface TerrainMeshProps {
  /**
   * Width of the terrain grid (number of segments along X axis)
   */
  width?: number
  /**
   * Height of the terrain grid (number of segments along Z axis)
   */
  height?: number
  /**
   * Physical width of the terrain mesh in world units
   */
  meshWidth?: number
  /**
   * Physical depth of the terrain mesh in world units
   */
  meshDepth?: number
  /**
   * Heightmap data as Float32Array (optional, defaults to flat terrain)
   */
  heightmap?: Float32Array
  /**
   * Enable wireframe rendering mode
   */
  wireframe?: boolean
}

// Vertex shader - displaces vertices based on heightmap texture
const vertexShader = `
  uniform sampler2D heightmapTexture;
  uniform float meshWidth;
  uniform float meshDepth;
  uniform float gridWidth;
  uniform float gridHeight;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    // Map vertex position to heightmap UV coordinates
    // Position goes from -meshWidth/2 to +meshWidth/2
    // UV goes from 0 to 1
    vec2 uv = vec2(
      (position.x / meshWidth) + 0.5,
      (position.y / meshDepth) + 0.5
    );

    // Sample heightmap texture (stored in red channel)
    float elevation = texture2D(heightmapTexture, uv).r;

    // Scale elevation to match world units
    float worldScale = meshWidth / gridWidth;
    float elevationInWorldUnits = elevation * worldScale;

    // Displace vertex in Z direction (after rotation, this becomes vertical)
    vec3 displacedPosition = position;
    displacedPosition.z = elevationInWorldUnits;

    // Calculate normal for lighting (approximate using neighboring samples)
    float offset = 1.0 / gridWidth;
    float hL = texture2D(heightmapTexture, uv + vec2(-offset, 0.0)).r * worldScale;
    float hR = texture2D(heightmapTexture, uv + vec2(offset, 0.0)).r * worldScale;
    float hD = texture2D(heightmapTexture, uv + vec2(0.0, -offset)).r * worldScale;
    float hU = texture2D(heightmapTexture, uv + vec2(0.0, offset)).r * worldScale;

    vec3 normal = normalize(vec3(hL - hR, hD - hU, 2.0 * offset * meshWidth));
    vNormal = normalMatrix * normal;

    vPosition = displacedPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`

// Fragment shader - applies lighting and elevation-based color gradient
const fragmentShader = `
  uniform vec3 terrainColor;
  uniform vec3 lightDirection;
  uniform vec3 ambientColor;
  uniform vec3 lightColor;
  uniform float minElevation;
  uniform float maxElevation;

  varying vec3 vNormal;
  varying vec3 vPosition;

  // Color gradient based on elevation
  vec3 getElevationColor(float elevation) {
    // Normalize elevation to 0-1 range
    float t = (elevation - minElevation) / (maxElevation - minElevation);
    t = clamp(t, 0.0, 1.0);

    // Define color stops for elevation gradient
    vec3 lowColor = vec3(0.13, 0.37, 0.57);   // Deep blue (water/low)
    vec3 midLowColor = vec3(0.23, 0.49, 0.27); // Green (valleys)
    vec3 midHighColor = vec3(0.55, 0.47, 0.33); // Brown (hills)
    vec3 highColor = vec3(0.95, 0.95, 0.95);   // White (peaks/snow)

    // Multi-stop gradient with smooth transitions
    vec3 color;
    if (t < 0.33) {
      // Low to mid-low (blue to green)
      float localT = t / 0.33;
      color = mix(lowColor, midLowColor, localT);
    } else if (t < 0.66) {
      // Mid-low to mid-high (green to brown)
      float localT = (t - 0.33) / 0.33;
      color = mix(midLowColor, midHighColor, localT);
    } else {
      // Mid-high to high (brown to white)
      float localT = (t - 0.66) / 0.34;
      color = mix(midHighColor, highColor, localT);
    }

    return color;
  }

  void main() {
    // Normalize the interpolated normal
    vec3 normal = normalize(vNormal);

    // Get base color from elevation
    vec3 baseColor = getElevationColor(vPosition.z);

    // Calculate diffuse lighting
    float diffuse = max(dot(normal, lightDirection), 0.0);

    // Combine ambient and diffuse lighting with elevation-based color
    vec3 finalColor = baseColor * (ambientColor + lightColor * diffuse);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

/**
 * TerrainMesh component renders a terrain using PlaneGeometry with GPU-based vertex displacement.
 *
 * The mesh uses a custom shader material that displaces vertices on the GPU based on a heightmap texture.
 * This approach is more performant than CPU-based displacement, especially for high-resolution terrains.
 */
export function TerrainMesh({
  width = 256,
  height = 256,
  meshWidth = 10,
  meshDepth = 10,
  heightmap,
  wireframe = false,
}: TerrainMeshProps) {
  const meshRef = useRef<Mesh>(null)

  // DEBUG: Log when component receives new props
  useEffect(() => {
    if (!heightmap || heightmap.length === 0) {
      console.log(
        '%c🎨 TerrainMesh Rendered',
        'background: #9333ea; color: white; padding: 4px 8px;',
        `\n  ⚠️  No heightmap data`
      )
      return
    }

    const centerIdx = Math.floor(heightmap.length / 2)
    const sum = Array.from(heightmap).reduce((a, b) => a + b, 0)
    const mean = sum / heightmap.length
    const min = Math.min(...heightmap)
    const max = Math.max(...heightmap)

    console.log(
      '%c🎨 TerrainMesh Rendered - RECEIVED HEIGHTMAP',
      'background: #9333ea; color: white; font-weight: bold; padding: 4px 8px;',
      `\n  Reference: Float32Array@${heightmap.byteOffset}`,
      `\n  Length: ${heightmap.length}`,
      `\n  Center value [${centerIdx}]: ${heightmap[centerIdx].toFixed(4)}`,
      `\n  First 5: [${Array.from(heightmap.slice(0, 5)).map(v => v.toFixed(2)).join(', ')}]`,
      `\n  Statistics: min=${min.toFixed(2)}, max=${max.toFixed(2)}, mean=${mean.toFixed(2)}`,
      `\n  Wireframe: ${wireframe}`
    )
  }, [heightmap, wireframe])

  // Convert heightmap Float32Array to DataTexture for GPU access
  const heightmapTexture = useMemo(() => {
    if (!heightmap) {
      console.log(
        '%c🖼️  Creating Flat Texture (no heightmap)',
        'background: #dc2626; color: white; padding: 4px 8px;'
      )
      // Create a flat heightmap if none provided
      const flatHeightmap = new Float32Array(width * height).fill(0)
      const data = new Float32Array(width * height * 4) // RGBA
      for (let i = 0; i < flatHeightmap.length; i++) {
        data[i * 4] = flatHeightmap[i] // R channel = elevation
        data[i * 4 + 1] = 0 // G channel unused
        data[i * 4 + 2] = 0 // B channel unused
        data[i * 4 + 3] = 1 // A channel = 1
      }
      const texture = new DataTexture(data, width, height, RGBAFormat, FloatType)
      texture.needsUpdate = true
      return texture
    }

    // Pack heightmap data into RGBA texture (elevation in red channel)
    const centerIdx = Math.floor(heightmap.length / 2)

    console.log(
      '%c🖼️  Creating GPU Texture from Heightmap',
      'background: #dc2626; color: white; font-weight: bold; padding: 4px 8px;',
      `\n  Input heightmap center: ${heightmap[centerIdx].toFixed(4)}`,
      `\n  Input first 5: [${Array.from(heightmap.slice(0, 5)).map(v => v.toFixed(2)).join(', ')}]`,
      `\n  Creating ${width}x${height} texture...`
    )

    const data = new Float32Array(width * height * 4)
    for (let i = 0; i < heightmap.length; i++) {
      data[i * 4] = heightmap[i] // R channel = elevation
      data[i * 4 + 1] = 0 // G channel unused
      data[i * 4 + 2] = 0 // B channel unused
      data[i * 4 + 3] = 1 // A channel = 1
    }

    console.log(
      '%c✅ Texture Data Packed',
      'background: #16a34a; color: white; font-weight: bold; padding: 4px 8px;',
      `\n  Texture center (R channel): ${data[centerIdx * 4].toFixed(4)}`,
      `\n  First 5 R values: [${[0,1,2,3,4].map(i => data[i*4].toFixed(2)).join(', ')}]`,
      `\n  Setting texture.needsUpdate = true`
    )

    const texture = new DataTexture(data, width, height, RGBAFormat, FloatType)
    texture.needsUpdate = true
    return texture
  }, [heightmap, width, height])

  // Shader uniforms - include heightmap in dependencies so uniforms update when data changes
  const uniforms = useMemo(() => {
    // Calculate min and max elevation from heightmap
    let minElevation = 0
    let maxElevation = 0

    if (heightmap && heightmap.length > 0) {
      minElevation = Math.min(...heightmap)
      maxElevation = Math.max(...heightmap)

      // Ensure there's a valid range
      if (maxElevation === minElevation) {
        maxElevation = minElevation + 1
      }
    }

    console.log(
      '%c🎮 Uniforms Updated',
      'background: #7c3aed; color: white; font-weight: bold; padding: 4px 8px;',
      `\n  Texture version: ${heightmapTexture?.version ?? 'null'}`,
      `\n  Min elevation: ${minElevation.toFixed(2)}`,
      `\n  Max elevation: ${maxElevation.toFixed(2)}`
    )

    return {
      heightmapTexture: { value: heightmapTexture },
      meshWidth: { value: meshWidth },
      meshDepth: { value: meshDepth },
      gridWidth: { value: width },
      gridHeight: { value: height },
      terrainColor: { value: [0.23, 0.49, 0.27] }, // #3a7d44 in RGB (legacy, not used in new shader)
      lightDirection: { value: [0.5, 0.5, 0.7] }, // Normalized light direction
      ambientColor: { value: [0.3, 0.3, 0.3] }, // Ambient light
      lightColor: { value: [0.7, 0.7, 0.7] }, // Directional light color
      minElevation: { value: minElevation },
      maxElevation: { value: maxElevation },
    }
  }, [heightmapTexture, meshWidth, meshDepth, width, height, heightmap])

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to make it horizontal (XZ plane)
      position={[0, 0, 0]}
    >
      <planeGeometry args={[meshWidth, meshDepth, width - 1, height - 1]} />
      <shaderMaterial
        key={heightmapTexture?.uuid ?? 'no-texture'} // Force remount when texture changes
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        wireframe={wireframe}
      />
    </mesh>
  )
}
