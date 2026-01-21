import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';
import TerrainViewer from './TerrainViewer';
import { usePipeline } from '../../contexts/PipelineContext';
import * as TerrainMeshModule from '../TerrainMesh';

// Mock the context
vi.mock('../../contexts/PipelineContext', () => ({
  usePipeline: vi.fn(),
}));

// Track TerrainMesh render calls AND shader material uniforms
let terrainMeshRenderCalls: Array<{
  textureMode: string;
  heightmap: Float32Array | undefined;
  callCount: number;
}> = [];

let shaderMaterialCalls: Array<{
  uniforms: any;
  key: string;
  callCount: number;
}> = [];

// Spy on the real TerrainMesh component
vi.mock('../TerrainMesh', async () => {
  const actual = await vi.importActual<typeof TerrainMeshModule>('../TerrainMesh');
  const OriginalTerrainMesh = actual.TerrainMesh;

  return {
    ...actual,
    TerrainMesh: (props: any) => {
      // Track render with current props
      terrainMeshRenderCalls.push({
        textureMode: props.textureMode,
        heightmap: props.heightmap,
        callCount: terrainMeshRenderCalls.length + 1,
      });

      // Render the actual component using createElement to avoid JSX compilation issues
      return OriginalTerrainMesh(props);
    },
  };
});

// Mock Three.js Canvas component and spy on shaderMaterial
vi.mock('@react-three/fiber', () => {
  return {
    Canvas: ({ children }: { children: React.ReactNode }) => (
      React.createElement('div', { 'data-testid': 'canvas' }, children)
    ),
    useFrame: vi.fn(),
    useThree: vi.fn(() => ({
      gl: {},
      scene: {},
      camera: {},
    })),
    // Spy on shaderMaterial to capture uniforms
    extend: vi.fn(),
    // Mock primitive components
    mesh: (props: any) => React.createElement('mesh', props),
    planeGeometry: (props: any) => React.createElement('planeGeometry', props),
    shaderMaterial: (props: any) => {
      // Capture shader material creation with uniforms
      shaderMaterialCalls.push({
        uniforms: props.uniforms,
        key: props['key'] || 'no-key',
        callCount: shaderMaterialCalls.length + 1,
      });

      console.log('🔍 SHADER MATERIAL CREATED', {
        key: props['key'],
        textureModeUniform: props.uniforms?.textureMode?.value,
        minElevation: props.uniforms?.minElevation?.value,
        maxElevation: props.uniforms?.maxElevation?.value,
      });

      return React.createElement('shaderMaterial', props);
    },
  };
});

