## 1. Event Props Threading (`src/GraphScene.tsx`, `src/GraphCanvas/`)
<!-- COMPLEXITY: Medium — prop definitions and threading through component hierarchy -->
<!-- SHARED: src/GraphScene.tsx — from 103-two-phase-layout-pipeline; src/GraphCanvas/ — shared component -->

- [ ] 1.1 Define `ComboContextMenuProps` type in `src/types.ts`: `{ comboId: string, isOpen: boolean, memberCount: number, combo: InternalCombo, event: ThreeEvent<MouseEvent> }` (senior-typescript-engineer)
- [ ] 1.2 Add combo event callback props to `GraphCanvasProps` in `src/GraphCanvas/GraphCanvas.tsx`: `onComboClick`, `onComboDoubleClick`, `onComboContextMenu`, `onComboPointerOver`, `onComboPointerOut` with signatures per design.md (senior-typescript-engineer)
- [ ] 1.3 Add matching combo event props to `GraphSceneProps` in `src/GraphScene.tsx` and accept them in `GraphScene` component destructuring (senior-typescript-engineer)
- [ ] 1.4 Thread combo event props from `GraphCanvas` → `GraphScene` via the `GraphScene` JSX render (senior-typescript-engineer)
- [ ] 1.5 In `GraphScene.tsx`, pass combo event props to each `ComboContainer` instance: map `onComboClick` → `onClick`, `onComboDoubleClick` → `onDoubleClick`, `onComboContextMenu` → `onContextMenu`, `onComboPointerOver` → `onPointerOver`, `onComboPointerOut` → `onPointerOut` (senior-typescript-engineer)

## 2. ComboContainer Interaction Handlers (`src/symbols/ComboContainer.tsx`)
<!-- COMPLEXITY: Medium — extending existing component with new event handlers -->
<!-- SHARED: src/symbols/ComboContainer.tsx — from 101-02-combo-container-primitive -->

- [ ] 2.1 Add `onDoubleClick` and `onContextMenu` to `ComboContainerProps` interface with types `(comboId: string, event: ThreeEvent<MouseEvent>) => void` and `(props: ComboContextMenuProps) => void` respectively (senior-typescript-engineer)
- [ ] 2.2 Implement `handleDoubleClick` callback with `useCallback`: guard on `disabled`, call `event.stopPropagation()`, invoke `onDoubleClick?.(comboId, event)` (senior-typescript-engineer)
- [ ] 2.3 Implement `handleContextMenu` callback with `useCallback`: guard on `disabled`, call `event.stopPropagation()` and `event.nativeEvent.preventDefault()`, construct `ComboContextMenuProps` from combo data, invoke `onContextMenu?.(props)` (senior-typescript-engineer)
- [ ] 2.4 Wire `handleDoubleClick` and `handleContextMenu` to the outer `<group>` element's R3F event props (senior-typescript-engineer)
- [ ] 2.5 Add `internalCombo` (full `InternalCombo` object) as a prop to ComboContainer so context menu and callbacks can include full combo metadata (senior-typescript-engineer)

## 3. Drag Containment for Combos (`src/utils/useDrag.ts`)
<!-- COMPLEXITY: Medium — extending existing drag hook with combo boundary clamping -->
<!-- SHARED: src/utils/useDrag.ts — existing hook, adding combo-specific logic -->

- [ ] 3.1 Import `comboContainers` and `comboDefinitions` from store in `useDrag.ts`; create a `nodeComboMap` ref that maps node IDs to their open combo IDs (rebuilt when `comboDefinitions` or `openComboIds` change) (senior-typescript-engineer)
- [ ] 3.2 After computing raw drag position in the drag handler, look up the dragged node's combo membership via `nodeComboMap`; if the node belongs to an open combo, retrieve its `ComboContainerData` from `comboContainers` (senior-typescript-engineer)
- [ ] 3.3 Implement circle containment clamping: compute distance from combo center, clamp to `maxRadius = combo.radius - nodeRadius` if exceeded (reuse pattern from existing cluster containment) (senior-typescript-engineer)
- [ ] 3.4 Implement rectangle containment clamping: compute axis-aligned min/max bounds from combo center ± `(halfWidth - nodeRadius, halfHeight - nodeRadius)`, clamp drag position to bounds (senior-typescript-engineer)
- [ ] 3.5 Ensure drag containment is only applied when `constrainDragging` is enabled or when node is inside an open combo (combo containment is always active for member nodes regardless of `constrainDragging` prop) (senior-typescript-engineer)
- [ ] 3.6 Add unit tests in `src/utils/useDrag.test.ts` for the clamping logic: test circle clamping at boundary, rectangle clamping at corners, no clamping for non-combo nodes (senior-typescript-engineer)

