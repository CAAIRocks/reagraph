## 1. Test Data Fixtures
<!-- COMPLEXITY: Low — typed data arrays following existing demo.ts patterns -->

- [ ] 1.1 Create `stories/assets/comboDemo.ts` with basic tier: `basicComboNodes` (15 nodes: 4 in combo-A, 5 in combo-B, 3 in combo-C, 3 external), `basicComboEdges` (~20 edges: intra-combo, cross-combo, external), `basicComboDefs` (3 flat `ComboDefinition` objects with IDs `combo-a`, `combo-b`, `combo-c`) (junior-engineer)
- [ ] 1.2 Add nested tier to `comboDemo.ts`: `nestedComboNodes` (30 nodes), `nestedComboEdges` (~40 edges), `nestedComboDefs` (6 combos: 2 outer with `parentComboId: undefined`, each with 2 inner combos referencing their parent) (junior-engineer)
- [ ] 1.3 Add deep nested tier to `comboDemo.ts`: `deepNestedComboNodes`, `deepNestedComboEdges`, `deepNestedComboDefs` (3-level hierarchy: 1 root combo, 2 mid-level, 4 leaf-level, ~45 nodes total) (junior-engineer)
- [ ] 1.4 Add large tier to `comboDemo.ts`: `largeComboNodes` (200+ nodes), `largeComboEdges` (100+ edges), `largeComboDefs` (20 flat combos, 10 nodes per combo); use loop-based generation with `Array.from()` (junior-engineer)
- [ ] 1.5 Add network topology tier to `comboDemo.ts`: `networkNodes` (~50 device nodes with icon/fill per type), `networkEdges` (device connections + cross-subnet links), `networkComboDefs` (3 office combos each containing 2-3 subnet combos; nested via `parentComboId`) (junior-engineer)

## 2. Basic Combo Stories
<!-- COMPLEXITY: Medium — 5 stories using basic test data with simple state management -->
<!-- SHARED: stories/demos/Combo.story.tsx — story file also used by Groups 3-6 -->

- [ ] 2.1 Create `stories/demos/Combo.story.tsx` with Storybook metadata `{ title: 'Demos/Combos', component: GraphCanvas }` and imports from `comboDemo.ts` assets and `../../src` (frontend-designer-engineer)
- [ ] 2.2 Add `ClosedCombos` story: render `GraphCanvas` with `basicComboNodes`, `basicComboEdges`, `basicComboDefs` as `combos` prop, and `collapsedComboIds` set to all 3 combo IDs; shows proxy nodes and aggregated edges (frontend-designer-engineer)
- [ ] 2.3 Add `OpenCombos` story: same data as ClosedCombos but with `collapsedComboIds=[]`; combos render as open containers with member nodes visible inside (frontend-designer-engineer)
- [ ] 2.4 Add `MixedState` story: `collapsedComboIds` contains only `combo-a`; combo-a shows as proxy, combo-b and combo-c show as open containers; use `useState` and buttons to toggle individual combos (frontend-designer-engineer)
- [ ] 2.5 Add `CircleShape` story: single combo with `shape: 'circle'`, all nodes in one combo, open state; validates circle container rendering (frontend-designer-engineer)
- [ ] 2.6 Add `RectangleShape` story: single combo with `shape: 'rectangle'`, all nodes in one combo, open state; validates rectangle container rendering (frontend-designer-engineer)

## 3. Sub-Layout Stories
<!-- COMPLEXITY: Medium — 5 stories demonstrating arrangement algorithms -->
<!-- PARALLEL: Groups 2 and 3 can be worked simultaneously since they contribute to the same file but different named exports -->

