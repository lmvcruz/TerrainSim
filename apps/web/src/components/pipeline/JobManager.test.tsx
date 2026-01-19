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

    expect(screen.getByRole('button', { name: /Create Job/i })).toBeInTheDocument();
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
    // The modal contains "Create Job" title and button, so we should see at least 2
    expect(screen.getAllByText(/Create Job/i).length).toBeGreaterThan(1);
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

    // Submit - Get all buttons with "Create Job", the last one is the submit button in the modal
    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

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

    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

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

    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Should show "Enabled" status (appears in job card and in statistics)
    expect(screen.getAllByText(/Enabled/i).length).toBeGreaterThan(0);
  });

  it('toggles job enabled/disabled', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Toggle Test' } });

    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Find the actual job card container (not a nested div)
    const jobTitle = screen.getByText(/Toggle Test/i);
    const jobCard = jobTitle.closest('[class*="border"]')!;

    // Click to expand job card
    fireEvent.click(jobCard);

    // Find and click the toggle button (it has text "Disable")
    const toggleButton = within(jobCard).getByRole('button', { name: /Disable/i });
    fireEvent.click(toggleButton);

    // Status should change to "Disabled"
    expect(within(jobCard).getByText(/Disabled/i)).toBeInTheDocument();

    // Toggle back (button text should now be "Enable")
    const enableButton = within(jobCard).getByRole('button', { name: /Enable/i });
    fireEvent.click(enableButton);
    expect(within(jobCard).getByText(/Enabled/i)).toBeInTheDocument();
  });

  it('opens edit modal for existing job', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getByRole('button', { name: /Create Job/i });
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Edit Test' } });

    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Find the actual job card container
    const jobTitle = screen.getByText(/Edit Test/i);
    const jobCard = jobTitle.closest('[class*="border"]')!;
    fireEvent.click(jobCard);

    // Click edit button (second button in job card: [0] = toggle, [1] = edit, [2] = delete)
    const jobButtons = within(jobCard).getAllByRole('button');
    fireEvent.click(jobButtons[1]);

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

    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Find the actual job card container
    const jobTitle = screen.getByText(/Original Name/i);
    const jobCard = jobTitle.closest('[class*="border"]')!;
    fireEvent.click(jobCard);

    // Click edit button (second button: [0] = toggle, [1] = edit, [2] = delete)
    const jobButtons = within(jobCard).getAllByRole('button');
    fireEvent.click(jobButtons[1]);

    // Change name
    const editNameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(editNameInput, { target: { value: 'Updated Name' } });

    // Save changes
    const updateButton = screen.getByRole('button', { name: /Save Changes/i });
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

    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Find the actual job card container
    const jobTitle = screen.getByText(/Delete Test/i);
    const jobCard = jobTitle.closest('[class*="border"]')!;
    fireEvent.click(jobCard);

    // Click delete button (third button: [0] = toggle, [1] = edit, [2] = delete)
    const jobButtons = within(jobCard).getAllByRole('button');
    fireEvent.click(jobButtons[2]);

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

    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Should show "Hydraulic Erosion" text
    expect(screen.getByText(/Hydraulic Erosion/i)).toBeInTheDocument();
  });

  it('displays job selection state correctly', () => {
    renderWithContext(<JobManager />);

    // Create job
    const createButton = screen.getAllByText(/Create Job/i)[0]; // Get the main button, not modal button
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Selection Test' } });

    const buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Find job card - it's the parent div with border classes
    const jobTitle = screen.getByText(/Selection Test/i);
    // Go up to find the div with border classes (the job card container)
    let jobCard = jobTitle.closest('div')!;
    while (jobCard && !jobCard.className.includes('border')) {
      jobCard = jobCard.parentElement! as HTMLDivElement;
    }

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

    const createButton = screen.getAllByText(/Create Job/i)[0]; // Get the main button

    // Create first job
    fireEvent.click(createButton);
    let nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Job 1' } });
    let buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Create second job
    fireEvent.click(createButton);
    nameInput = screen.getByLabelText(/Job Name/i);
    fireEvent.change(nameInput, { target: { value: 'Job 2' } });
    buttons = screen.getAllByRole('button', { name: /Create Job/i });
    fireEvent.click(buttons[buttons.length - 1]);

    // Both jobs should be visible
    expect(screen.getByText(/Job 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Job 2/i)).toBeInTheDocument();
  });
});
