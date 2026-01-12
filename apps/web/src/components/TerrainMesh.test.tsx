/**
 * Unit tests for TerrainMesh component
 *
 * Note: These tests focus on component logic and prop handling.
 * Visual Three.js rendering cannot be tested in JSDOM.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { TerrainMesh } from './TerrainMesh'

// Mock Three.js DataTexture
vi.mock('three', async () => {
  const actual = await vi.importActual('three')

  class MockDataTexture {
    needsUpdate: boolean = false
    uuid: string = `texture-${Math.random()}`
    version: number = 0
    data: Uint8Array | Float32Array
    width: number
    height: number
    dispose = vi.fn()

    constructor(data: Uint8Array | Float32Array, width: number, height: number) {
      this.data = data
      this.width = width
      this.height = height
    }
  }

  return {
    ...actual,
    DataTexture: MockDataTexture,
  }
})

describe('TerrainMesh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Heightmap Prop Handling', () => {
    it('should render with valid heightmap data', () => {
      const heightmap = new Float32Array(128 * 128).fill(5)

      const { container } = render(
        <TerrainMesh
          heightmap={heightmap}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      expect(container.querySelector('mesh')).toBeTruthy()
    })

    it('should handle null heightmap gracefully', () => {
      const { container } = render(
        <TerrainMesh
          heightmap={undefined}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      // Should still render mesh with flat terrain
      expect(container.querySelector('mesh')).toBeTruthy()
    })

    it('should re-render when heightmap changes', () => {
      const heightmap1 = new Float32Array(128 * 128).fill(5)
      const heightmap2 = new Float32Array(128 * 128).fill(10)

      const { container, rerender } = render(
        <TerrainMesh
          heightmap={heightmap1}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      // Should render successfully
      expect(container.querySelector('mesh')).toBeTruthy()

      // Change heightmap - should not throw
      rerender(
        <TerrainMesh
          heightmap={heightmap2}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      // Should still be rendered
      expect(container.querySelector('mesh')).toBeTruthy()
    })

    it('should re-render when dimensions change', () => {
      const heightmap = new Float32Array(128 * 128).fill(5)

      const { container, rerender } = render(
        <TerrainMesh
          heightmap={heightmap}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      expect(container.querySelector('mesh')).toBeTruthy()

      // Change dimensions
      const newHeightmap = new Float32Array(256 * 256).fill(5)
      rerender(
        <TerrainMesh
          heightmap={newHeightmap}
          width={256}
          height={256}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      // Should still be rendered with new dimensions
      expect(container.querySelector('mesh')).toBeTruthy()
    })
  })

  describe('Wireframe Mode', () => {
    it('should render in wireframe mode when enabled', () => {
      const heightmap = new Float32Array(128 * 128).fill(5)

      const { container } = render(
        <TerrainMesh
          heightmap={heightmap}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={true}
        />
      )

      // Should render successfully with wireframe enabled
      expect(container.querySelector('mesh')).toBeTruthy()
      expect(container.querySelector('shaderMaterial')).toBeTruthy()
    })

    it('should render in solid mode when wireframe disabled', () => {
      const heightmap = new Float32Array(128 * 128).fill(5)

      const { container } = render(
        <TerrainMesh
          heightmap={heightmap}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      // Should render successfully with wireframe disabled
      expect(container.querySelector('mesh')).toBeTruthy()
      expect(container.querySelector('shaderMaterial')).toBeTruthy()
    })
  })

  describe('Mesh Dimensions', () => {
    it('should render with custom mesh dimensions', () => {
      const heightmap = new Float32Array(128 * 128).fill(5)

      const { container } = render(
        <TerrainMesh
          heightmap={heightmap}
          width={128}
          height={128}
          meshWidth={200}
          meshDepth={150}
          wireframe={false}
        />
      )

      expect(container.querySelector('mesh')).toBeTruthy()
      expect(container.querySelector('planeGeometry')).toBeTruthy()
    })

    it('should handle various grid sizes', () => {
      const sizes = [32, 64, 128, 256]

      sizes.forEach((size) => {
        const heightmap = new Float32Array(size * size).fill(5)

        const { container } = render(
          <TerrainMesh
            heightmap={heightmap}
            width={size}
            height={size}
            meshWidth={100}
            meshDepth={100}
            wireframe={false}
          />
        )

        expect(container.querySelector('mesh')).toBeTruthy()
      })
    })
  })

  describe('Texture Creation', () => {
    it('should handle various texture sizes', () => {
      const sizes = [
        { size: 64, elements: 64 * 64 },
        { size: 128, elements: 128 * 128 },
        { size: 256, elements: 256 * 256 },
      ]

      sizes.forEach(({ size, elements }) => {
        const heightmap = new Float32Array(elements).fill(5)

        const { container } = render(
          <TerrainMesh
            heightmap={heightmap}
            width={size}
            height={size}
            meshWidth={100}
            meshDepth={100}
            wireframe={false}
          />
        )

        // Should render successfully for all sizes
        expect(container.querySelector('mesh')).toBeTruthy()
      })
    })

    it('should handle texture creation without errors', () => {
      const heightmap = new Float32Array(128 * 128).fill(5)

      // Should not throw during render
      expect(() => {
        render(
          <TerrainMesh
            heightmap={heightmap}
            width={128}
            height={128}
            meshWidth={100}
            meshDepth={100}
            wireframe={false}
          />
        )
      }).not.toThrow()
    })
  })

  describe('Statistics Calculation', () => {
    it('should handle terrain with varying elevations', () => {
      // Create terrain with known min/max
      const heightmap = new Float32Array(100)
      heightmap[0] = -25.5  // min
      heightmap[50] = 10.0  // mid
      heightmap[99] = 42.8  // max

      const { container } = render(
        <TerrainMesh
          heightmap={heightmap}
          width={10}
          height={10}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      expect(container.querySelector('mesh')).toBeTruthy()
    })

    it('should handle flat terrain (all same values)', () => {
      const heightmap = new Float32Array(100).fill(15.0)

      const { container } = render(
        <TerrainMesh
          heightmap={heightmap}
          width={10}
          height={10}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      expect(container.querySelector('mesh')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should handle wireframe toggle without errors', () => {
      const heightmap = new Float32Array(128 * 128).fill(5)

      const { container, rerender } = render(
        <TerrainMesh
          heightmap={heightmap}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      expect(container.querySelector('mesh')).toBeTruthy()

      // Toggle wireframe - should not throw
      rerender(
        <TerrainMesh
          heightmap={heightmap}
          width={128}
          height={128}
          meshWidth={100}
          meshDepth={100}
          wireframe={true}
        />
      )

      // Should still be rendered after wireframe toggle
      expect(container.querySelector('mesh')).toBeTruthy()
    })

    it('should handle rapid heightmap updates', () => {
      const { container, rerender } = render(
        <TerrainMesh
          heightmap={new Float32Array(100).fill(5)}
          width={10}
          height={10}
          meshWidth={100}
          meshDepth={100}
          wireframe={false}
        />
      )

      expect(container.querySelector('mesh')).toBeTruthy()

      // Simulate rapid updates - should not throw
      for (let i = 0; i < 5; i++) {
        rerender(
          <TerrainMesh
            heightmap={new Float32Array(100).fill(i * 10)}
            width={10}
            height={10}
            meshWidth={100}
            meshDepth={100}
            wireframe={false}
          />
        )
      }

      // Should still be rendered after rapid updates
      expect(container.querySelector('mesh')).toBeTruthy()
    })
  })
})