- [ ] 3.1 Add `ArrangementConcentric` story: single open combo with `arrangement: 'concentric'`, 8-10 member nodes; validates concentric ring placement (frontend-designer-engineer)
- [ ] 3.2 Add `ArrangementGrid` story: single open combo with `arrangement: 'grid'`, 12 member nodes; validates grid placement (frontend-designer-engineer)
- [ ] 3.3 Add `ArrangementSequential` story: single open combo with `arrangement: 'sequential'`; include direction selector (buttons for 'right', 'down', 'left', 'up') using `useState` to update `arrangementDirection` (frontend-designer-engineer)
- [ ] 3.4 Add `ArrangementLens` story: single open combo with `arrangement: 'lens'`, 8-10 member nodes; validates radial spread (frontend-designer-engineer)
- [ ] 3.5 Add `TightnessControl` story: single open combo with a range slider (`<input type="range" min={1} max={10}`) controlling `tightness` prop via `useState`; overlay shows current tightness value; validates real-time spacing changes (frontend-designer-engineer)

## 4. Nested and Animation Stories
<!-- COMPLEXITY: Medium — 5 stories combining nesting and animation features -->
<!-- PARALLEL: Groups 2, 3, and 4 can be worked simultaneously -->

- [ ] 4.1 Add `AnimatedOpenClose` story: single combo (5-8 nodes), button toggles between open/closed via `useState` controlling `collapsedComboIds`; demonstrates smooth burst-outward on open and convergence on close (frontend-designer-engineer)
- [ ] 4.2 Add `AnimatedMultiple` story: 3 combos with independent toggle buttons; demonstrates concurrent transitions (frontend-designer-engineer)
- [ ] 4.3 Add `NestedTwoLevel` story: use `nestedComboDefs` (2-level hierarchy), all collapsed initially; buttons to open outer combos, then inner combos layer-by-layer (frontend-designer-engineer)
- [ ] 4.4 Add `NestedThreeLevel` story: use `deepNestedComboDefs` (3-level hierarchy), all collapsed initially; sequential open buttons for each level; stress-tests deep nesting (frontend-designer-engineer)
- [ ] 4.5 Add `NestedPartialOpen` story: outer combo open, inner combos collapsed (proxy nodes visible inside outer container); demonstrates mixed nested state (frontend-designer-engineer)

## 5. Interaction Stories
<!-- COMPLEXITY: Medium — 5 stories demonstrating combo interaction events -->
<!-- PARALLEL: Groups 2, 3, 4, and 5 can be worked simultaneously -->

- [ ] 5.1 Add `DoubleClickToggle` story: use `onComboDoubleClick` callback to toggle combo open/closed state; overlay text shows "Double-click a combo to toggle" (frontend-designer-engineer)
- [ ] 5.2 Add `ComboContextMenu` story: use `onComboClick` with right-click detection or a custom context menu overlay; show a simple menu with "Open", "Close", "Select Members" options on combo right-click (frontend-designer-engineer)
- [ ] 5.3 Add `ComboDragContainment` story: open combo with `draggable={true}`; demonstrates dragging nodes within combo boundary; overlay text explains containment behavior (frontend-designer-engineer)
- [ ] 5.4 Add `ComboSelection` story: use `onComboClick` to add combo ID to selections; demonstrates combo highlight on selection; toggle selection on/off with click (frontend-designer-engineer)
- [ ] 5.5 Add `ProgrammaticAPI` story: use `useRef<GraphCanvasRef>` to access graph ref methods; buttons calling `openCombo()`, `closeCombo()`, `toggleCombo()`, `centerGraph()` on specific combos; demonstrates programmatic control (frontend-designer-engineer)

## 6. Showcase Stories
<!-- COMPLEXITY: Medium — 4 stories with complex real-world scenarios -->
<!-- DEPENDS: Group 1 (test data fixtures) must be complete -->

