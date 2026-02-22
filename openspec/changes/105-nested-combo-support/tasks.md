## 1. Depth-Ordered Closed Transform (`src/utils/comboTransform.ts`)
<!-- COMPLEXITY: High — modifying core transform to process iteratively by depth, rebuilding lookups per pass -->
<!-- SHARED: src/utils/comboTransform.ts — from 101-01-closed-combo-transform -->

- [ ] 1.1 Import `resolveComboTree` from combo data model utilities in `src/utils/comboTransform.ts` (senior-typescript-engineer)
- [ ] 1.2 At the start of `transformCollapsedCombos()`, call `resolveComboTree(input.comboDefinitions)` to obtain `InternalCombo[]` with depth values; build `comboDepthMap: Map<string, number>` (senior-typescript-engineer)
- [ ] 1.3 Sort `input.collapsedComboIds` by depth descending (deepest first) into `sortedCollapsedIds` (senior-typescript-engineer)
- [ ] 1.4 Refactor transform body to iterate `sortedCollapsedIds` with working arrays (`workingNodes`, `workingEdges`): each pass rebuilds `memberToCombo` lookup from current `workingNodes`, processes one combo (remove members, inject proxy, remap edges), then updates `workingNodes`/`workingEdges` for the next pass (senior-typescript-engineer)
- [ ] 1.5 Ensure inner proxy nodes (e.g., `combo-proxy-C`) are recognized as members of their parent combo in subsequent passes — verify that `memberNodeIds` matching includes proxy node IDs that appear in the working array as members of parent combos (senior-typescript-engineer)
- [ ] 1.6 Handle edge case: if a combo's `memberNodeIds` references a child combo's proxy that hasn't been created yet (should not happen with depth-first ordering — add defensive check and warning) (senior-typescript-engineer)

## 2. Bottom-Up Nested Sub-Layout (`src/utils/comboLayout.ts`)
<!-- COMPLEXITY: High — cascading sub-layout with body node injection into parent sub-layouts -->
<!-- SHARED: src/utils/comboLayout.ts — from 103-two-phase-layout-pipeline -->

- [ ] 2.1 Import `resolveComboTree` in `src/utils/comboLayout.ts` and call at the start of `computeOpenComboSubLayouts()` to obtain depth map (senior-typescript-engineer)
- [ ] 2.2 Sort `openComboIds` by depth descending (deepest first) into `sortedOpenIds` for bottom-up processing (senior-typescript-engineer)
- [ ] 2.3 Add a `bodyNodes: Map<string, InternalGraphNode>` accumulator — after computing each combo's sub-layout and creating its body node, store it in the map keyed by comboId (senior-typescript-engineer)
- [ ] 2.4 When gathering members for a combo's sub-layout, include body nodes of open child combos: look up `InternalCombo.childComboIds`, filter to those in `openComboIds`, retrieve their body nodes from the `bodyNodes` map, and append to the member list (senior-typescript-engineer)
- [ ] 2.5 Ensure body nodes from child combos carry their radius so the sub-layout algorithm can account for their size during positioning (pass radius in node data or as a top-level property) (senior-typescript-engineer)
- [ ] 2.6 When building `outerNodes`, exclude member nodes of ALL open combos at ALL depths — only the outermost body node(s) (those whose parent combo is not open) participate in the outer layout (senior-typescript-engineer)
- [ ] 2.7 Handle shadow edges for nested context: edges between members of sibling child combos (both open, same parent) produce shadow edges between their body nodes within the parent's sub-layout, not in the outer layout (senior-typescript-engineer)

## 3. Top-Down Nested Position Resolution (`src/utils/comboLayout.ts`)
<!-- COMPLEXITY: High — cascading position composition through nesting levels -->
<!-- SHARED: src/utils/comboLayout.ts — from 103-two-phase-layout-pipeline -->

- [ ] 3.1 Sort `openComboIds` by depth ascending (shallowest first) for top-down resolution in `resolveComboPositions()` (senior-typescript-engineer)
- [ ] 3.2 Add a `resolvedBodyPositions: Map<string, {x, y, z}>` accumulator — stores world positions for body nodes resolved during parent passes, enabling child combos to read their body position from this map (senior-typescript-engineer)
- [ ] 3.3 For each combo (sorted top-down): read body position from `resolvedBodyPositions` (for nested combos) or from `outerLayoutPositions` (for top-level combos); compose with local sub-layout offsets to produce member world positions (senior-typescript-engineer)
- [ ] 3.4 After resolving members, if any member is a child combo's body node (`combo-body-*`), record its world position in `resolvedBodyPositions` for the child combo's subsequent pass (senior-typescript-engineer)
- [ ] 3.5 Compute `ComboContainerData` for each open combo at each depth — pass combo depth to the container data so GraphScene can set z-ordering (senior-typescript-engineer)
- [ ] 3.6 Ensure body nodes at ALL nesting levels are excluded from `resolvedNodes` output — only leaf member nodes and non-combo nodes appear (senior-typescript-engineer)

