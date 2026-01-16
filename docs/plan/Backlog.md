# Feature Backlog

This document tracks features that have been deferred from active iterations for future consideration. Features are organized by complexity and implementation priority.

---

## Parameter Interpolation (Smooth Transitions)

**Status:** Deferred from Iteration 3.6 (Phase 2+ consideration)

**Description:** Add optional smooth parameter transitions at job boundaries to create more natural-looking terrain evolution.

**How it would work:**
- Add `transitionFrames` property to jobs (optional)
- If set, interpolate parameters across N frames at boundaries
- Example: Job A (frames 0-50, erosionRate=0.8) → Job B (frames 51-100, erosionRate=0.2)
  - With `transitionFrames=5`, frames 48-52 would interpolate: 0.8 → 0.7 → 0.5 → 0.3 → 0.2

**Benefits:**
- Smoother visual transitions in terrain evolution
- More natural-looking erosion progression
- Enhanced realism for cinematic sequences

**Complexity:** Medium (requires interpolation logic + UI controls)

**Dependencies:**
- Requires Iteration 3.6 completion (job-based pipeline)
- May require UI enhancements for transition configuration

**Risks:**
- Potential performance impact on frame computation
- Added complexity to job configuration

---

## Live Editing with Re-computation

**Status:** Deferred from Iteration 3.6 (Phase 3+ consideration)

**Description:** Allow users to modify pipeline/jobs while simulation is running with intelligent re-computation of only affected frames.

**How it would work:**
- User can edit job configurations during playback
- System detects which frames are affected by changes
- Invalidates and re-computes only affected frames
- Visual indicators show which regions have been recomputed
- Dependency graph tracks frame computation chains

**Benefits:**
- Faster iteration for experimentation
- No need to restart entire simulation for small tweaks
- Encourages exploratory workflow

**Complexity:** High (complex state synchronization, cache invalidation logic)

**Dependencies:**
- Requires Iteration 3.6 completion
- May require enhanced caching system
- Needs robust dependency tracking

**Risks:**
- May confuse users about "current state"
- Harder to reproduce exact results
- Complex UI state management
- Potential race conditions in multi-threaded environments

**Open Questions:**
- How to handle edits that cascade to many frames?
- Should there be a "lock" mode to prevent accidental edits?
- How to visualize "stale" vs "fresh" frames?

---

## Job Priorities & Conflict Resolution

**Status:** Future consideration (Phase 2+)

**Description:** Introduce priority levels for jobs when multiple jobs apply to the same frame, replacing the "last wins" strategy.

**Implementation Ideas:**
- Add `priority` field to jobs (1-10 scale)
- Highest priority job wins when multiple jobs overlap same frame
- UI shows priority badges/indicators
- Validation warns about priority conflicts

**Benefits:**
- More explicit control over job application order
- Better handling of complex multi-job scenarios

**Complexity:** Low-Medium

---

## User-Created Job Templates

**Status:** Future consideration (Phase 3+)

**Description:** Allow users to save their custom job configurations as reusable templates.

**Implementation Ideas:**
- "Save as Template" button in job creation modal
- Template library panel in UI
- Import/export template files
- Share templates via URL or file

**Benefits:**
- Faster workflow for repeated tasks
- Community sharing of useful configurations

**Complexity:** Medium

---

## Extreme Parameter Value Warnings

**Status:** Deferred from Iteration 3.6 Delivery Block 5

**Description:** Add visual warnings when users configure jobs with extreme parameter values that might produce unexpected results or performance issues.

**Implementation Ideas:**
- Define thresholds for "very short" (<5 frames?) and "very long" (>100 frames?) job ranges
- Define thresholds for extreme erosion parameters (e.g., erosionRate > 0.9)
- Display warning icons (⚠️) in job creation modal when thresholds exceeded
- Show tooltip explaining potential issues (e.g., "Very high erosion rate may produce unrealistic results")
- Allow user to proceed with warnings (non-blocking)
- Add "Why is this a warning?" help button with detailed explanations

**Benefits:**
- Helps users avoid common mistakes
- Educates users about parameter impacts
- Reduces support requests for "unexpected" results
- Improves overall user experience

**Complexity:** Low-Medium

**Dependencies:**
- Requires job creation UI (Iteration 3.6 Delivery Block 4)
- Needs parameter threshold research/testing

**Open Questions:**
- What thresholds should trigger warnings?
- Should warnings be configurable/dismissible?
- Show warnings during creation or after?

---

## Advanced Validation Features

**Status:** Deferred from Iteration 3.6 Delivery Block 5

**Description:** Enhanced validation UI features including detailed error messages, tooltips, API integration, and overlapping job warnings.

**Deferred Tasks:**

**INT-006b:** Enhanced client-side validation UI
- Add error banner component at top of PipelineLayout
- Add tooltips on hover showing exact uncovered frame ranges
- Real-time validation feedback during job creation

**INT-007b:** Overlapping jobs warnings and explanations
- Display warning badge in timeline when overlaps detected
- Show tooltip listing which jobs overlap on that frame
- Clarify in UI: "Jobs execute sequentially: Job A → Job B → Job C"
- Add info icon explaining execution order model

**INT-008:** Validation API integration
- Call POST /config/validate before running simulation
- Compare client-side validation with server validation
- Display server-side warnings in UI
- Debouncing/throttling for performance with many jobs

**TEST-205b:** E2E validation tests
- Test: Create pipeline with gaps → Verify visual feedback
- Test: Create overlapping jobs → Verify warning displayed
- Test: Fill all gaps → Verify feedback updates

**Benefits:**
- Improved user guidance for configuration errors
- Better understanding of job execution model
- Double-validation (client + server) prevents invalid simulations

**Complexity:** Medium

**Dependencies:**
- Requires basic validation system (already implemented in PipelineContext)
- Requires timeline component (Delivery Block 5)

**Reason for Deferral:**
- User needs clarification on validation timing and behavior
- Focus first on core Simulate/Play/Reset functionality
- Can be added incrementally after core features work

---

## Branching Pipelines

**Status:** Future consideration (Phase 4+)

**Description:** Support non-linear simulation pipelines where multiple simulation paths can be explored from a single starting point.

**Implementation Ideas:**
- Tree-based pipeline structure
- Branch points at specific frames
- Compare different branch outcomes side-by-side
- Merge branches with blending

**Benefits:**
- Explore "what-if" scenarios
- Compare parameter variations
- A/B testing for terrain generation

**Complexity:** Very High

**Risks:**
- Significant UI redesign required
- Complex data management
- Storage implications for multiple branches

---

## Notes

- Features are evaluated regularly for inclusion in upcoming iterations
- Priority is driven by user feedback and technical feasibility
- Some backlog items may be split into smaller incremental features
- Community contributions are welcome for backlog items
