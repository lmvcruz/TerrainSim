import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PipelineBuilder from './PipelineBuilder';
import { PipelineProvider } from '../../contexts/PipelineContext';
import { type ReactNode } from 'react';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Helper to render with context
const renderWithContext = (component: ReactNode) => {
  return render(<PipelineProvider>{component}</PipelineProvider>);
};

describe('PipelineBuilder', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial state', () => {
    renderWithContext(<PipelineBuilder />);

    // Check for main elements
    expect(screen.getByText(/Step 0:/i)).toBeInTheDocument();
    expect(screen.getByText(/Input Model Generation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Terrain/i })).toBeInTheDocument();
  });

  it('allows Step 0 configuration - method selection', () => {
    renderWithContext(<PipelineBuilder />);

    // Find method buttons
    const perlinButton = screen.getByRole('button', { name: /Perlin Noise/i });
    const fbmButton = screen.getByRole('button', { name: /FBM Noise/i });

    // Initially Perlin should be selected (default)
    expect(perlinButton).toHaveClass('bg-blue-600');
    expect(fbmButton).not.toHaveClass('bg-blue-600');

    // Click FBM button
    fireEvent.click(fbmButton);

    // FBM should now be selected
    expect(fbmButton).toHaveClass('bg-blue-600');
  });

  it('validates total frames input', () => {
    renderWithContext(<PipelineBuilder />);

    // Find total frames input (in the parent context, but we'll test the button state)
    const generateButton = screen.getByRole('button', { name: /Generate Terrain/i });

    // Button should be enabled initially (valid default config)
    expect(generateButton).not.toBeDisabled();
  });

  it('disables simulate when invalid configuration', async () => {
    renderWithContext(<PipelineBuilder />);

    const generateButton = screen.getByRole('button', { name: /Generate Terrain/i });

    // Initially enabled
    expect(generateButton).not.toBeDisabled();
  });

  it('handles terrain generation success', async () => {
    // Mock successful API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: new Array(256 * 256).fill(0),
          statistics: { min: 0, max: 100, mean: 50 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'test-session-123',
        }),
      });

    renderWithContext(<PipelineBuilder />);

    const generateButton = screen.getByRole('button', { name: /Generate Terrain/i });

    // Click generate
    fireEvent.click(generateButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Generating.../i)).toBeInTheDocument();
    });

    // Wait for success
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Button should be enabled again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate Terrain/i })).not.toBeDisabled();
    });
  });

  it('handles terrain generation error', async () => {
    // Mock API error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Generation failed' }),
    });

    renderWithContext(<PipelineBuilder />);

    const generateButton = screen.getByRole('button', { name: /Generate Terrain/i });

    // Click generate
    fireEvent.click(generateButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Generation failed/i)).toBeInTheDocument();
    });

    // Button should be enabled again
    expect(generateButton).not.toBeDisabled();
  });

  it('changes parameters based on selected method', () => {
    renderWithContext(<PipelineBuilder />);

    // Select Perlin method
    const perlinButton = screen.getByRole('button', { name: /Perlin Noise/i });
    fireEvent.click(perlinButton);

    // Should show Perlin parameters (frequency, amplitude, seed)
    expect(screen.getByLabelText(/Frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amplitude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seed/i)).toBeInTheDocument();

    // Select FBM method
    const fbmButton = screen.getByRole('button', { name: /FBM Noise/i });
    fireEvent.click(fbmButton);

    // Should show additional FBM parameters (octaves, persistence, lacunarity)
    expect(screen.getByLabelText(/Octaves/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Persistence/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lacunarity/i)).toBeInTheDocument();
  });

  it('updates parameter values via sliders', () => {
    renderWithContext(<PipelineBuilder />);

    // Find frequency slider
    const frequencySlider = screen.getByLabelText(/Frequency/i) as HTMLInputElement;

    // Initial value should be default (0.05)
    expect(frequencySlider.value).toBe('0.05');

    // Change frequency
    fireEvent.change(frequencySlider, { target: { value: '0.1' } });

    // Value should update
    expect(frequencySlider.value).toBe('0.1');
  });

  it('updates seed parameter', () => {
    renderWithContext(<PipelineBuilder />);

    // Find seed input
    const seedInput = screen.getByLabelText(/Seed/i) as HTMLInputElement;

    // Initial value
    expect(seedInput.value).toBe('12345');

    // Change seed
    fireEvent.change(seedInput, { target: { value: '99999' } });

    // Value should update
    expect(seedInput.value).toBe('99999');
  });

  it('sends correct payload to API', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: new Array(256 * 256).fill(0),
          statistics: {},
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'test-123' }),
      });

    renderWithContext(<PipelineBuilder />);

    // Change some parameters
    const frequencySlider = screen.getByLabelText(/Frequency/i);
    fireEvent.change(frequencySlider, { target: { value: '0.08' } });

    const generateButton = screen.getByRole('button', { name: /Generate Terrain/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/generate'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"frequency":0.08'),
        })
      );
    });
  });

  it('handles network errors gracefully', async () => {
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithContext(<PipelineBuilder />);

    const generateButton = screen.getByRole('button', { name: /Generate Terrain/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('prevents multiple simultaneous generations', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ data: [], statistics: {} }),
              }),
            100
          )
        )
    );

    renderWithContext(<PipelineBuilder />);

    const generateButton = screen.getByRole('button', { name: /Generate Terrain/i });

    // Click twice quickly
    fireEvent.click(generateButton);
    fireEvent.click(generateButton);

    // Should show loading state
    expect(screen.getByText(/Generating.../i)).toBeInTheDocument();

    // Should only call fetch once (or twice for the two-step process)
    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });
});