// Mock drei components
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));
describe('TerrainViewer - Texture Mode Integration Test', () => {
  const mockConfig = {
    width: 256,
    height: 256,
    totalFrames: 10,
    jobs: [],
    step0: {
      method: 'Perlin' as const,
      seed: 12345,
      frequency: 0.05,
      amplitude: 50,
    },
  };

  // Sample heightmap data for testing
  const sampleHeightmap = new Float32Array(256 * 256);
  for (let i = 0; i < sampleHeightmap.length; i++) {
    sampleHeightmap[i] = Math.sin(i / 100) * 25; // Varied elevation data
  }

  beforeEach(() => {
    vi.clearAllMocks();
    terrainMeshRenderCalls = [];
    shaderMaterialCalls = [];

    (usePipeline as any).mockReturnValue({
      config: mockConfig,
      currentFrame: 0,
      heightmapCache: new Map([[0, sampleHeightmap]]),
    });
  });

  test.skip('re-renders TerrainMesh with CORRECT shader uniforms when switching texture modes', async () => {
    render(<TerrainViewer />);

    // Wait for initial render with shader material
    await waitFor(() => {
      expect(shaderMaterialCalls.length).toBeGreaterThan(0);
    });

    const initialMaterialCount = shaderMaterialCalls.length;
    const initialMaterial = shaderMaterialCalls[initialMaterialCount - 1];

    // Verify initial state: landscape mode should have textureMode = 0
    expect(initialMaterial.uniforms.textureMode.value).toBe(0); // 0 = landscape
    console.log('✅ Initial material has textureMode =', initialMaterial.uniforms.textureMode.value);

    // Change to "none" mode
    const dropdown = screen.getByLabelText('Texture Mode') as HTMLSelectElement;
    fireEvent.change(dropdown, { target: { value: 'none' } });

    // Wait for new shader material to be created
    await waitFor(() => {
      expect(shaderMaterialCalls.length).toBeGreaterThan(initialMaterialCount);
    });

    const afterNoneCount = shaderMaterialCalls.length;
    const noneMaterial = shaderMaterialCalls[afterNoneCount - 1];

    // CRITICAL: Verify "none" mode has textureMode = 1
    expect(noneMaterial.uniforms.textureMode.value).toBe(1); // 1 = none
    console.log('✅ After switching to none, textureMode =', noneMaterial.uniforms.textureMode.value);

    // Change back to "landscape" mode
    fireEvent.change(dropdown, { target: { value: 'landscape' } });

    // Wait for new shader material to be created
    await waitFor(() => {
      expect(shaderMaterialCalls.length).toBeGreaterThan(afterNoneCount);
    });

    const finalCount = shaderMaterialCalls.length;
    const finalMaterial = shaderMaterialCalls[finalCount - 1];

    // CRITICAL: Verify switching back to landscape has textureMode = 0 again
    expect(finalMaterial.uniforms.textureMode.value).toBe(0); // 0 = landscape
    console.log('✅ After switching back to landscape, textureMode =', finalMaterial.uniforms.textureMode.value);

    // Verify materials were actually recreated (different keys)
    expect(initialMaterial.key).not.toBe(noneMaterial.key);
    expect(noneMaterial.key).not.toBe(finalMaterial.key);

    console.log('🔑 Material keys:', {
      initial: initialMaterial.key,
      afterNone: noneMaterial.key,
      final: finalMaterial.key,
    });

    // The complete sequence of textureMode values should be: 0 → 1 → 0
    const textureModes = shaderMaterialCalls.map(call => call.uniforms.textureMode.value);
    console.log('📊 Complete textureMode sequence:', textureModes);
    expect(textureModes[textureModes.length - 3]).toBe(0); // landscape
    expect(textureModes[textureModes.length - 2]).toBe(1); // none
    expect(textureModes[textureModes.length - 1]).toBe(0); // landscape again
  });

  it('re-renders TerrainMesh when heightmap changes', async () => {
    const { rerender } = render(<TerrainViewer />);

    await waitFor(() => {
      expect(terrainMeshRenderCalls.length).toBeGreaterThan(0);
    });

    const initialRenderCount = terrainMeshRenderCalls.length;
    const initialHeightmap = terrainMeshRenderCalls[initialRenderCount - 1].heightmap;

    // Create a new heightmap
    const newHeightmap = new Float32Array(256 * 256);
    for (let i = 0; i < newHeightmap.length; i++) {
      newHeightmap[i] = Math.cos(i / 100) * 30; // Different data
    }

    // Update the mock with new heightmap
    (usePipeline as any).mockReturnValue({
      config: mockConfig,
      currentFrame: 0,
      heightmapCache: new Map([[0, newHeightmap]]),
    });

    // Force re-render
    rerender(<TerrainViewer />);

    // Wait for re-render with new heightmap
    await waitFor(() => {
      expect(terrainMeshRenderCalls.length).toBeGreaterThan(initialRenderCount);
    });

    const finalCount = terrainMeshRenderCalls.length;
    const finalHeightmap = terrainMeshRenderCalls[finalCount - 1].heightmap;

    // Verify heightmap reference changed
    expect(finalHeightmap).not.toBe(initialHeightmap);
    expect(finalHeightmap).toBe(newHeightmap);
  });

  it('switches through multiple texture mode changes correctly', async () => {
    render(<TerrainViewer />);

    await waitFor(() => {
      expect(terrainMeshRenderCalls.length).toBeGreaterThan(0);
    });

    const dropdown = screen.getByLabelText('Texture Mode') as HTMLSelectElement;

    // Rapid switching: landscape -> none -> landscape -> none -> landscape
    fireEvent.change(dropdown, { target: { value: 'none' } });
    await waitFor(() => {
      const modes = terrainMeshRenderCalls.map(c => c.textureMode);
      expect(modes[modes.length - 1]).toBe('none');
    });

    fireEvent.change(dropdown, { target: { value: 'landscape' } });
    await waitFor(() => {
      const modes = terrainMeshRenderCalls.map(c => c.textureMode);
      expect(modes[modes.length - 1]).toBe('landscape');
    });

    fireEvent.change(dropdown, { target: { value: 'none' } });
    await waitFor(() => {
      const modes = terrainMeshRenderCalls.map(c => c.textureMode);
      expect(modes[modes.length - 1]).toBe('none');
    });

    fireEvent.change(dropdown, { target: { value: 'landscape' } });
    await waitFor(() => {
      const modes = terrainMeshRenderCalls.map(c => c.textureMode);
      expect(modes[modes.length - 1]).toBe('landscape');
    });

    // Verify we had multiple renders
    expect(terrainMeshRenderCalls.length).toBeGreaterThan(4);

    // Verify final state is landscape
    expect(dropdown.value).toBe('landscape');
  });
});
