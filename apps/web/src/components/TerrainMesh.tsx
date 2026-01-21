import { useRef, useMemo, useEffect } from 'react'
import { Mesh, DataTexture, RGBAFormat, FloatType } from 'three'
import { logger } from '../utils/logger'

const componentLogger = logger.withContext('TerrainMesh')

export type TextureMode = 'landscape' | 'none'

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
  /**
   * Texture mode for terrain coloring
   */
  textureMode?: TextureMode
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

// Fragment shader for LANDSCAPE mode - applies lighting and elevation-based color gradient
const fragmentShaderLandscape = `
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
    vec3 normal = normalize(vNormal);
    vec3 baseColor = getElevationColor(vPosition.z);

    // Calculate diffuse lighting
    float diffuse = max(dot(normal, lightDirection), 0.0);

    // Combine ambient and diffuse lighting with base color
    vec3 finalColor = baseColor * (ambientColor + lightColor * diffuse);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Fragment shader for NONE mode - uniform gray with lighting based on normals
const fragmentShaderNone = `
  uniform vec3 lightDirection;
  uniform vec3 ambientColor;
  uniform vec3 lightColor;

  varying vec3 vNormal;

  void main() {
    // Uniform gray base color (no elevation-based gradient)
    vec3 baseColor = vec3(0.5, 0.5, 0.5);

    // Calculate lighting based on surface normals
    vec3 normal = normalize(vNormal);
    float diffuse = max(dot(normal, lightDirection), 0.0);

    // Apply lighting to show terrain shape through shadows
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
  textureMode = 'landscape',
}: TerrainMeshProps) {
  const meshRef = useRef<Mesh>(null)

  // DEBUG: Component render with texture mode
  console.log(`🔄🔄🔄 TerrainMesh RENDER with textureMode: ${textureMode}`);

  // DEBUG: Log when component receives new props
  useEffect(() => {
    if (!heightmap || heightmap.length === 0) {
      componentLogger.warn('Rendered without heightmap data')
      return
    }

    const centerIdx = Math.floor(heightmap.length / 2)
    const sum = Array.from(heightmap).reduce((a, b) => a + b, 0)
    const mean = sum / heightmap.length

    // Find min/max without spreading array (avoids stack overflow on large arrays)
    let min = heightmap[0]
    let max = heightmap[0]
    for (let i = 1; i < heightmap.length; i++) {
      if (heightmap[i] < min) min = heightmap[i]
      if (heightmap[i] > max) max = heightmap[i]
    }

    componentLogger.debug('🎨 TerrainMesh received NEW heightmap prop', {
      reference: `Float32Array@${heightmap.byteOffset}`,
      length: heightmap.length,
      centerValue: heightmap[centerIdx].toFixed(4),
      firstFive: Array.from(heightmap.slice(0, 5)).map(v => v.toFixed(4)),
      statistics: { min: min.toFixed(2), max: max.toFixed(2), mean: mean.toFixed(2) },
      wireframe,
    })
  }, [heightmap, wireframe])

  // Convert heightmap Float32Array to DataTexture for GPU access
  // Create texture once, update it when heightmap changes
  const heightmapTexture = useMemo(() => {
    const data = new Float32Array(width * height * 4)
    const texture = new DataTexture(data, width, height, RGBAFormat, FloatType)
    componentLogger.debug('🖼️ Created GPU texture (initial)')
    return texture
  }, [width, height])

  // Update texture data whenever heightmap changes
  useEffect(() => {
    if (!heightmap) {
      componentLogger.debug('🖼️ Updating texture with flat heightmap (no data)')
      const flatHeightmap = new Float32Array(width * height).fill(0)
      const data = new Float32Array(width * height * 4) // RGBA
      for (let i = 0; i < flatHeightmap.length; i++) {
        data[i * 4] = flatHeightmap[i] // R channel = elevation
        data[i * 4 + 1] = 0 // G channel unused
        data[i * 4 + 2] = 0 // B channel unused
        data[i * 4 + 3] = 1 // A channel = 1
      }
      if (heightmapTexture.image) {
        heightmapTexture.image.data = data
      }
      heightmapTexture.needsUpdate = true
      return
    }

    // Pack heightmap data into RGBA texture (elevation in red channel)
    const centerIdx = Math.floor(heightmap.length / 2)
    const data = new Float32Array(width * height * 4)
    for (let i = 0; i < heightmap.length; i++) {
      data[i * 4] = heightmap[i] // R channel = elevation
      data[i * 4 + 1] = 0 // G channel unused
      data[i * 4 + 2] = 0 // B channel unused
      data[i * 4 + 3] = 1 // A channel = 1
    }

    componentLogger.group('🖼️ Updating GPU Texture', () => {
      componentLogger.debug('Input heightmap', {
        center: heightmap[centerIdx].toFixed(4),
        firstFive: Array.from(heightmap.slice(0, 5)).map(v => v.toFixed(4)),
        size: `${width}x${height}`,
      })

      componentLogger.debug('Texture data packed', {
        centerR: data[centerIdx * 4].toFixed(4),
        firstFiveR: [0,1,2,3,4].map(i => data[i*4].toFixed(4)),
        needsUpdate: true,
      })
    }, true)

    if (heightmapTexture.image) {
      heightmapTexture.image.data = data
    }
    heightmapTexture.needsUpdate = true
    console.log('✨ GPU TEXTURE UPDATED - needsUpdate set to true');
    console.log('   Sample values:', heightmap.slice(0, 5));

    // Find min/max without spreading (avoids stack overflow)
    let consoleMin = heightmap[0], consoleMax = heightmap[0];
    for (let i = 1; i < heightmap.length; i++) {
      if (heightmap[i] < consoleMin) consoleMin = heightmap[i];
      if (heightmap[i] > consoleMax) consoleMax = heightmap[i];
    }
    console.log('   Statistics:', { min: consoleMin, max: consoleMax });
  }, [heightmap, width, height, heightmapTexture])

  // Shader uniforms - include heightmap in dependencies so uniforms update when data changes
  const uniforms = useMemo(() => {
    // Calculate min and max elevation from heightmap
    let minElevation = 0
    let maxElevation = 0

    if (heightmap && heightmap.length > 0) {
      // Find min/max without spreading array (avoids stack overflow on large arrays)
      minElevation = heightmap[0]
      maxElevation = heightmap[0]
      for (let i = 1; i < heightmap.length; i++) {
        if (heightmap[i] < minElevation) minElevation = heightmap[i]
        if (heightmap[i] > maxElevation) maxElevation = heightmap[i]
      }

      // Ensure there's a valid range
      if (maxElevation === minElevation) {
        maxElevation = minElevation + 1
      }
    }

    const textureModeValue = textureMode === 'landscape' ? 0.0 : 1.0;

    componentLogger.debug('🎮 Uniforms updated', {
      textureVersion: heightmapTexture?.version ?? null,
      minElevation: minElevation.toFixed(2),
      maxElevation: maxElevation.toFixed(2),
      textureMode: textureModeValue,
      textureModeString: textureMode,
      shouldBeFlat: textureModeValue === 1,
    })

    // Only include uniforms needed by the current shader
    if (textureMode === 'landscape') {
      return {
        heightmapTexture: { value: heightmapTexture },
        meshWidth: { value: meshWidth },
        meshDepth: { value: meshDepth },
        gridWidth: { value: width },
        gridHeight: { value: height },
        lightDirection: { value: [0.5, 0.5, 0.7] },
        ambientColor: { value: [0.3, 0.3, 0.3] },
        lightColor: { value: [0.7, 0.7, 0.7] },
        minElevation: { value: minElevation },
        maxElevation: { value: maxElevation },
      }
    } else {
      // None mode - gray color with lighting (no elevation gradient)
      return {
        heightmapTexture: { value: heightmapTexture },
        meshWidth: { value: meshWidth },
        meshDepth: { value: meshDepth },
        gridWidth: { value: width },
        gridHeight: { value: height },
        lightDirection: { value: [0.5, 0.5, 0.7] },
        ambientColor: { value: [0.3, 0.3, 0.3] },
        lightColor: { value: [0.7, 0.7, 0.7] },
      }
    }
  }, [heightmapTexture, meshWidth, meshDepth, width, height, heightmap, textureMode])

  // Select the appropriate fragment shader based on texture mode
  const fragmentShader = textureMode === 'landscape' ? fragmentShaderLandscape : fragmentShaderNone;

  componentLogger.debug('🎨 Fragment shader selected', {
    textureMode,
    shaderType: textureMode === 'landscape' ? 'LANDSCAPE (with gradient)' : 'NONE (flat gray)',
    shaderLength: fragmentShader.length,
    shaderPreview: fragmentShader.substring(0, 100),
  });

  // Manually update shader when texture mode changes
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      console.log(`🔄 Updating shader for texture mode: ${textureMode}`);

      // Update the fragment shader code
      material.fragmentShader = fragmentShader;

      // Mark the material as needing a shader recompile
      material.needsUpdate = true;

      console.log(`✅ Shader updated and marked for recompile`);
    }
  }, [textureMode, fragmentShader]);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to make it horizontal (XZ plane)
      position={[0, 0, 0]}
    >
      <planeGeometry args={[meshWidth, meshDepth, width - 1, height - 1]} />
      {textureMode === 'landscape' ? (
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShaderLandscape}
          uniforms={uniforms}
          wireframe={wireframe}
        />
      ) : (
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShaderNone}
          uniforms={uniforms}
          wireframe={wireframe}
        />
      )}
    </mesh>
  )
}
