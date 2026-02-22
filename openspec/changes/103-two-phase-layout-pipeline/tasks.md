## 1. computeOpenComboSubLayouts (`src/utils/comboLayout.ts`)
<!-- COMPLEXITY: High — core orchestration with sub-layout invocation, body node creation, edge shadow splitting, deduplication -->

- [x] 1.1 Create `src/utils/comboLayout.ts` with `SubLayoutResult`, `ComboSubLayoutOutput`, and input interfaces as defined in design.md (senior-typescript-engineer)
- [x] 1.2 Implement `computeOpenComboSubLayouts()` Step 1–2: build `memberToCombo` and `comboMembers` lookup maps from `openComboIds` and `comboDefinitions` (senior-typescript-engineer)
- [x] 1.3 Implement Step 3: iterate open combos — gather member nodes and intra-combo edges, invoke sub-layout function from `subLayoutFns` map (keyed by `combo.arrangement`), store `SubLayoutResult` with positions and boundingBox (senior-typescript-engineer)
- [x] 1.4 Implement body node creation: construct `InternalGraphNode` with ID `combo-body-${comboId}`, set `radius = Math.max(bb.width, bb.height) / 2 + padding`, set `data.isComboBody`, `data.comboId`, `data.memberCount`, `data.memberNodeIds` (senior-typescript-engineer)
- [x] 1.5 Implement Step 5: build `outerNodes` array — filter out open combo member nodes, append body nodes (senior-typescript-engineer)
- [x] 1.6 Implement edge shadow splitting: classify each edge per the classification matrix in design.md — create shadow edges with `combo-body-` source/target, skip intra-combo edges from outer set, keep all originals in renderEdges (senior-typescript-engineer)
- [x] 1.7 Implement shadow edge deduplication: group shadow edges by normalized body-pair key (`${min(bodyA,bodyB)}-${max(bodyA,bodyB)}`), keep one per pair with `data.count` for force weight (senior-typescript-engineer)
- [x] 1.8 Implement layout type check: if layout type is not `forceDirected2d`, `forceDirected3d`, or `forceatlas2`, emit `console.warn` and return combos as-closed (add to collapsedComboIds, skip sub-layout) (senior-typescript-engineer)
- [x] 1.9 Export `computeOpenComboSubLayouts` and all interfaces from `src/utils/comboLayout.ts`
- [x] 1.10 Add `export * from './comboLayout'` to `src/utils/index.ts` barrel

## 2. resolveComboPositions (`src/utils/comboLayout.ts`)
<!-- COMPLEXITY: High — position resolution math, container data generation, node assembly -->
<!-- PARALLEL: Groups 1 and 2 are in the same file but logically independent; can be developed sequentially within a single agent session -->

- [x] 2.1 Define `PositionResolutionInput` and `PositionResolutionOutput` interfaces in `src/utils/comboLayout.ts` as specified in design.md (senior-typescript-engineer)
- [x] 2.2 Implement `resolveComboPositions()`: iterate `openComboIds`, read body node position from `outerLayoutPositions`, compose with local sub-layout positions to produce world positions for each member (senior-typescript-engineer)
- [x] 2.3 Implement `computeContainerFromWorldPositions()` helper: compute min/max x/y from member world positions, derive center, width, height, shape, and produce `ComboContainerData` (senior-typescript-engineer)
- [x] 2.4 Assemble `resolvedNodes`: non-member nodes (with outer layout positions) + resolved member nodes (with world positions); exclude body nodes (senior-typescript-engineer)
- [x] 2.5 Assemble `resolvedEdges`: return `renderEdges` as-is (original edges, no shadow edges) (senior-typescript-engineer)
- [x] 2.6 Build `comboContainers` map from container data for each open combo and include in output (senior-typescript-engineer)
- [x] 2.7 Export `resolveComboPositions` and `computeContainerFromWorldPositions` from `src/utils/comboLayout.ts`

## 3. useGraph.ts Pipeline Integration (`src/useGraph.ts`)
<!-- COMPLEXITY: High — integrating two-phase pipeline into existing layout callback -->
<!-- SHARED: src/useGraph.ts — also modified by 101-01-closed-combo-transform -->

- [x] 3.1 Import `computeOpenComboSubLayouts` and `resolveComboPositions` from `../utils/comboLayout` in `src/useGraph.ts` (senior-typescript-engineer)
- [x] 3.2 Read `openComboIds`, `comboDefinitions`, and `comboContainers` setter from store (alongside existing state reads) (senior-typescript-engineer)
- [x] 3.3 After `transformCollapsedCombos()` call (from 101-01), insert conditional: if `openComboIds` is non-empty, call `computeOpenComboSubLayouts()` with transformed nodes/edges, combo definitions, open combo IDs, sub-layout functions, and layout type (senior-typescript-engineer)
- [x] 3.4 When two-phase is active: pass `outerNodes` and `outerEdges` to `buildGraph()` instead of `transformedNodes`/`transformedEdges` (senior-typescript-engineer)
- [x] 3.5 After `tick(layout)` completes, call `resolveComboPositions()` with outer layout positions, sub-layout results, non-member nodes, render edges, and combo definitions (senior-typescript-engineer)
- [x] 3.6 Use resolved output: pass `resolvedNodes` and `resolvedEdges` to `transformGraph()`, call `setComboContainers()` with the container data map (senior-typescript-engineer)
- [x] 3.7 When two-phase is NOT active (no open combos): preserve existing single-pass flow unchanged (senior-typescript-engineer)

