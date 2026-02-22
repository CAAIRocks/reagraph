# Change: 103-two-phase-layout-pipeline

## Why

The current layout pipeline in `useGraph.ts` runs a single layout pass over all visible nodes and edges. This works for flat graphs and closed combos (where proxy nodes substitute for member groups), but it cannot handle open combos — groups of nodes that remain visible inside a container boundary while the container itself participates in the outer layout as a single rigid body. Without a two-phase pipeline, open combos cannot be positioned: their member nodes would be scattered by the outer force simulation with no spatial grouping, and there would be no mechanism to compute container boundaries.

This change is the central architectural shift enabling open combo visualization. It introduces Phase 1 (sub-layouts for combo interiors), virtual body node injection for the outer layout, and Phase 2 (outer layout + position resolution), making open combos a first-class layout construct.

## What Changes

1. **New utility functions** in `src/utils/comboLayout.ts`:
   - `computeOpenComboSubLayouts()` — Runs sub-layout algorithms for each open combo, produces local member positions, bounding boxes, and virtual body nodes.
   - `resolveComboPositions()` — After outer layout converges, computes world positions for members by composing body node positions with local offsets, and generates `ComboContainerData` for rendering.

2. **useGraph.ts pipeline modification** in `src/useGraph.ts`: Replace the single-pass layout with a two-phase pipeline. After closed combo transform (from 101-01), run `computeOpenComboSubLayouts` to get body nodes and shadow edges, then run outer layout on the modified graph, then call `resolveComboPositions` to produce final world positions.

3. **Force layout body node support** in `src/layout/forceDirected.ts`: Ensure body nodes with large radii participate correctly in `forceCollide` and force-link forces without special-casing.

4. **GraphScene combo rendering** in `src/GraphScene.tsx`: Read `comboContainers` from store and render `ComboContainer` components for open combos (using primitive from 101-02).

5. **Integration tests** in `src/utils/comboLayout.test.ts`: Tests for sub-layout computation, position resolution math, edge shadow splitting, and mixed open/closed combo scenarios.

6. **Storybook demos**: OpenCombo, MixedCombos, and OpenComboForceLayout stories demonstrating open combo behavior.

## Dependencies

- `100-combo-data-model` — Provides `ComboDefinition`, `InternalCombo`, store fields (`comboDefinitions`, `openComboIds`, `comboContainers`), and utility functions.
- `101-01-closed-combo-transform` — Provides `transformCollapsedCombos()` which runs before the two-phase pipeline (closed combos are handled first).
- `101-02-combo-container-primitive` — Provides the `ComboContainer` rendering component, theme extensions, and store integration for `comboContainers`.
- `102-sub-layout-engine` — Provides sub-layout algorithm functions (concentric, grid, sequential, lens) that Phase 1 invokes for each open combo's interior.

## Capabilities

### New Capabilities
- `combo-system`: Two-phase layout pipeline — sub-layout computation, virtual body nodes, position resolution, and edge shadow splitting for open combos

### Modified Capabilities
_(none)_

## Impact

- **src/utils/comboLayout.ts** — New file with `computeOpenComboSubLayouts()` and `resolveComboPositions()` functions
- **src/utils/comboLayout.test.ts** — New file with integration tests
- **src/utils/index.ts** — Updated barrel export to include combo layout utilities
- **src/useGraph.ts** — Modified to implement two-phase pipeline (SHARED with 101-01)
- **src/layout/forceDirected.ts** — Minor adjustments to ensure body nodes work with forceCollide
- **src/GraphScene.tsx** — Modified to render ComboContainer components (SHARED with 101-02, 106)
- **stories/demos/Combo.story.tsx** — New stories added (SHARED with 101-01)

## Reuse Inventory

### Existing Code
- `src/useGraph.ts:updateLayout` — Current layout callback that runs `buildGraph` → `layoutProvider` → `tick` → `transformGraph`. The two-phase pipeline wraps around this flow, inserting pre-processing (sub-layouts, body node injection) and post-processing (position resolution).
- `src/layout/layoutProvider.ts:layoutProvider()` — Factory for layout strategies. Used as-is for the outer layout. Body nodes are regular simulation nodes from the layout engine's perspective.
- `src/layout/forceDirected.ts` — Force simulation with `forceCollide(d => d.radius + 10)`. Body nodes participate naturally via their `radius` property. May need minor adjustment to read radius from body node metadata.
- `src/utils/graph.ts:buildGraph()` — Clears and rebuilds graphology instance. Called with the modified node/edge arrays (including body nodes, excluding combo members).
- `src/utils/graph.ts:transformGraph()` — Reads positions from layout, computes sizes/visibility. Called after position resolution with the resolved full node set.
- `src/utils/layout.ts:CenterPositionVector` — Reused for bounding box computation in `ComboContainerData`.
- `src/utils/layout.ts:getLayoutCenter()` — Reference for computing center/bounds from node positions; combo container computation follows the same approach.
- `src/store.ts:GraphState.comboContainers` — Store field (from 100) for `ComboContainerData` map; populated by `resolveComboPositions`.
- `src/store.ts:GraphState.openComboIds` — Store field (from 100) driving which combos are open.
- `src/utils/cluster.ts:calculateClusters()` — Existing cluster ring geometry computation. Coexists with combo containers — both systems run independently.

### From Dependency Specs
- **100-combo-data-model**: `ComboDefinition` type per `openspec/specs/combo-system.md`
  - Expected interface: `{ id, label, memberNodeIds, parentComboId?, arrangement?, tightness?, data? }`
  - Relevant scenario: "consumer provides combo definitions"
- **100-combo-data-model**: `openComboIds` and `comboContainers` store fields per `openspec/specs/combo-system.md`
  - Expected interface: `openComboIds: string[]`, `comboContainers: Map<string, ComboContainerData>`
  - Relevant scenario: "store initializes with empty combo state"
- **101-01-closed-combo-transform**: `transformCollapsedCombos()` per `openspec/changes/101-01-closed-combo-transform/design.md`
  - Expected interface: `(input: ComboTransformInput) => ComboTransformOutput`
  - Relevant scenario: runs first, its output feeds into the two-phase pipeline
- **101-02-combo-container-primitive**: `ComboContainer` component per `openspec/changes/101-02-combo-container-primitive/design.md`
  - Expected interface: React component accepting `comboId`, `shape`, `center`, `boundingBox`, `animated`, etc.
  - Relevant scenario: "GraphScene renders combo containers"
- **102-sub-layout-engine**: Sub-layout algorithm functions
  - Expected interface: `(memberNodes, options) => { positions: Map<nodeId, {x, y}>, boundingBox: {width, height} }`
  - Relevant scenario: Phase 1 invokes these for each open combo

### Net-New Components
- `computeOpenComboSubLayouts()` — Orchestrates Phase 1: iterates open combos, invokes sub-layout functions, creates body nodes and shadow edges. No equivalent exists — the current pipeline has no concept of sub-layouts.
- `resolveComboPositions()` — Orchestrates post-layout resolution: reads body node positions from outer layout, computes world positions for members, generates `ComboContainerData`. No equivalent exists.
- Virtual body node construction — Synthesizes nodes with `combo-body-${comboId}` ID and large radius for force simulation. Distinct from proxy nodes (which represent closed combos).
- Edge shadow splitting logic — Creates layout-only edge duplicates connecting body nodes; discarded after layout. No existing edge duplication pattern in the codebase.

## Backwards Compatibility

None required. The two-phase pipeline activates only when `openComboIds` is non-empty. When no combos are open, the pipeline falls through to the standard single-pass layout. Existing graphs without combos are completely unaffected.
