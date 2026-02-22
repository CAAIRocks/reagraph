# Change: 106-combo-interactions

## Why

The combo system (100–105) provides data modeling, visual containers, layout, and animation for combo groups — but users have no way to interact with combos beyond what the consumer manually wires up. This change adds the interaction polish layer: double-click to toggle open/close, context menus, selection behavior, drag containment within open combos, hover intent, and a programmatic API on `GraphCanvasRef`. These interactions follow the same patterns already established by Node, Edge, and Cluster components, making combos feel native to the library.

## What Changes

1. **Event props threading** in `src/GraphScene.tsx` and `src/GraphCanvas/` — New optional combo callback props (`onComboClick`, `onComboDoubleClick`, `onComboContextMenu`, `onComboPointerOver`, `onComboPointerOut`) are accepted by `GraphCanvas` and threaded through `GraphScene` to combo components. Follows the same prop-drilling pattern used for node/edge/cluster events.

2. **ComboContainer interaction handlers** in `src/symbols/ComboContainer.tsx` — The container component (from 101-02) gains `onDoubleClick`, `onContextMenu` event handlers alongside the existing `onClick`, `onPointerOver`, `onPointerOut`. Context menu handler constructs `ComboContextMenuProps` with `{ comboId, isOpen, memberCount, event }`. All handlers guard on `disabled` prop.

3. **Drag containment for combos** in `src/utils/useDrag.ts` — When a dragged node is a member of an open combo, its drag position is clamped to the combo container's bounding box. Circle containers use radial distance clamping (existing pattern); rectangle containers use axis-aligned min/max clamping (new logic). The combo bounding box is read from `comboContainers` store state.

4. **GraphCanvasRef API extensions** in `src/GraphCanvas/GraphCanvas.tsx` — The ref exposed via `forwardRef` gains combo methods: `openCombo(id)`, `closeCombo(id)`, `toggleCombo(id)`, `openAllCombos()`, `closeAllCombos()`, `isComboOpen(id)`, `getComboMembers(id)`. These methods read/write `openComboIds` and `collapsedComboIds` in the store.

5. **Selection state integration** in `src/store.ts` — Combo proxy nodes and container backgrounds participate in the existing selection mechanism. Clicking a combo adds its ID to `selections`. No new selection fields needed — combos use the same `selections` array as nodes.

6. **Hover intent on combos** — Proxy nodes use existing `onNodePointerOver` / `onNodePointerOut` (they are nodes). Container backgrounds use `useHoverIntent` (already integrated in 101-02). New combo-specific pointer callbacks enable consumers to highlight combos on hover.

7. **Storybook demos** — Interactive stories for double-click toggle, context menu, drag containment, selection state, and programmatic API.

## Dependencies

- **100-combo-data-model**: Provides `ComboDefinition`, `InternalCombo`, store state (`comboDefinitions`, `collapsedComboIds`, `openComboIds`, `comboContainers`), and `GraphCanvas`/`GraphScene` combo props.
- **101-01-closed-combo-transform**: Provides proxy node creation; proxy nodes participate in click/double-click/hover events as regular nodes.
- **101-02-combo-container-primitive**: Provides `ComboContainer` component with existing interaction event support (`onClick`, `onPointerOver`, `onPointerOut`). This change extends it with `onDoubleClick` and `onContextMenu`.
- **103-two-phase-layout-pipeline**: Provides `comboContainers` store state with bounding box data used for drag containment bounds.
- **104-open-close-animation**: Provides transition orchestration for open/close; the programmatic API methods trigger the same state changes that drive transitions.

## Capabilities

### New Capabilities
- `combo-system`: Double-click combo toggle, combo context menu, combo selection behavior, drag containment in open combos, programmatic combo API on GraphCanvasRef, combo hover intent, combo event props on GraphCanvas

### Modified Capabilities
- `combo-system`: Extending combo-container-interaction-events with `onDoubleClick` and `onContextMenu` handlers; extending graph-canvas-combo-props with full event callback set

