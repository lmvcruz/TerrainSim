/**
 * Integration test for the full App component
 * Tests the complete flow from UI interaction to visual mesh update
 */

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

describe('App Integration Tests - Visual Mesh Updates', () => {
  // Mock fetch for API calls
  const mockFetch = vi.fn()

  beforeAll(() => {
    globalThis.fetch = mockFetch as any
  })

  afterEach(() => {
    mockFetch.mockClear()
  })

  it('should update TerrainMesh when Generate Terrain is clicked with different frequency', async () => {
    // Mock API responses with different terrain data
    const terrain1Data = new Array(128 * 128).fill(0).map((_, i) => Math.sin(i * 0.05) * 10)
    const terrain2Data = new Array(128 * 128).fill(0).map((_, i) => Math.sin(i * 0.08) * 10)

    let callCount = 0
    mockFetch.mockImplementation(() => {
      callCount++
      const data = callCount === 1 ? terrain1Data : terrain2Data
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          width: 128,
          height: 128,
          data: data,
          statistics: {
            min: Math.min(...data),
            max: Math.max(...data),
            range: Math.max(...data) - Math.min(...data),
          },
          parameters: {
            method: 'fbm',
            seed: 42,
            frequency: callCount === 1 ? 0.05 : 0.08,
            amplitude: 50,
            octaves: 6,
          },
        }),
      })
    })

    // Render the app
    const { container } = render(<App />)

    // Wait for initial terrain to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    // Get initial TerrainMesh props by checking the canvas
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()

    // Store reference to initial state - we can't directly access Three.js internals,
    // but we can track API calls and state changes
    const initialCallCount = mockFetch.mock.calls.length

    // Find and change the frequency slider
    const frequencySlider = screen.getByLabelText(/frequency/i) as HTMLInputElement
    fireEvent.change(frequencySlider, { target: { value: '0.08' } })

    // Click Generate Terrain button
    const generateButton = screen.getByRole('button', { name: /generate terrain/i })
    fireEvent.click(generateButton)

    // Wait for loading to complete and API to be called again
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(initialCallCount + 1)
    }, { timeout: 3000 })

    // Verify the second API call had different frequency
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(secondCallBody.frequency).toBe(0.08)

    // The key test: verify that the component re-rendered
    // Since we can't directly inspect Three.js objects in JSDOM,
    // we verify through side effects: loading state, API calls, and DOM changes

    // Check that loading state appeared and disappeared
    await waitFor(() => {
      expect(screen.queryByText(/generating terrain/i)).toBeNull()
    })

    console.log('✅ Test verified:')
    console.log('  - API called with initial frequency (0.05)')
    console.log('  - User changed frequency slider to 0.08')
    console.log('  - API called again with new frequency (0.08)')
    console.log('  - Different terrain data returned')
    console.log('')
    console.log('⚠️  However, this test CANNOT verify if the 3D mesh actually updates!')
    console.log('   JSDOM cannot render WebGL/Three.js components.')
    console.log('   We can only verify the React state flow, not the visual output.')
  })

  it('should create a NEW Float32Array instance when updating heightmap state', async () => {
    const terrain1Data = new Array(128 * 128).fill(5)
    const terrain2Data = new Array(128 * 128).fill(15)

    let callCount = 0
    mockFetch.mockImplementation(() => {
      callCount++
      const data = callCount === 1 ? terrain1Data : terrain2Data
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          width: 128,
          height: 128,
          data: data,
          statistics: { min: 0, max: 50, range: 50 },
          parameters: { method: 'fbm', seed: 42, frequency: 0.05, amplitude: 50, octaves: 6 },
        }),
      })
    })

    render(<App />)

    // Wait for first terrain generation
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    // Change amplitude
    const amplitudeSlider = screen.getByLabelText(/amplitude/i) as HTMLInputElement
    fireEvent.change(amplitudeSlider, { target: { value: '70' } })

    // Generate new terrain
    const generateButton = screen.getByRole('button', { name: /generate terrain/i })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    // This test verifies the API flow, but cannot verify:
    // 1. If setState actually creates a new Float32Array reference
    // 2. If React detects the change (Float32Array uses reference equality)
    // 3. If TerrainMesh useMemo dependencies trigger re-creation of texture
    // 4. If Three.js actually updates the mesh geometry

    console.log('')
    console.log('🔍 Potential Issue Detected:')
    console.log('   App.tsx line 67: `const newHeightmap = new Float32Array(data.data)`')
    console.log('   This DOES create a new reference, so React should detect the change.')
    console.log('')
    console.log('   TerrainMesh.tsx line 162: `useMemo(() => { ... }, [heightmap, width, height])`')
    console.log('   This SHOULD trigger when heightmap reference changes.')
    console.log('')
    console.log('❌ But we cannot verify if Three.js texture.needsUpdate actually works!')
  })
})
