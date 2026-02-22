# Change: 101-01-closed-combo-transform

## Why

When a combo is collapsed, users expect its member nodes to disappear and be replaced by a single proxy node, with all edges rerouted accordingly. Without this transform, collapsing a combo has no visual effect — the combo data model (from `100-combo-data-model`) exists but cannot drive any collapse/expand behavior. This change implements the core pure-function transform that rewrites the node and edge arrays before they enter the layout pipeline, enabling all downstream features (layout, animation, interactions) to operate on the already-transformed graph.

## What Changes

1. **New utility** `src/utils/comboTransform.ts`: Pure function `transformCollapsedCombos()` that takes nodes, edges, combo definitions, and collapsed combo IDs, and returns transformed node/edge arrays with proxy nodes injected and edges remapped.
2. **useGraph integration** in `src/useGraph.ts`: Insert the transform call between `getVisibleEntities()` and `buildGraph()` so collapsed combos are resolved before layout.
3. **Unit tests** in `src/utils/comboTransform.test.ts`: Comprehensive tests for the transform function covering proxy injection, edge remapping, intra-combo edge elimination, parallel edge aggregation, position seeding, and multi-combo scenarios.
4. **Storybook demo** in `stories/demos/Combo.story.tsx`: "ClosedCombo" story demonstrating collapse/expand with proxy nodes and aggregated edges.

## Dependencies

- `100-combo-data-model` — Provides `ComboDefinition`, `InternalCombo`, store fields (`comboDefinitions`, `collapsedComboIds`), and `resolveComboTree` utility.

## Capabilities

### New Capabilities
- `combo-system`: Closed combo graph transform — proxy node injection and edge re-routing for collapsed combos

### Modified Capabilities
_(none)_

## Impact

- **src/utils/comboTransform.ts** — New file with `transformCollapsedCombos()` function
- **src/utils/comboTransform.test.ts** — New file with unit tests
- **src/utils/index.ts** — Updated barrel export to include combo transform utilities
- **src/useGraph.ts** — Modified to call `transformCollapsedCombos()` in the graph-build pipeline
- **stories/demos/Combo.story.tsx** — New storybook file with ClosedCombo demo

## Reuse Inventory

### Existing Code
- `src/utils/aggregateEdges.ts:aggregateEdges()` — Reference pattern for edge grouping and aggregation. The combo transform will produce parallel edges (multiple original edges mapping to the same proxy pair) that follow the same aggregation pattern. However, since `aggregateEdges` operates on a Graphology graph instance and the combo transform operates on raw arrays *before* `buildGraph`, we implement a lightweight array-based dedup in the transform itself.
- `src/utils/aggregateEdges.ts:groupEdgesBySourceTarget()` — Pattern reference for edge grouping by source-target key.
- `src/collapse/utils.ts:getVisibleEntities()` — Existing visibility filter for tree-collapse; the combo transform slots in *after* this call, operating on its output.
- `src/utils/graph.ts:buildGraph()` — Downstream consumer; receives the transformed arrays. Not modified.
- `src/store.ts:DragReferences` — Map of node positions from drag operations; used for position seeding when re-collapsing a previously expanded combo.
- `src/store.ts:GraphState.collapsedComboIds` — Store field (from `100-combo-data-model`) driving which combos are collapsed.

### From Dependency Specs
- **100-combo-data-model**: `ComboDefinition` type per `openspec/specs/combo-system.md`
  - Expected interface: `{ id, label, memberNodeIds, parentComboId?, data? }`
  - Relevant scenario: "consumer provides combo definitions"
- **100-combo-data-model**: `collapsedComboIds` store field per `openspec/specs/combo-system.md`
  - Expected interface: `string[]` of combo IDs
  - Relevant scenario: "store updates collapsed combo IDs"
- **100-combo-data-model**: `InternalCombo.proxyNodeId` field
  - Reserved field populated by this change's transform

### Net-New Components
- `transformCollapsedCombos()` — Core transform function; no equivalent exists. The existing `getVisibleEntities` handles tree-collapse (hiding children of collapsed nodes) which is orthogonal. Combo collapse requires proxy node injection and edge remapping which is fundamentally different.
- Proxy node construction logic — Synthesizes `InternalGraphNode` objects with combo metadata; no existing proxy/synthetic node pattern in codebase.
- Array-based edge dedup for combo remapping — Operates on raw edge arrays before Graphology ingestion; `aggregateEdges` operates post-Graphology.

## Backwards Compatibility

None required. The transform is only invoked when `collapsedComboIds` is non-empty and `comboDefinitions` are provided. When no combos are defined, the pipeline behaves identically to before.
