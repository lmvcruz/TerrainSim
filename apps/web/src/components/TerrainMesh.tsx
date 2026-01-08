import { useRef } from 'react'
import { Mesh } from 'three'

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
}

/**
 * TerrainMesh component renders a terrain using PlaneGeometry with optional heightmap displacement.
 *
 * The mesh uses a plane geometry subdivided into segments that match the heightmap resolution.
 * When a heightmap is provided, vertex heights are displaced according to the elevation data.
 */
export function TerrainMesh({
  width = 256,
  height = 256,
  meshWidth = 10,
  meshDepth = 10,
  heightmap,
}: TerrainMeshProps) {
  const meshRef = useRef<Mesh>(null)

  // Apply heightmap displacement to geometry vertices
  // This will be called when the geometry is created and when heightmap changes
  const applyHeightmap = (geometry: THREE.PlaneGeometry) => {
    if (!heightmap) return

    const positions = geometry.attributes.position
    const vertexCount = positions.count

    // Ensure heightmap matches expected vertex count
    if (heightmap.length !== vertexCount) {
      console.warn(
        `Heightmap size (${heightmap.length}) doesn't match vertex count (${vertexCount})`
      )
      return
    }

    // PlaneGeometry creates vertices in a grid starting from bottom-left
    // Our heightmap is in row-major order (top-left to bottom-right)
    // We need to map correctly considering the plane is rotated -90° around X

    // For a plane with widthSegments and heightSegments:
    // - X goes from -width/2 to +width/2 (left to right)
    // - Y goes from -height/2 to +height/2 (bottom to top)
    // After rotation by -90° around X, Y becomes Z

    for (let i = 0; i < vertexCount; i++) {
      // Get the current vertex position
      const x = positions.getX(i)
      const y = positions.getY(i)

      // Map from mesh coordinates to heightmap grid coordinates
      // Plane goes from -meshWidth/2 to +meshWidth/2
      // Heightmap goes from 0 to width-1
      const gridX = Math.round(((x / meshWidth) + 0.5) * (width - 1))
      const gridY = Math.round(((y / meshDepth) + 0.5) * (height - 1))

      // Clamp to valid range
      const clampedX = Math.max(0, Math.min(width - 1, gridX))
      const clampedY = Math.max(0, Math.min(height - 1, gridY))

      // Get elevation from heightmap (row-major order)
      const heightmapIndex = clampedY * width + clampedX
      const elevation = heightmap[heightmapIndex]

      // Scale elevation to match world units
      // Heightmap values are in grid units, we need to convert to world units
      // The mesh spans meshWidth world units across width grid cells
      // So: worldScale = meshWidth / width
      const worldScale = meshWidth / width
      const elevationInWorldUnits = elevation * worldScale

      // Set the Z coordinate to the elevation value
      // (before rotation this is Y, after rotation it becomes Z)
      positions.setZ(i, elevationInWorldUnits)
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals() // Recompute normals for proper lighting
  }

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to make it horizontal (XZ plane)
      position={[0, 0, 0]}
    >
      <planeGeometry
        args={[meshWidth, meshDepth, width - 1, height - 1]}
        onUpdate={(geometry) => applyHeightmap(geometry)}
      />
      <meshStandardMaterial
        color="#3a7d44"
        wireframe={false}
        flatShading={false}
      />
    </mesh>
  )
}
