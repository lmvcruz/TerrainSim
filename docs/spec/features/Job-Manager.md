# Job Manager

## Purpose
UI component for creating, editing, enabling, and deleting erosion jobs within the terrain simulation pipeline.

## Core Concept

Job Manager provides **CRUD operations** for pipeline jobs:
- **Create:** Open modal with blank form, select erosion type, configure parameters
- **Read:** Display all jobs in scrollable list with key details visible
- **Update:** Edit existing job via modal (pre-populated form)
- **Delete:** Remove job after confirmation dialog

The component acts as the **job registry**—the single source of truth for what simulation steps execute during terrain generation. It enforces validation rules (valid frame ranges, required parameters) and provides immediate feedback.

**Why modal-based editing?** Inline editing clutters the UI with many parameter fields. Modals isolate configuration, allowing focused editing without distraction. Users can cancel changes without affecting the job list.

## UI Interactions

### Job List Display
Each job card shows:
- **Job name:** User-defined label (e.g., "Heavy Erosion Phase")
- **Frame range:** "Frames 1-50" (human-readable format)
- **Erosion type:** Icon + label (Hydraulic/Thermal)
- **Enabled toggle:** Checkbox to enable/disable without deleting
- **Edit button:** Pencil icon (opens modal)
- **Delete button:** Trash icon (shows confirmation dialog)

### Job Colors (Visual Coding)
- **Hydraulic Erosion:** Blue (#3B82F6)
- **Thermal Erosion:** Orange (#F59E0B)
- **Disabled jobs:** Gray with striped pattern

### Modal Workflow (Create/Edit)
1. Click "Create Job" or "Edit" icon
2. Modal appears with form:
   - **Name field:** Text input (required, 1-50 characters)
   - **Frame range:** Start/end inputs (validated, inclusive)
   - **Erosion type dropdown:** Hydraulic or Thermal
   - **Parameter sliders:** Dynamic based on selected type
3. Real-time validation:
   - Start < End
   - Range within 1 to totalFrames
   - No empty name
4. "Save" commits changes, "Cancel" discards

### Parameter Controls
Parameters displayed as **labeled sliders** with:
- Current value shown (numeric display)
- Min/max range indicators
- Hover tooltips explaining effect
- Reset to default button

### Drag & Reorder (Not Implemented)
- Jobs rendered in definition order (FIFO)
- Execution order doesn't affect simulation (all jobs in range execute)
- Future enhancement: drag-to-reorder for visual organization

## State Management

### Job Data Structure
```typescript
interface Job {
  id: string,              // UUID
  name: string,            // User label
  startFrame: number,      // 1-based (inclusive)
  endFrame: number,        // 1-based (inclusive)
  step: 'hydraulicErosion' | 'thermalErosion',
  enabled: boolean,
  config: HydraulicConfig | ThermalConfig
}
```

### Context Integration
- Jobs stored in PipelineContext (React Context)
- Job Manager dispatches actions: ADD_JOB, UPDATE_JOB, DELETE_JOB, TOGGLE_JOB
- Context reducer handles state updates and triggers validation
- All components subscribe to jobs array reactively

### Validation Rules
- **Name:** Required, 1-50 chars, no special characters except spaces/dashes
- **Frame range:** startFrame ≥ 1, endFrame ≤ totalFrames, startFrame < endFrame
- **Parameters:** Type-specific validation (e.g., erosionRate in [0.1, 0.9])

## Edge Cases

### Deleting Job with Coverage Dependency
- If job deletion creates coverage gap, show warning modal:
  - "Deleting this job will leave frames X-Y uncovered. Continue?"
- Offer to auto-create replacement job covering same range
- User can proceed anyway (generates validation error, blocks terrain generation)

### Editing Frame Range
- **Shrink range:** May create coverage gaps (validated on save)
- **Expand range:** May overlap other jobs (allowed, no conflict)
- **Out-of-bounds:** Red error message, disable Save button

### Duplicate Job Names
- Allowed (not enforced)—name is for user reference only
- Job IDs (UUID) guarantee uniqueness internally
- Future enhancement: optional uniqueness constraint

### Maximum Job Count
- UI supports unlimited jobs (no hard cap)
- Practical limit: 100 jobs (performance/usability)
- Beyond 100: scrolling job list, consider search/filter

### Empty Job List
- Show placeholder: "No jobs defined. Click 'Create Job' to start."
- Disable terrain generation (no simulation to run)
- Suggest default job: "Create a hydraulic erosion job covering all frames?"

### Rapid Enable/Disable Toggling
- Debounced validation (300ms after last toggle)
- Optimistic UI update (instant toggle feedback)
- Rollback if validation fails (rare)

## Integration

### With Pipeline Builder
- Pipeline Builder renders Job Manager as child component
- Passes totalFrames prop (determines valid frame ranges)
- Receives job updates via PipelineContext dispatch
- Triggers re-validation after job changes

### With Configuration Timeline
- Timeline subscribes to jobs array from context
- Renders job bars based on startFrame/endFrame
- Clicking job bar in timeline highlights job in Job Manager
- Bidirectional selection (click job card also highlights timeline bar)

### With JobModal
- Job Manager controls modal open/close state
- Passes selected job data to modal (edit mode) or null (create mode)
- Modal emits onSave event with job data
- Job Manager dispatches action to context reducer

## Constraints

**Performance:**
- Job list rendering: O(num_jobs), optimized with React.memo
- Maximum recommended jobs: 100 (UI remains snappy)
- Validation runs on debounced input (300ms delay)
- No performance issues observed with 50 jobs

**UI limits:**
- Job cards fixed height (80px), scrollable list
- Modal parameter sliders: 10 max per erosion type (current: 5-8)
- Job name truncated at 30 chars in list (full name in tooltip)

**Data persistence:**
- Jobs stored in PipelineContext (in-memory)
- Save to backend via /config/save API
- Load from backend via /config/load/:id
- Auto-save to localStorage every 30s (fallback)

**Browser requirements:**
- Modern browser with ES6+ support
- No special APIs required (pure React)
- Minimum screen width: 768px (responsive layout)