## Impact

- **src/GraphCanvas/GraphCanvas.tsx** — Extended `GraphCanvasRef` with combo methods; extended props with combo event callbacks (SHARED)
- **src/GraphScene.tsx** — Thread combo event props to ComboContainer instances (SHARED with 103, 104)
- **src/symbols/ComboContainer.tsx** — Add `onDoubleClick`, `onContextMenu` handlers; construct `ComboContextMenuProps` (SHARED from 101-02)
- **src/utils/useDrag.ts** — Add combo containment bounds logic for circle and rectangle shapes (SHARED)
- **src/store.ts** — No new fields; combos use existing `selections` array (SHARED with 100, 101-01, 103, 104)
- **src/types.ts** — New `ComboContextMenuProps` type definition
- **stories/demos/Combo.story.tsx** — New interaction-focused stories (SHARED with 101-01, 103, 104)

## Reuse Inventory

### Existing Code
- `src/symbols/Node.tsx:onClick/onDoubleClick/onContextMenu` — Existing node event handler pattern. Proxy nodes are regular nodes and already fire these events. No change needed for proxy interaction.
- `src/symbols/Cluster.tsx:useHoverIntent/useCursor/onClick` — Cluster interaction pattern. ComboContainer already follows this pattern from 101-02.
- `src/utils/useDrag.ts:constrainDragging/bounds` — Existing drag clamping with circular boundary for cluster containment. Extended with combo bounding box support and rectangular clamping.
- `src/utils/useHoverIntent.ts:useHoverIntent` — Hover intent detection hook. Already used by ComboContainer from 101-02.
- `src/selection/useSelection.ts` — Existing selection hook. Combo selections use the same mechanism — proxy node IDs or combo IDs go into `selections`.
- `src/store.ts:GraphState.selections/setSelections` — Existing selection state. Combos participate without new fields.
- `src/GraphCanvas/GraphCanvas.tsx:useImperativeHandle` — Existing pattern for exposing methods via ref (`centerGraph`, `fitNodesInView`, `zoomIn`, etc.). Combo methods follow the same pattern.

### From Dependency Specs
- **100-combo-data-model**: `comboDefinitions`, `collapsedComboIds`, `openComboIds`, `setCollapsedComboIds`, `setOpenComboIds` store fields per `openspec/specs/combo-system.md`
  - Expected interface: arrays of combo IDs with setter functions
  - Relevant scenario: "store updates collapsed combo IDs"
- **101-02-combo-container-primitive**: `ComboContainer` with `onClick`, `onPointerOver`, `onPointerOut` per `openspec/changes/101-02-combo-container-primitive/design.md`
  - Expected interface: event callbacks receiving `(comboId, event)` arguments
  - Relevant scenario: "combo container click event", "combo container hover events"
- **103-two-phase-layout-pipeline**: `comboContainers` store map with `ComboContainerData` per `openspec/specs/combo-system.md`
  - Expected interface: `Map<string, ComboContainerData>` with center, boundingBox, shape fields
  - Relevant scenario: "combo container computed after layout"

### Net-New Components
- `ComboContextMenuProps` type — `{ comboId: string, isOpen: boolean, memberCount: number, event: ThreeEvent<MouseEvent> }`. No existing context menu props type for combos.
- Rectangular drag clamping logic — Existing `useDrag.ts` has circular clamping for clusters. Rectangle combos need axis-aligned min/max clamping: `clampedX = Math.max(minX, Math.min(maxX, dragX))`.
- `GraphCanvasRef` combo methods — `openCombo`, `closeCombo`, `toggleCombo`, `openAllCombos`, `closeAllCombos`, `isComboOpen`, `getComboMembers`. These are thin wrappers around store getters/setters.

## Backwards Compatibility

None required. All additions are new optional props, new optional event callbacks, and new methods on the existing ref object. No existing APIs are changed or removed.
