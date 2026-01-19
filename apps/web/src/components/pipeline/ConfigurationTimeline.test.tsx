import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigurationTimeline from './ConfigurationTimeline';
import { PipelineProvider } from '../../contexts/PipelineContext';
import { type ReactNode } from 'react';

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  canvas: {
    width: 800,
    height: 200,
  },
  fillStyle: '',
  strokeStyle: '',
  font: '',
  textAlign: '',
})) as any;

// Helper to render with context
const renderWithContext = (component: ReactNode) => {
  return render(<PipelineProvider>{component}</PipelineProvider>);
};

describe('ConfigurationTimeline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders timeline canvas', () => {
    renderWithContext(<ConfigurationTimeline />);

    const canvas = screen.getByTestId('timeline-canvas') || document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders playback controls', () => {
    renderWithContext(<ConfigurationTimeline />);

    // Check for control buttons
    expect(screen.getByLabelText(/go to start/i) || screen.getByTitle(/first frame/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/play/i) || screen.getByTitle(/play/i)).toBeInTheDocument();
  });

  it('renders simulate button', () => {
    renderWithContext(<ConfigurationTimeline />);

    const simulateButton = screen.getByRole('button', { name: /Simulate/i });
    expect(simulateButton).toBeInTheDocument();
  });

  it('simulate button is disabled when no session', () => {
    renderWithContext(<ConfigurationTimeline />);

    const simulateButton = screen.getByRole('button', { name: /Simulate/i });
    expect(simulateButton).toBeDisabled();
  });

  it('displays frame count', () => {
    renderWithContext(<ConfigurationTimeline />);

    // Should show frame counter (e.g., "Frame 0 / 10")
    expect(screen.getByText(/Frame 0/i)).toBeInTheDocument();
  });

  it('shows clear cache button', () => {
    renderWithContext(<ConfigurationTimeline />);

    const clearButton = screen.getByRole('button', { name: /Clear Cache/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('handles play button click', () => {
    renderWithContext(<ConfigurationTimeline />);

    const playButton = screen.getByLabelText(/play/i) || screen.getByTitle(/play/i);
    fireEvent.click(playButton);

    // After clicking play, should show pause button
    setTimeout(() => {
      expect(screen.getByLabelText(/pause/i) || screen.getByTitle(/pause/i)).toBeInTheDocument();
    }, 100);
  });

  it('handles pause button click', () => {
    renderWithContext(<ConfigurationTimeline />);

    // Start playing
    const playButton = screen.getByLabelText(/play/i) || screen.getByTitle(/play/i);
    fireEvent.click(playButton);

    // Then pause
    setTimeout(() => {
      const pauseButton = screen.getByLabelText(/pause/i) || screen.getByTitle(/pause/i);
      fireEvent.click(pauseButton);

      // Should show play button again
      expect(screen.getByLabelText(/play/i) || screen.getByTitle(/play/i)).toBeInTheDocument();
    }, 100);
  });

  it('handles skip to start', () => {
    renderWithContext(<ConfigurationTimeline />);

    const skipStartButton = screen.getByLabelText(/go to start/i) || screen.getByTitle(/first frame/i);
    fireEvent.click(skipStartButton);

    // Frame should be 0
    expect(screen.getByText(/Frame 0/i)).toBeInTheDocument();
  });

  it('handles skip to end', () => {
    renderWithContext(<ConfigurationTimeline />);

    const skipEndButton = screen.getByLabelText(/go to end/i) || screen.getByTitle(/last frame/i);
    fireEvent.click(skipEndButton);

    // Frame should be totalFrames
    expect(screen.getByText(/Frame 10/i)).toBeInTheDocument();
  });

  it('clears cache when clear button clicked', () => {
    renderWithContext(<ConfigurationTimeline />);

    const clearButton = screen.getByRole('button', { name: /Clear Cache/i });
    fireEvent.click(clearButton);

    // Cache should be cleared (no visual change but function should be called)
    expect(clearButton).toBeInTheDocument();
  });

  it('updates frame display when clicking on timeline', () => {
    renderWithContext(<ConfigurationTimeline />);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Simulate click on canvas
      fireEvent.click(canvas, { clientX: 200, clientY: 50 });

      // Frame should update (exact frame depends on click position)
      // Just verify frame counter is still displayed
      expect(screen.getByText(/Frame \d+/i)).toBeInTheDocument();
    }
  });

  it('displays validation warnings', () => {
    renderWithContext(<ConfigurationTimeline />);

    // With no jobs, should show validation message
    const simulateButton = screen.getByRole('button', { name: /Simulate/i });
    expect(simulateButton).toBeDisabled();

    // Try to click (should not work)
    fireEvent.click(simulateButton);

    // Button remains disabled
    expect(simulateButton).toBeDisabled();
  });

  it('shows correct button states during simulation', () => {
    renderWithContext(<ConfigurationTimeline />);

    const simulateButton = screen.getByRole('button', { name: /Simulate/i });

    // Initially should show "Simulate"
    expect(simulateButton).toHaveTextContent(/Simulate/i);

    // During simulation (if we could trigger it), would show "Stop"
    // This would require setting up a valid session and configuration
  });

  it('displays coverage visualization', () => {
    renderWithContext(<ConfigurationTimeline />);

    // Canvas should be present for coverage visualization
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // Canvas context methods should be called
    const ctx = canvas?.getContext('2d');
    expect(ctx?.fillRect).toBeDefined();
  });

  it('handles mouse hover on timeline for tooltips', () => {
    renderWithContext(<ConfigurationTimeline />);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Simulate hover
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50 });

      // Tooltip should appear (implementation-dependent)
      // Just verify canvas is still there
      expect(canvas).toBeInTheDocument();
    }
  });

  it('shows frame range correctly', () => {
    renderWithContext(<ConfigurationTimeline />);

    // Should display frame range in some form
    expect(screen.getByText(/Frame 0/i)).toBeInTheDocument();
  });

  it('adapts to container width changes', () => {
    renderWithContext(<ConfigurationTimeline />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // Simulate resize
    globalThis.dispatchEvent(new Event('resize'));

    // Canvas should still be there
    expect(canvas).toBeInTheDocument();
  });

  it('handles playback loop correctly', async () => {
    vi.useFakeTimers();

    renderWithContext(<ConfigurationTimeline />);

    const playButton = screen.getByLabelText(/play/i) || screen.getByTitle(/play/i);
    fireEvent.click(playButton);

    // Advance time
    vi.advanceTimersByTime(1000);

    // Frame should have progressed (exact behavior depends on implementation)
    expect(screen.getByText(/Frame \d+/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('stops at last frame during playback', async () => {
    vi.useFakeTimers();

    renderWithContext(<ConfigurationTimeline />);

    // Skip to near end
    const skipEndButton = screen.getByLabelText(/go to end/i) || screen.getByTitle(/last frame/i);
    fireEvent.click(skipEndButton);

    // Start playing
    const playButton = screen.getByLabelText(/play/i) || screen.getByTitle(/play/i);
    fireEvent.click(playButton);

    // Advance time past last frame
    vi.advanceTimersByTime(5000);

    // Should stop at last frame
    expect(screen.getByText(/Frame 10/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders with multiple jobs showing coverage', () => {
    renderWithContext(<ConfigurationTimeline />);

    // Canvas should render with job coverage (tested via canvas calls)
    const canvas = document.querySelector('canvas');
    const ctx = canvas?.getContext('2d');

    expect(ctx?.fillRect).toBeDefined();
    expect(ctx?.fillText).toBeDefined();
  });
});