## 4. GraphCanvasRef API Extensions (`src/GraphCanvas/GraphCanvas.tsx`)
<!-- COMPLEXITY: Low — thin wrappers around store getters/setters -->
<!-- SHARED: src/GraphCanvas/GraphCanvas.tsx — shared component -->

- [ ] 4.1 Update `GraphCanvasRef` interface in `src/GraphCanvas/GraphCanvas.tsx` (or `src/types.ts` if defined there) to include: `openCombo(comboId: string): void`, `closeCombo(comboId: string): void`, `toggleCombo(comboId: string): void`, `openAllCombos(): void`, `closeAllCombos(): void`, `isComboOpen(comboId: string): boolean`, `getComboMembers(comboId: string): InternalGraphNode[]` (senior-typescript-engineer)
- [ ] 4.2 Implement `openCombo`, `closeCombo`, `toggleCombo` in `useImperativeHandle`: read current store state, update `openComboIds` and `collapsedComboIds` via setters (senior-typescript-engineer)
- [ ] 4.3 Implement `openAllCombos`, `closeAllCombos` in `useImperativeHandle`: read all combo IDs from `comboDefinitions`, set all open or all collapsed (senior-typescript-engineer)
- [ ] 4.4 Implement `isComboOpen` and `getComboMembers` in `useImperativeHandle`: `isComboOpen` checks `openComboIds.includes(id)`; `getComboMembers` looks up combo definition and filters `nodes` by `memberNodeIds` (senior-typescript-engineer)

## 5. Selection State Integration (`src/store.ts`)
<!-- COMPLEXITY: Low — combos use existing selection mechanism, no new store fields -->
<!-- SHARED: src/store.ts — also modified by 100, 101-01, 103, 104 -->

- [ ] 5.1 Verify that proxy nodes (created by 101-01) participate in the existing `selections` array via standard node click handling — no changes needed if proxy IDs are already valid selection targets (senior-typescript-engineer)
- [ ] 5.2 In `ComboContainer`, wire the `onClick` handler to include the combo ID in callback args so consumers can add it to `selections` (confirm this is already done in 101-02; if not, add it) (senior-typescript-engineer)
- [ ] 5.3 Document in Storybook demos how consumers implement combo selection: `onComboClick` callback → `setSelections([...selections, combo.id])` pattern (senior-typescript-engineer)

## 6. Storybook Demos (`stories/demos/Combo.story.tsx`)
<!-- COMPLEXITY: Medium — interactive stories demonstrating each interaction pattern -->
<!-- SHARED: stories/demos/Combo.story.tsx — also used by 101-01, 103, 104 -->

- [ ] 6.1 Create `ComboDoubleClick` story: 2 combos (one open, one closed), double-click to toggle open/close state; story manages `collapsedComboIds`/`openComboIds` in React state (senior-typescript-engineer)
- [ ] 6.2 Create `ComboContextMenu` story: right-click on combo proxy or container shows a custom context menu overlay with combo info (comboId, isOpen, memberCount); demonstrates `onComboContextMenu` callback usage (senior-typescript-engineer)
- [ ] 6.3 Create `ComboDragContainment` story: open combo with `draggable={true}` member nodes; demonstrates nodes staying within combo boundary; includes both circle and rectangle combo shapes (senior-typescript-engineer)
- [ ] 6.4 Create `ComboSelection` story: clickable combos with selection state displayed in a panel; demonstrates `onComboClick` → `setSelections` pattern and multi-select with Ctrl+click (senior-typescript-engineer)
- [ ] 6.5 Create `ComboProgrammatic` story: buttons calling `graphRef.current.openCombo()`, `closeCombo()`, `toggleCombo()`, `openAllCombos()`, `closeAllCombos()`; displays `isComboOpen()` and `getComboMembers()` results in a panel (senior-typescript-engineer)

## 7. Verification

- [ ] 7.1 Run `npm run lint` — passes with no new warnings
- [ ] 7.2 Run `npm test` — all tests pass including new drag containment tests
- [ ] 7.3 Run `npm run build` — builds successfully with new code
- [ ] 7.4 Verify Storybook: `npm start` → ComboDoubleClick story: double-click toggles combo open/close
- [ ] 7.5 Verify Storybook: ComboContextMenu story: right-click shows context menu with correct combo metadata
- [ ] 7.6 Verify Storybook: ComboDragContainment story: nodes stay within combo boundary for both circle and rectangle shapes
- [ ] 7.7 Verify Storybook: ComboSelection story: clicking combo adds to selections, Ctrl+click appends
- [ ] 7.8 Verify Storybook: ComboProgrammatic story: buttons trigger correct state changes, query methods return correct values
- [ ] 7.9 Verify no regression: existing non-combo stories render unchanged
