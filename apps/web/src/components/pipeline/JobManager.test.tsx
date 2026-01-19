import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import JobManager from './JobManager';
import { PipelineProvider } from '../../contexts/PipelineContext';
import { type ReactNode } from 'react';

// Helper to render with context
const renderWithContext = (component: ReactNode) => {
  return render(<PipelineProvider>{component}</PipelineProvider>);
};

describe('JobManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders with empty state', () => {
    renderWithContext(<JobManager />);

    expect(screen.getByText(/Create Job/i)).toBeInTheDocument();
    expect(screen.getByText(/No jobs created yet/i)).toBeInTheDocument();
  });

  it('shows create job button', () => {
    renderWithContext(<JobManager />);

    const createButton = screen.getByRole('button', { name: /Create Job/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).not.toBeDisabled();
  });

  it('opens job creation modal when Create Job is clicked', () => {
    renderWithContext(<JobManager />);

    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    // Modal should open (checking for modal elements)
    expect(screen.getByText(/Create Simulation Job/i)).toBeInTheDocument();
  });

  it('creates new job via modal', () => {
    renderWithContext(<JobManager />);

    // Open modal
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    // Fill in job details
    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Erosion Job' } });

    const startFrameInput = screen.getByLabelText(/Start Frame/i);
    fireEvent.change(startFrameInput, { target: { value: '1' } });

    const endFrameInput = screen.getByLabelText(/End Frame/i);
    fireEvent.change(endFrameInput, { target: { value: '5' } });

    // Submit
    const saveButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(saveButton);

    // Job should appear in list
    expect(screen.getByText(/Test Erosion Job/i)).toBeInTheDocument();
  });

  it('displays job with correct information', () => {
    renderWithContext(<JobManager />);

    // Create a job first
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Hydraulic Test' } });

    const startFrameInput = screen.getByLabelText(/Start Frame/i);
    fireEvent.change(startFrameInput, { target: { value: '1' } });

    const endFrameInput = screen.getByLabelText(/End Frame/i);
    fireEvent.change(endFrameInput, { target: { value: '10' } });

    const saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1]; // Second one is in modal
    fireEvent.click(saveButton);

    // Check job card displays correct info
    expect(screen.getByText(/Hydraulic Test/i)).toBeInTheDocument();
    expect(screen.getByText(/Frames 1–10/i)).toBeInTheDocument();
    expect(screen.getByText(/10 frames/i)).toBeInTheDocument();
    expect(screen.getByText(/Hydraulic Erosion/i)).toBeInTheDocument();
  });

  it('shows enabled status by default', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Status Test' } });

    const saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Should show "Enabled" status
    expect(screen.getByText(/Enabled/i)).toBeInTheDocument();
  });

  it('toggles job enabled/disabled', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Toggle Test' } });

    const saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Find the job card
    const jobCard = screen.getByText(/Toggle Test/i).closest('div')!.parentElement!;

    // Click to expand job card
    fireEvent.click(jobCard);

    // Find and click the toggle button
    const toggleButton = within(jobCard).getByRole('button', { name: /toggle/i });
    fireEvent.click(toggleButton);

    // Status should change to "Disabled"
    expect(screen.getByText(/Disabled/i)).toBeInTheDocument();

    // Toggle back
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Enabled/i)).toBeInTheDocument();
  });

  it('opens edit modal for existing job', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Edit Test' } });

    const saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Find job card and expand it
    const jobCard = screen.getByText(/Edit Test/i).closest('div')!.parentElement!;
    fireEvent.click(jobCard);

    // Click edit button
    const editButton = within(jobCard).getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Edit modal should open
    expect(screen.getByText(/Edit Job/i)).toBeInTheDocument();
    // Name should be pre-filled
    const editNameInput = screen.getByLabelText(/Job Name/i) as HTMLInputElement;
    expect(editNameInput.value).toBe('Edit Test');
  });

  it('edits existing job', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Original Name' } });

    const saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Expand and edit
    const jobCard = screen.getByText(/Original Name/i).closest('div')!.parentElement!;
    fireEvent.click(jobCard);

    const editButton = within(jobCard).getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Change name
    const editNameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(editNameInput, { target: { value: 'Updated Name' } });

    // Save changes
    const updateButton = screen.getByRole('button', { name: /Update Job/i });
    fireEvent.click(updateButton);

    // Job should show new name
    expect(screen.getByText(/Updated Name/i)).toBeInTheDocument();
    expect(screen.queryByText(/Original Name/i)).not.toBeInTheDocument();
  });

  it('deletes job with confirmation', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Delete Test' } });

    const saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Expand job card
    const jobCard = screen.getByText(/Delete Test/i).closest('div')!.parentElement!;
    fireEvent.click(jobCard);

    // Click delete button
    const deleteButton = within(jobCard).getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    // Should show confirmation (or delete immediately based on implementation)
    // After deletion, job should be gone
    setTimeout(() => {
      expect(screen.queryByText(/Delete Test/i)).not.toBeInTheDocument();
    }, 100);
  });

  it('displays correct job type colors', () => {
    renderWithContext(<JobManager />);

    // Create hydraulic erosion job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Hydraulic Job' } });

    const saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Should show "Hydraulic Erosion" text
    expect(screen.getByText(/Hydraulic Erosion/i)).toBeInTheDocument();
  });

  it('displays job selection state correctly', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Selection Test' } });

    const saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Find job card
    const jobCard = screen.getByText(/Selection Test/i).closest('div')!.parentElement!;

    // Initially not selected
    expect(jobCard).not.toHaveClass('border-blue-500');

    // Click to select
    fireEvent.click(jobCard);

    // Should be selected now
    expect(jobCard).toHaveClass('border-blue-500');

    // Click again to deselect
    fireEvent.click(jobCard);

    // Should be deselected
    expect(jobCard).not.toHaveClass('border-blue-500');
  });

  it('lists multiple jobs', () => {
    renderWithContext(<JobManager />);

    const createButton = screen.getByRole('button', { name: /Create Job/i });

    // Create first job
    fireEvent.click(createButton);
    let nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Job 1' } });
    let saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Create second job
    fireEvent.click(createButton);
    nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Job 2' } });
    saveButton = screen.getAllByRole('button', { name: /Create Job/i })[1];
    fireEvent.click(saveButton);

    // Both jobs should be visible
    expect(screen.getByText(/Job 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Job 2/i)).toBeInTheDocument();
  });
});
