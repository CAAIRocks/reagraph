## Decisions and Rationale

### D1: Transform operates on GraphNode[]/GraphEdge[] (not InternalGraphNode[])
The transform runs in useGraph.ts between `getVisibleEntities()` and `buildGraph()`. At this stage, nodes are still `GraphNode[]` (pre-layout, no position). Changed the interface from the original design's `InternalGraphNode[]` to `GraphNode[]` to match the actual pipeline types.

### D2: Position seeding uses fx/fy/fz instead of position object
Since proxy nodes are `GraphNode` (not `InternalGraphNode`), they don't have a `position` field. Instead, we use `fx/fy/fz` fixed position fields which the force-directed layout respects. Position is seeded from drag references (which have `InternalGraphNode` with positions).

### D3: computeCentroid accepts DragReferences for member position lookup
Pre-layout nodes don't have positions, so centroid computation checks drag references for member node positions. This handles re-collapse after a previous expand where nodes were dragged.

## Progress Notes
- All tasks completed
- Transform function, tests, useGraph integration, barrel export, and storybook demo all implemented

## npm test
All 76 tests pass (19 new comboTransform tests)

## npm run build
Build passes successfully with no type errors

## npm run lint
Pre-existing lint warnings/errors only — no new issues from this change.
Fixed Prettier formatting in Combo.story.tsx. All 3 new files (`comboTransform.ts`, `comboTransform.test.ts`, `Combo.story.tsx`) pass lint cleanly.

## Verification Summary (opsx-apply session)
- `npm test`: 76/76 pass (19 comboTransform tests)
- `npm run build`: success, no type errors
- `npm run lint` (new files only): 0 errors, 0 warnings