- [ ] 6.1 Add `NetworkTopology` story: use `networkNodes`, `networkEdges`, `networkComboDefs`; dark theme; offices as outer combos containing subnets as inner combos containing device nodes; highlight some edges with red fill for "alert" edges; interactive open/close per office (frontend-designer-engineer)
- [ ] 6.2 Add `SocialNetwork` story: create inline data with 3 person combos (each containing 3-5 post nodes); person nodes use icon URLs; proxy nodes show person avatar; expand to reveal post nodes; demonstrates icon-based proxy and member heterogeneity (frontend-designer-engineer)
- [ ] 6.3 Add `DataDrivenCombos` story: define nodes with `data.department` and `data.team` attributes; use `useMemo` to dynamically generate `ComboDefinition[]` from unique `department` values; demonstrates programmatic combo creation from data properties (frontend-designer-engineer)
- [ ] 6.4 Add `LargeScale` story: use `largeComboNodes`, `largeComboEdges`, `largeComboDefs`; set `animated={false}`; all combos initially collapsed; button to open all; demonstrates performance at scale with 200+ nodes across 20 combos (frontend-designer-engineer)

## 7. Unit Test Suites
<!-- COMPLEXITY: Medium — pure function testing with comprehensive edge cases -->

- [ ] 7.1 Create `src/utils/combo.test.ts`: test `resolveComboTree()` — empty input returns empty, single combo at depth 0, 2-level nesting depths correct, 3-level nesting depths correct, cycle detection throws, childComboIds populated correctly (senior-typescript-engineer)
- [ ] 7.2 Extend `src/utils/combo.test.ts`: test `getComboForNode()` — node found returns combo, node not in any combo returns undefined, node in nested combo returns direct parent combo (senior-typescript-engineer)
- [ ] 7.3 Extend `src/utils/combo.test.ts`: test `getComboAncestors()` — top-level combo returns empty array, 2-level returns `[parent]`, 3-level returns `[parent, grandparent]` in order (senior-typescript-engineer)
- [ ] 7.4 Create `src/utils/comboTransform.test.ts`: test `transformCollapsedCombos()` — no collapsed combos returns unchanged, single collapsed combo produces proxy + rerouted edges, intra-combo edges eliminated, parallel edges aggregated with count metadata, empty combo produces proxy with 0 members, self-loop after remap eliminated (senior-typescript-engineer)
- [ ] 7.5 Create `src/layout/subLayouts/concentric.test.ts`: test `concentricSubLayout()` — 0 nodes returns empty, 1 node at (0,0), N nodes placed in rings, tightness=1 spacing > tightness=10 spacing, bounding box correct (senior-typescript-engineer)
- [ ] 7.6 Create `src/layout/subLayouts/grid.test.ts`: test `gridSubLayout()` — 0 nodes returns empty, 1 node at (0,0), 4 nodes in 2×2 grid, 7 nodes in 3×3 grid with empties, centering correct, tightness scaling (senior-typescript-engineer)
- [ ] 7.7 Create `src/layout/subLayouts/sequential.test.ts`: test `sequentialSubLayout()` — 0 nodes returns empty, 1 node at (0,0), right direction positive x, down direction positive y, left/up negative axes, centering, default direction is 'right', tightness scaling (senior-typescript-engineer)
- [ ] 7.8 Create `src/layout/subLayouts/lens.test.ts`: test `lensSubLayout()` — 0 nodes returns empty, 1 node at (0,0), N nodes have evenly distributed angles, distance increases with index (sqrt scaling), tightness scaling, bounding box (senior-typescript-engineer)
- [ ] 7.9 Create `src/utils/comboLayout.test.ts`: test `computeOpenComboSubLayouts()` — no open combos returns empty, single open combo produces positions and bounding box, nested open combos compute bottom-up; test `resolveComboPositions()` — body position + local offset = world position, nested position composition correct (senior-typescript-engineer)

## 8. Verification

- [ ] 8.1 Run `npm run lint` — passes with no new warnings
- [ ] 8.2 Run `npm test` — all tests pass including new combo test suites
- [ ] 8.3 Run `npm run build` — builds successfully
- [ ] 8.4 Verify Storybook: `npm start` → navigate to Demos/Combos, confirm all 24 stories render without errors
- [ ] 8.5 Verify no regressions: existing non-combo stories render unchanged