## 4. Container Z-Ordering (`src/symbols/ComboContainer.tsx`)
<!-- COMPLEXITY: Low — single prop addition and z-position calculation -->
<!-- SHARED: src/symbols/ComboContainer.tsx — from 101-02-combo-container-primitive -->

- [ ] 4.1 Add `depth?: number` prop to `ComboContainerProps` interface with default value 0 (senior-typescript-engineer)
- [ ] 4.2 Compute container z-position as `const containerZ = -1 - ((depth ?? 0) * 0.5)` and use instead of hardcoded `-1` for mesh/group position (senior-typescript-engineer)
- [ ] 4.3 In `GraphScene.tsx`, resolve combo depth from `resolveComboTree()` result (memoized) and pass `depth` prop to each `<ComboContainer>` (senior-typescript-engineer)

## 5. Unit Tests — Nesting Scenarios (`src/utils/comboTransform.test.ts`, `src/utils/comboLayout.test.ts`)
<!-- COMPLEXITY: Medium — comprehensive scenario coverage for depth-ordered processing -->
<!-- PARALLEL: Can be started once Groups 1-3 interfaces are defined -->

- [ ] 5.1 Test `transformCollapsedCombos` with 3-level nesting all collapsed: verify only outermost proxy in output, inner proxies consumed (senior-typescript-engineer)
- [ ] 5.2 Test `transformCollapsedCombos` with partial collapse (outer open, inner collapsed): verify inner proxy appears as member, outer members unchanged (senior-typescript-engineer)
- [ ] 5.3 Test edge routing through 2-level collapsed nesting: edge from external node to depth-2 member → remapped to outermost proxy (senior-typescript-engineer)
- [ ] 5.4 Test edge between members at different nesting depths (both collapsed): verify correct proxy-to-proxy remapping (senior-typescript-engineer)
- [ ] 5.5 Test `computeOpenComboSubLayouts` with 2-level nesting both open: verify inner sub-layout runs first, inner body node participates in outer sub-layout (senior-typescript-engineer)
- [ ] 5.6 Test that inner body node radius is respected in outer sub-layout member list (body node has large radius property) (senior-typescript-engineer)
- [ ] 5.7 Test `resolveComboPositions` with 2-level nesting: verify cascading position composition — outer body pos + inner local pos + leaf local pos = correct world pos (senior-typescript-engineer)
- [ ] 5.8 Test `resolveComboPositions` with mixed open/closed: outer open, inner closed — proxy gets world position from outer body + local offset (senior-typescript-engineer)
- [ ] 5.9 Test `ComboContainerData` depth field: verify containers at different depths carry correct depth value for z-ordering (senior-typescript-engineer)
- [ ] 5.10 Test edge shadow splitting with nesting: edge from outer member to inner member (both open) → intra-combo from outer layout perspective (no outer shadow), sub-layout shadow within parent (senior-typescript-engineer)
- [ ] 5.11 Test no-op behavior: non-nested combos (all depth 0) produce identical output to pre-nesting implementation (senior-typescript-engineer)

## 6. Storybook Demos (`stories/demos/Combo.story.tsx`)
<!-- COMPLEXITY: Medium — interactive demos showing nested combo behavior -->
<!-- SHARED: stories/demos/Combo.story.tsx — also used by 101-01, 103 -->

- [ ] 6.1 Create `NestedClosed` story: 2-level nested combos (outer with 3 members + inner combo, inner with 4 members), all collapsed — shows single outermost proxy node with correct edge routing (senior-typescript-engineer)
- [ ] 6.2 Create `NestedPartialOpen` story: outer combo open, inner combo collapsed — shows outer container with members + inner proxy node visible inside container (senior-typescript-engineer)
- [ ] 6.3 Create `NestedAllOpen` story: both levels open — shows nested containers with correct z-layering, inner container visible inside outer container, all member nodes positioned (senior-typescript-engineer)
- [ ] 6.4 Create `NestedLayerByLayer` story: button triggers layer-by-layer open animation using `getComboAncestors` + sequential `setOpenComboIds` with `setTimeout` delays between levels (senior-typescript-engineer)
- [ ] 6.5 Add toggle controls to nested stories for switching individual combo levels between open/closed states (senior-typescript-engineer)

## 7. Verification

- [ ] 7.1 Run `npm run lint` — passes with no new warnings
- [ ] 7.2 Run `npm test` — all tests pass including new nesting tests
- [ ] 7.3 Run `npm run build` — builds successfully
- [ ] 7.4 Verify Storybook demos render correctly: `npm start` and visually inspect NestedClosed, NestedPartialOpen, NestedAllOpen, NestedLayerByLayer stories
- [ ] 7.5 Verify non-nested combo stories still render correctly (no regression)
- [ ] 7.6 Verify that flat combos (no `parentComboId`) produce identical behavior to pre-nesting implementation
