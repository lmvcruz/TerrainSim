# Job Execution Model - Sequential Processing

## Overview
This document clarifies how jobs are executed when multiple jobs are assigned to the same frame or frame range.

## Execution Order

**CRITICAL RULE:** Jobs execute **SEQUENTIALLY** in the order they were created, NOT "last wins".

### Example Scenario
```
Frame 5 has 3 jobs:
  1. Job A: Hydraulic Erosion (created first)
  2. Job B: Thermal Erosion (created second)
  3. Job C: Hydraulic Erosion (created third)
```

### Execution Flow
```
Input (Frame 4)
    ↓
Job A executes → Result A
    ↓
Job B uses Result A as input → Result B
    ↓
Job C uses Result B as input → Result C
    ↓
Result C returned to frontend as Frame 5
```

## Key Points

1. **Sequential Processing:** Each job uses the output of the previous job
2. **Order Matters:** Creation order determines execution order
3. **Overlaps Are Valid:** Multiple jobs can cover the same frames
4. **Pipeline Composition:** This allows complex multi-step processing per frame

## UI Implications

- Timeline shows **yellow outline** for frames with overlapping jobs
- Tooltip should display: "3 jobs execute sequentially on this frame"
- Job Manager should show execution order clearly
- Warning message should clarify: "Jobs A, B, C will execute in sequence"

## API Contract

The `/simulate/execute` endpoint receives:
```json
{
  "sessionId": "...",
  "frame": 5
}
```

Backend logic:
1. Retrieve all jobs covering frame 5
2. Sort by creation order (job.id or timestamp)
3. Execute each job sequentially
4. Return final result after last job completes

## Why Not "Last Wins"?

"Last wins" would mean only Job C executes, discarding Jobs A and B. This limits flexibility:
- ❌ Can't combine erosion types
- ❌ Can't build multi-stage pipelines
- ❌ Overlaps would be errors, not features

Sequential execution enables:
- ✅ Hydraulic erosion followed by thermal smoothing
- ✅ Multi-pass erosion with different parameters
- ✅ Complex terrain evolution pipelines

## Implementation Status

- ✅ Backend: executeFrame processes jobs sequentially (verified in code)
- ✅ Timeline: Shows overlaps with yellow outline
- 🚧 UI Messaging: Needs clarification that overlaps execute sequentially
- 🚧 Tooltips: Should show job execution order

## Related Files

- `apps/simulation-api/src/routes/jobSystem.ts` - Backend execution logic
- `apps/web/src/components/pipeline/ConfigurationTimeline.tsx` - Timeline visualization
- `apps/web/src/contexts/PipelineContext.tsx` - Validation logic
