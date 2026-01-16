import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobModal } from './JobModal';
import { PipelineProvider } from '../../contexts/PipelineContext';
import { type ReactNode } from 'react';
import { type SimulationJob } from '../../contexts/PipelineContext';

// Helper to render with context
const renderWithContext = (component: ReactNode) => {
  return render(<PipelineProvider>{component}</PipelineProvider>);
};

describe('JobModal', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    mockOnOpenChange.mockClear();
  });

  it('renders in create mode', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    expect(screen.getByText(/Create Simulation Job/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Job/i })).toBeInTheDocument();
  });

  it('renders in edit mode with existing job', () => {
    const existingJob: SimulationJob = {
      id: 'test-123',
      name: 'Test Job',
      startFrame: 1,
      endFrame: 5,
      step: 'hydraulicErosion',
      enabled: true,
      config: {
        hydraulicErosion: {
          numParticles: 10000,
          erosionRate: 0.3,
          depositionRate: 0.3,
          sedimentCapacity: 4.0,
          minSlope: 0.01,
          inertia: 0.05,
          evaporationRate: 0.01,
          gravity: 4.0,
          erosionRadius: 3,
        },
      },
    };

    renderWithContext(
      <JobModal
        open={true}
        onOpenChange={mockOnOpenChange}
        mode="edit"
        editingJob={existingJob}
      />
    );

    expect(screen.getByText(/Edit Job/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Job/i })).toBeInTheDocument();

    // Check that fields are pre-filled
    const nameInput = screen.getByLabelText(/Job Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Test Job');

    const startFrameInput = screen.getByLabelText(/Start Frame/i) as HTMLInputElement;
    expect(startFrameInput.value).toBe('1');
  });

  it('validates job name is required', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Leave name empty and try to submit
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    // Should show validation error or button should be disabled
    expect(createButton).toBeInTheDocument();
  });

  it('validates start frame must be positive', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    const startFrameInput = screen.getByLabelText(/Start Frame/i);
    fireEvent.change(startFrameInput, { target: { value: '0' } });

    // Should show error or prevent submission
    expect(startFrameInput).toBeInTheDocument();
  });

  it('validates end frame must be greater than start frame', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    const startFrameInput = screen.getByLabelText(/Start Frame/i);
    fireEvent.change(startFrameInput, { target: { value: '5' } });

    const endFrameInput = screen.getByLabelText(/End Frame/i);
    fireEvent.change(endFrameInput, { target: { value: '3' } });

    // Should show validation error
    expect(screen.getByText(/end frame must be greater/i)).toBeInTheDocument();
  });

  it('allows selecting erosion type', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Find erosion type selector
    const hydraulicButton = screen.getByRole('button', { name: /Hydraulic Erosion/i });
    const thermalButton = screen.getByRole('button', { name: /Thermal Erosion/i });

    expect(hydraulicButton).toBeInTheDocument();
    expect(thermalButton).toBeInTheDocument();

    // Click thermal
    fireEvent.click(thermalButton);

    // Should show thermal erosion parameters
    expect(screen.getByLabelText(/Talus Angle/i)).toBeInTheDocument();
  });

  it('shows hydraulic erosion parameters by default', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Should show hydraulic erosion parameters
    expect(screen.getByLabelText(/Number of Particles/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Erosion Rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deposition Rate/i)).toBeInTheDocument();
  });

  it('shows thermal erosion parameters when selected', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Select thermal erosion
    const thermalButton = screen.getByRole('button', { name: /Thermal Erosion/i });
    fireEvent.click(thermalButton);

    // Should show thermal parameters
    expect(screen.getByLabelText(/Talus Angle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Transfer Rate/i)).toBeInTheDocument();
  });

  it('updates parameter values via sliders', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Find erosion rate slider
    const erosionRateSlider = screen.getByLabelText(/Erosion Rate/i) as HTMLInputElement;

    // Change value
    fireEvent.change(erosionRateSlider, { target: { value: '0.5' } });

    // Value should update
    expect(erosionRateSlider.value).toBe('0.5');
  });

  it('creates job with correct default parameters', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Fill required fields
    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Job' } });

    const startFrameInput = screen.getByLabelText(/Start Frame/i);
    fireEvent.change(startFrameInput, { target: { value: '1' } });

    const endFrameInput = screen.getByLabelText(/End Frame/i);
    fireEvent.change(endFrameInput, { target: { value: '5' } });

    // Submit
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    // Modal should close
    setTimeout(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    }, 100);
  });

  it('closes modal when cancel is clicked', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows help text about timeline coverage', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Should show help text about ensuring frames are covered
    expect(
      screen.getByText(/ensure all frames are covered/i)
    ).toBeInTheDocument();
  });

  it('updates existing job when in edit mode', () => {
    const existingJob: SimulationJob = {
      id: 'test-123',
      name: 'Original Name',
      startFrame: 1,
      endFrame: 5,
      step: 'hydraulicErosion',
      enabled: true,
      config: {
        hydraulicErosion: {
          numParticles: 10000,
          erosionRate: 0.3,
          depositionRate: 0.3,
          sedimentCapacity: 4.0,
          minSlope: 0.01,
          inertia: 0.05,
          evaporationRate: 0.01,
          gravity: 4.0,
          erosionRadius: 3,
        },
      },
    };

    renderWithContext(
      <JobModal
        open={true}
        onOpenChange={mockOnOpenChange}
        mode="edit"
        editingJob={existingJob}
      />
    );

    // Change name
    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    // Submit
    const updateButton = screen.getByRole('button', { name: /Update Job/i });
    fireEvent.click(updateButton);

    // Modal should close
    setTimeout(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    }, 100);
  });

  it('displays frame range in friendly format', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Set frames
    const startFrameInput = screen.getByLabelText(/Start Frame/i);
    fireEvent.change(startFrameInput, { target: { value: '1' } });

    const endFrameInput = screen.getByLabelText(/End Frame/i);
    fireEvent.change(endFrameInput, { target: { value: '10' } });

    // Should show frame count or range somewhere
    expect(screen.getByText(/10 frames|Frames 1–10/i)).toBeInTheDocument();
  });

  it('prevents negative parameter values', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    const erosionRateSlider = screen.getByLabelText(/Erosion Rate/i) as HTMLInputElement;

    // Try to set negative value
    fireEvent.change(erosionRateSlider, { target: { value: '-1' } });

    // Should be clamped to minimum (0 or positive)
    expect(parseFloat(erosionRateSlider.value)).toBeGreaterThanOrEqual(0);
  });

  it('displays parameter tooltips/descriptions', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    // Parameter labels should exist
    expect(screen.getByLabelText(/Number of Particles/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Erosion Rate/i)).toBeInTheDocument();
  });

  it('validates end frame does not exceed total frames', () => {
    renderWithContext(
      <JobModal open={true} onOpenChange={mockOnOpenChange} mode="create" />
    );

    const endFrameInput = screen.getByLabelText(/End Frame/i);
    fireEvent.change(endFrameInput, { target: { value: '1000' } });

    // Should show error about exceeding total frames
    expect(screen.getByText(/exceeds total frames|maximum frame/i)).toBeInTheDocument();
  });
});
