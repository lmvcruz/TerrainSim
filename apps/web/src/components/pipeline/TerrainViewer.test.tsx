import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TerrainViewer from './TerrainViewer';
import { usePipeline } from '../../contexts/PipelineContext';

// Mock the context
vi.mock('../../contexts/PipelineContext', () => ({
  usePipeline: vi.fn(),
}));

// Mock Three.js Canvas component
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
}));

// Mock drei components
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

// Mock TerrainMesh component to capture props
vi.mock('../TerrainMesh', () => ({
  TerrainMesh: ({ textureMode }: { textureMode: string }) => (
    <div data-testid="terrain-mesh" data-texture-mode={textureMode} />
  ),
  type: {} as any,
}));

describe('TerrainViewer', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    (usePipeline as any).mockReturnValue({
      config: mockConfig,
      currentFrame: 0,
      heightmapCache: new Map(),
    });
  });

  it('renders texture mode dropdown', () => {
    render(<TerrainViewer />);

    const dropdown = screen.getByLabelText('Texture Mode');
    expect(dropdown).toBeInTheDocument();
    expect(dropdown).toHaveValue('landscape');
  });

  it('has landscape and none options', () => {
    render(<TerrainViewer />);

    const dropdown = screen.getByLabelText('Texture Mode') as HTMLSelectElement;
    const options = Array.from(dropdown.options).map(opt => opt.value);

    expect(options).toEqual(['landscape', 'none']);
  });

  it('defaults to landscape texture mode', () => {
    render(<TerrainViewer />);

    const terrainMesh = screen.getByTestId('terrain-mesh');
    expect(terrainMesh).toHaveAttribute('data-texture-mode', 'landscape');
  });

  it('changes texture mode when dropdown value changes', () => {
    render(<TerrainViewer />);

    const dropdown = screen.getByLabelText('Texture Mode') as HTMLSelectElement;

    // Change to 'none'
    fireEvent.change(dropdown, { target: { value: 'none' } });

    const terrainMesh = screen.getByTestId('terrain-mesh');
    expect(terrainMesh).toHaveAttribute('data-texture-mode', 'none');
    expect(dropdown.value).toBe('none');
  });

  it('can switch back to landscape from none', () => {
    render(<TerrainViewer />);

    const dropdown = screen.getByLabelText('Texture Mode') as HTMLSelectElement;

    // Change to 'none'
    fireEvent.change(dropdown, { target: { value: 'none' } });
    expect(screen.getByTestId('terrain-mesh')).toHaveAttribute('data-texture-mode', 'none');

    // Change back to 'landscape'
    fireEvent.change(dropdown, { target: { value: 'landscape' } });
    expect(screen.getByTestId('terrain-mesh')).toHaveAttribute('data-texture-mode', 'landscape');
    expect(dropdown.value).toBe('landscape');
  });

  it('passes textureMode prop to TerrainMesh', () => {
    render(<TerrainViewer />);

    const terrainMesh = screen.getByTestId('terrain-mesh');
    expect(terrainMesh).toHaveAttribute('data-texture-mode', 'landscape');
  });
});
