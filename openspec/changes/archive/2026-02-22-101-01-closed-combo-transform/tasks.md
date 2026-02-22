## 1. Transform Utility (`src/utils/comboTransform.ts`)
<!-- COMPLEXITY: High — core algorithm with edge remapping, dedup, and position seeding -->

- [x] 1.1 Create `src/utils/comboTransform.ts` with `ComboTransformInput` and `ComboTransformOutput` interfaces (senior-typescript-engineer)
- [x] 1.2 Implement `transformCollapsedCombos()` Step 1: build `memberToCombo`, `collapsedComboSet`, and `comboDefMap` lookup structures from input (senior-typescript-engineer)
- [x] 1.3 Implement Step 2: filter out member nodes and inject proxy nodes with `combo-proxy-${comboId}` ID, label, data (`isCombo`, `comboId`, `memberCount`, `memberNodeIds`, `originalCombo`), size formula (`7 + Math.log2(memberCount) * 3`), and fill (senior-typescript-engineer)
- [x] 1.4 Implement `computeCentroid()` helper for position seeding — averages member node positions, returns undefined if no members have positions (senior-typescript-engineer)
- [x] 1.5 Implement proxy node position seeding: check `dragReferences` first, fall back to centroid, then undefined (senior-typescript-engineer)
- [x] 1.6 Implement Step 3: edge remapping — remap source/target through `memberToCombo` map, drop edges where `newSource === newTarget` (intra-combo and self-loops) (senior-typescript-engineer)
- [x] 1.7 Implement Step 4: deduplicate parallel edges by `${source}-${target}` key — single edges pass through, groups produce aggregated edge with `data.originalEdges`, `data.count`, `data.isAggregated`, scaled size, and `"N edges"` label (senior-typescript-engineer)
- [x] 1.8 Export `transformCollapsedCombos` and `computeCentroid` from `src/utils/comboTransform.ts`
- [x] 1.9 Add `export * from './comboTransform'` to `src/utils/index.ts` barrel

## 2. useGraph Integration (`src/useGraph.ts`)
<!-- COMPLEXITY: Medium — inserting transform call into existing pipeline -->
<!-- SHARED: src/useGraph.ts — also modified by 103-two-phase-layout-pipeline -->

- [x] 2.1 Import `transformCollapsedCombos` from `../utils/comboTransform` in `src/useGraph.ts`
- [x] 2.2 Read `comboDefinitions` and `collapsedComboIds` from store (alongside existing state reads)
- [x] 2.3 Insert `transformCollapsedCombos()` call between `getVisibleEntities()` output and `buildGraph()` input — pass `visibleNodes`, `visibleEdges`, `comboDefinitions`, `collapsedComboIds`, and `dragReferences`
- [x] 2.4 Pass `transformedNodes` and `transformedEdges` to `buildGraph()` instead of `visibleNodes`/`visibleEdges`

## 3. Unit Tests (`src/utils/comboTransform.test.ts`)
<!-- COMPLEXITY: Medium — comprehensive scenario coverage -->
<!-- PARALLEL: Groups 1 and 3 can be worked simultaneously since Group 3 tests the interface defined in Group 1 -->

- [x] 3.1 Test basic collapse: 3 nodes in combo → 1 proxy node + 2 remaining nodes; verify proxy has correct id, label, data.isCombo, data.memberCount, data.memberNodeIds
- [x] 3.2 Test edge remapping: edge from member node to outside node → source remapped to proxy; edge from outside to member → target remapped to proxy
- [x] 3.3 Test intra-combo edge elimination: edge between two nodes in same combo → dropped from output
- [x] 3.4 Test self-loop after remap: edge where both source and target are in the same combo → dropped
- [x] 3.5 Test parallel edge aggregation: two edges from different member nodes to same external target → aggregated into single edge with `data.count: 2` and label `"2 edges"`
- [x] 3.6 Test multiple simultaneous combos: two combos collapsed at once → two proxy nodes, edges between combos remapped to proxy-proxy
- [x] 3.7 Test edge between two different combos: both source and target in different collapsed combos → remapped to proxy-proxy edge
- [x] 3.8 Test node not in any combo: passes through unchanged in output
- [x] 3.9 Test position seeding from centroid: member nodes with positions → proxy position is average
- [x] 3.10 Test position seeding from drag references: dragReferences has entry for proxy ID → uses drag position over centroid
- [x] 3.11 Test no-op when collapsedComboIds is empty: output equals input
- [x] 3.12 Test no-op when comboDefinitions is empty: output equals input
- [x] 3.13 Test proxy node size formula: combo with 4 members → size = 7 + Math.log2(4) * 3 = 13

## 4. Storybook Demo (`stories/demos/Combo.story.tsx`)
<!-- COMPLEXITY: Medium — demo with interactive collapse/expand -->

- [x] 4.1 Create `stories/demos/Combo.story.tsx` with default export and story metadata
- [x] 4.2 Create `ClosedCombo` story: ~15 nodes grouped into 3 combos, with edges between and within combos
- [x] 4.3 Add state management with buttons to toggle collapse/expand per combo (using `collapsedComboIds` prop)
- [x] 4.4 Verify visual: collapsed combos render as single larger proxy nodes, edges between combos show aggregated count, expanding restores original nodes

## 5. Verification

- [x] 5.1 Run `npm run lint` — passes with no new warnings
- [x] 5.2 Run `npm test` — all tests pass including new comboTransform tests
- [x] 5.3 Run `npm run build` — builds successfully with new code