## 4. GraphScene Combo Rendering (`src/GraphScene.tsx`)
<!-- COMPLEXITY: Medium — reading store and rendering ComboContainer components -->
<!-- SHARED: src/GraphScene.tsx — also modified by 101-02-combo-container-primitive, 106-combo-interactions -->

- [x] 4.1 Import `ComboContainer` component and read `comboContainers` and `comboDefinitions` from store in `GraphScene.tsx` (senior-typescript-engineer)
- [x] 4.2 Add ComboContainer rendering block after existing cluster rendering: iterate `comboContainers` map, render `<ComboContainer>` for each entry with appropriate props (comboId, shape, center, boundingBox, label, animated, disabled, labelFontUrl) (senior-typescript-engineer)
- [x] 4.3 Wire `onComboClick` and `onComboDoubleClick` callbacks: resolve `ComboDefinition` from `comboDefinitions` array and pass to callback (senior-typescript-engineer)
- [x] 4.4 Ensure body nodes (`combo-body-*`) are filtered from rendered node list — verify they don't appear in the node rendering loop (senior-typescript-engineer)

## 5. Force Layout Body Node Support (`src/layout/forceDirected.ts`)
<!-- COMPLEXITY: Medium — ensuring body nodes participate correctly in force simulation -->

- [x] 5.1 Verify that body nodes with `radius` property are correctly handled by the existing `forceCollide` accessor in `forceDirected.ts` — if the accessor doesn't read `radius` from node data, add support (senior-typescript-engineer)
- [x] 5.2 Verify that shadow edges with `data.count` can serve as link force weight — if `forceLink.strength()` doesn't account for edge weight, add optional weighting (senior-typescript-engineer)
- [x] 5.3 Test that body nodes with large radius (100+) don't cause simulation instability — add radius cap if needed (configurable, default max 500) (senior-typescript-engineer)

## 6. Integration Tests (`src/utils/comboLayout.test.ts`)
<!-- COMPLEXITY: Medium — comprehensive scenario coverage for both functions -->
<!-- PARALLEL: Can be started once Group 1 and 2 interfaces are defined -->

- [x] 6.1 Test `computeOpenComboSubLayouts` basic case: 1 open combo with 5 members → body node created with correct ID and radius from bounding box (senior-typescript-engineer)
- [x] 6.2 Test body node radius calculation: sub-layout produces 200×100 bounding box with padding 20 → radius = 200/2 + 20 = 120 (senior-typescript-engineer)
- [x] 6.3 Test edge shadow splitting: edge from external node to combo member → shadow edge created from external to body node; original preserved in renderEdges (senior-typescript-engineer)
- [x] 6.4 Test intra-combo edges excluded from outer layout: edge between two members of same open combo → not in outerEdges, present in renderEdges (senior-typescript-engineer)
- [x] 6.5 Test cross-combo shadow edges: edge between member of combo A and member of combo B → shadow edge from body-A to body-B (senior-typescript-engineer)
- [x] 6.6 Test shadow edge deduplication: 3 edges between members of combo A and combo B → 1 shadow edge with data.count=3 (senior-typescript-engineer)
- [x] 6.7 Test `resolveComboPositions` math: body at (100,50), member local pos (10,20) → world pos (110,70) (senior-typescript-engineer)
- [x] 6.8 Test container data generation: 4 members at known world positions → correct center, width, height in ComboContainerData (senior-typescript-engineer)
- [x] 6.9 Test mixed open + closed combos: combo A open, combo B closed → body node for A, proxy node for B (from upstream transform), both in outer layout (senior-typescript-engineer)
- [x] 6.10 Test layout type restriction: open combo with `hierarchicalTd` layout → combo treated as closed, console.warn emitted (senior-typescript-engineer)
- [x] 6.11 Test no-op when openComboIds is empty: output nodes/edges unchanged (senior-typescript-engineer)
- [x] 6.12 Test body nodes excluded from resolvedNodes: after resolution, no node with `combo-body-*` ID in output (senior-typescript-engineer)

## 7. Storybook Demos (`stories/demos/Combo.story.tsx`)
<!-- COMPLEXITY: Medium — interactive demos showing open combo behavior -->
<!-- SHARED: stories/demos/Combo.story.tsx — also used by 101-01-closed-combo-transform -->

- [x] 7.1 Create `OpenCombo` story: single combo with 5–8 nodes starting open, showing members inside circle container with sub-layout, edges connecting to external nodes (senior-typescript-engineer)
- [x] 7.2 Create `MixedCombos` story: 3 combos — one open, one closed, one with no combo — demonstrating both proxy nodes and container rendering in same graph (senior-typescript-engineer)
- [x] 7.3 Create `OpenComboForceLayout` story: open combo with force-directed outer layout, showing body node effect — combo container pushes external nodes away proportionally to its size (senior-typescript-engineer)
- [x] 7.4 Add controls (buttons/toggles) to stories for toggling combos between open and closed states via `openComboIds` and `collapsedComboIds` props

## 8. Verification

- [x] 8.1 Run `npm run lint` — passes with no new errors (0 errors, pre-existing warnings only)
- [x] 8.2 Run `npm test` — all 129 tests pass including 12 new comboLayout tests
- [x] 8.3 Run `npm run build` — builds successfully with new code
- [ ] 8.4 Verify Storybook demos render correctly: `npm start` and visually inspect OpenCombo, MixedCombos, OpenComboForceLayout stories
- [ ] 8.5 Verify no regression: existing graph demos (without combos) render unchanged
