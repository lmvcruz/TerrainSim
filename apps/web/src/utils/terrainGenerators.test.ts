import { describe, it, expect } from 'vitest'
import { generateSemiSphere, generateCone, generateFlat } from './terrainGenerators'

describe('terrainGenerators', () => {
  describe('generateFlat', () => {
    it('creates a flat heightmap with default elevation 0', () => {
      const width = 10
      const height = 10
      const heightmap = generateFlat(width, height)

      expect(heightmap).toBeInstanceOf(Float32Array)
      expect(heightmap.length).toBe(width * height)
      expect(Array.from(heightmap).every(val => val === 0.0)).toBe(true)
    })

    it('creates a flat heightmap with specified elevation', () => {
      const width = 5
      const height = 5
      const elevation = 42.5
      const heightmap = generateFlat(width, height, elevation)

      expect(heightmap.length).toBe(25)
      expect(Array.from(heightmap).every(val => val === elevation)).toBe(true)
    })

    it('handles negative elevation values', () => {
      const heightmap = generateFlat(3, 3, -10.5)
      expect(Array.from(heightmap).every(val => val === -10.5)).toBe(true)
    })

    it('handles single cell', () => {
      const heightmap = generateFlat(1, 1, 100)
      expect(heightmap.length).toBe(1)
      expect(heightmap[0]).toBe(100)
    })

    it('handles large dimensions efficiently', () => {
      const width = 512
      const height = 512
      const heightmap = generateFlat(width, height, 5.0)

      expect(heightmap.length).toBe(width * height)
      expect(heightmap[0]).toBe(5.0)
      expect(heightmap[heightmap.length - 1]).toBe(5.0)
    })
  })

  describe('generateSemiSphere', () => {
    it('creates a hemisphere heightmap with correct dimensions', () => {
      const width = 10
      const height = 10
      const heightmap = generateSemiSphere(width, height, 5, 5, 4)

      expect(heightmap).toBeInstanceOf(Float32Array)
      expect(heightmap.length).toBe(width * height)
    })

    it('sets center point to the radius value', () => {
      const width = 10
      const height = 10
      const centerX = 5
      const centerY = 5
      const radius = 4
      const heightmap = generateSemiSphere(width, height, centerX, centerY, radius)

      // Center should be at maximum elevation (radius)
      const centerIndex = centerY * width + centerX
      expect(heightmap[centerIndex]).toBeCloseTo(radius, 5)
    })

    it('sets points outside radius to 0', () => {
      const width = 10
      const height = 10
      const centerX = 5
      const centerY = 5
      const radius = 2
      const heightmap = generateSemiSphere(width, height, centerX, centerY, radius)

      // Check corners (should be outside radius)
      expect(heightmap[0]).toBe(0) // top-left
      expect(heightmap[width - 1]).toBe(0) // top-right
      expect(heightmap[width * height - width]).toBe(0) // bottom-left
      expect(heightmap[width * height - 1]).toBe(0) // bottom-right
    })

    it('creates smooth gradient from center to edge', () => {
      const width = 10
      const height = 10
      const centerX = 5
      const centerY = 5
      const radius = 4
      const heightmap = generateSemiSphere(width, height, centerX, centerY, radius)

      const centerIndex = centerY * width + centerX
      const edgeIndex = (centerY + radius) * width + centerX // point at radius distance

      // Center should be higher than edge
      expect(heightmap[centerIndex]).toBeGreaterThan(0)

      // Point at radius should be close to 0
      if (edgeIndex < heightmap.length) {
        expect(heightmap[edgeIndex]).toBeCloseTo(0, 5)
      }
    })

    it('follows hemisphere equation z = sqrt(r² - d²)', () => {
      const width = 10
      const height = 10
      const centerX = 5
      const centerY = 5
      const radius = 4
      const heightmap = generateSemiSphere(width, height, centerX, centerY, radius)

      // Test a point at distance 2 from center
      const testX = centerX + 2
      const testY = centerY
      const testIndex = testY * width + testX

      const distance = 2
      const expectedElevation = Math.sqrt(radius * radius - distance * distance)

      expect(heightmap[testIndex]).toBeCloseTo(expectedElevation, 5)
    })

    it('handles hemisphere at corner', () => {
      const width = 10
      const height = 10
      const heightmap = generateSemiSphere(width, height, 0, 0, 3)

      // Corner should be at max
      expect(heightmap[0]).toBeCloseTo(3, 5)
    })

    it('handles radius larger than dimensions', () => {
      const width = 5
      const height = 5
      const heightmap = generateSemiSphere(width, height, 2, 2, 10)

      // All points should be inside the hemisphere
      expect(Array.from(heightmap).every(val => val > 0)).toBe(true)
    })

    it('handles zero radius', () => {
      const width = 5
      const height = 5
      const heightmap = generateSemiSphere(width, height, 2, 2, 0)

      // Only center point should have value, all others should be 0
      const nonZeroCount = Array.from(heightmap).filter(val => val > 0).length
      expect(nonZeroCount).toBeLessThanOrEqual(1)
    })
  })

  describe('generateCone', () => {
    it('creates a cone heightmap with correct dimensions', () => {
      const width = 10
      const height = 10
      const heightmap = generateCone(width, height, 5, 5, 4, 10)

      expect(heightmap).toBeInstanceOf(Float32Array)
      expect(heightmap.length).toBe(width * height)
    })

    it('sets center point to peak height', () => {
      const width = 10
      const height = 10
      const centerX = 5
      const centerY = 5
      const peakHeight = 100
      const heightmap = generateCone(width, height, centerX, centerY, 4, peakHeight)

      const centerIndex = centerY * width + centerX
      expect(heightmap[centerIndex]).toBeCloseTo(peakHeight, 5)
    })

    it('sets points outside radius to 0', () => {
      const width = 10
      const height = 10
      const centerX = 5
      const centerY = 5
      const radius = 2
      const heightmap = generateCone(width, height, centerX, centerY, radius, 50)

      // Check corners (should be outside radius)
      expect(heightmap[0]).toBe(0) // top-left
      expect(heightmap[width - 1]).toBe(0) // top-right
      expect(heightmap[width * height - width]).toBe(0) // bottom-left
      expect(heightmap[width * height - 1]).toBe(0) // bottom-right
    })

    it('creates linear slope from peak to base', () => {
      const width = 10
      const height = 10
      const centerX = 5
      const centerY = 5
      const radius = 4
      const peakHeight = 100
      const heightmap = generateCone(width, height, centerX, centerY, radius, peakHeight)

      // Test point halfway to radius
      const testX = centerX + 2 // distance 2 from center
      const testY = centerY
      const testIndex = testY * width + testX

      const distance = 2
      const expectedElevation = peakHeight * (1.0 - distance / radius)

      expect(heightmap[testIndex]).toBeCloseTo(expectedElevation, 5)
    })

    it('reaches zero at radius boundary', () => {
      const width = 20
      const height = 20
      const centerX = 10
      const centerY = 10
      const radius = 5
      const peakHeight = 100
      const heightmap = generateCone(width, height, centerX, centerY, radius, peakHeight)

      // Point exactly at radius should be close to 0
      const boundaryX = centerX + radius
      const boundaryY = centerY
      const boundaryIndex = boundaryY * width + boundaryX

      expect(heightmap[boundaryIndex]).toBeCloseTo(0, 1)
    })

    it('handles negative peak height', () => {
      const width = 10
      const height = 10
      const heightmap = generateCone(width, height, 5, 5, 3, -50)

      const centerIndex = 5 * width + 5
      expect(heightmap[centerIndex]).toBeCloseTo(-50, 5)

      // Points inside should have negative values
      expect(heightmap[centerIndex]).toBeLessThan(0)
    })

    it('handles cone at corner', () => {
      const width = 10
      const height = 10
      const peakHeight = 75
      const heightmap = generateCone(width, height, 0, 0, 5, peakHeight)

      expect(heightmap[0]).toBeCloseTo(peakHeight, 5)
    })

    it('handles zero radius', () => {
      const width = 5
      const height = 5
      const heightmap = generateCone(width, height, 2, 2, 0, 100)

      // Only center point might have value
      const nonZeroCount = Array.from(heightmap).filter(val => val > 0).length
      expect(nonZeroCount).toBeLessThanOrEqual(1)
    })

    it('handles zero peak height', () => {
      const width = 10
      const height = 10
      const heightmap = generateCone(width, height, 5, 5, 4, 0)

      // All values should be 0
      expect(Array.from(heightmap).every(val => val === 0)).toBe(true)
    })

    it('handles large dimensions efficiently', () => {
      const width = 256
      const height = 256
      const heightmap = generateCone(width, height, 128, 128, 50, 200)

      expect(heightmap.length).toBe(width * height)

      // Verify center
      const centerIndex = 128 * width + 128
      expect(heightmap[centerIndex]).toBeCloseTo(200, 5)
    })
  })

  describe('edge cases and validation', () => {
    it('handles minimum dimensions (1x1)', () => {
      expect(generateFlat(1, 1, 5).length).toBe(1)
      expect(generateSemiSphere(1, 1, 0, 0, 1).length).toBe(1)
      expect(generateCone(1, 1, 0, 0, 1, 10).length).toBe(1)
    })

    it('handles rectangular dimensions', () => {
      const width = 20
      const height = 10

      expect(generateFlat(width, height, 1).length).toBe(200)
      expect(generateSemiSphere(width, height, 10, 5, 3).length).toBe(200)
      expect(generateCone(width, height, 10, 5, 3, 50).length).toBe(200)
    })

    it('uses Float32Array for precision', () => {
      const flat = generateFlat(5, 5, 1.123456789)
      const sphere = generateSemiSphere(5, 5, 2, 2, 2)
      const cone = generateCone(5, 5, 2, 2, 2, 10)

      expect(flat).toBeInstanceOf(Float32Array)
      expect(sphere).toBeInstanceOf(Float32Array)
      expect(cone).toBeInstanceOf(Float32Array)
    })
  })
})
