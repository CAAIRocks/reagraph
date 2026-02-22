## Context

The combo rendering pipeline (100–105) provides data modeling, collapsed proxy nodes, open container primitives, two-phase layout, and animated transitions. Users can see combos but cannot interact with them beyond what the consumer manually wires. This design adds the interaction layer: event handling on combo elements, drag containment within open combo boundaries, programmatic API methods on `GraphCanvasRef`, and selection/hover integration.

The existing interaction patterns in `Node.tsx`, `Cluster.tsx`, and `useDrag.ts` are the primary references. ComboContainer (from 101-02) already has `onClick`, `onPointerOver`, `onPointerOut` — this change extends it with `onDoubleClick` and `onContextMenu` and threads all combo events from `GraphCanvas` through `GraphScene`.

## Reuse Strategy

- **Node.tsx event pattern** → Proxy nodes are regular `InternalGraphNode` objects with `data.isCombo: true`. They already fire `onNodeClick`, `onNodeDoubleClick`, `onNodeContextMenu` via the standard node event system. No modification to Node.tsx needed for proxy interactions. Consumers detect combo proxy clicks by checking `node.data?.isCombo` in their callbacks.

- **Cluster.tsx interaction pattern** → ComboContainer already follows the Cluster pattern from 101-02: `useHoverIntent` for hover, `useCursor` for cursor, `onClick` for click. This change adds `onDoubleClick` and `onContextMenu` handlers using the same guard pattern (`if (disabled) return`).

- **useDrag.ts circular clamping** → Existing `constrainDragging` logic clamps node positions to a circular boundary (used for cluster containment). For circle-shaped combos, the same radial clamping applies with the combo container's bounding box as bounds. Rectangle combos need new axis-aligned clamping.

- **GraphCanvasRef imperative handle** → Existing `useImperativeHandle` in `GraphCanvas.tsx` exposes `centerGraph`, `fitNodesInView`, `zoomIn`, `zoomOut`, etc. Combo methods are added to the same `useImperativeHandle` block.

- **Selection system** → Combos use the existing `selections` array. Proxy nodes are already selectable as nodes. Container background clicks add the combo ID to selections via the `onComboClick` → consumer → `setSelections` pattern.

**Dependency interface assumptions:**
- `ComboContainerData` from store has `center`, `boundingBox` (with `width`, `height`), `shape`, and `comboId` fields.
- `comboDefinitions` from store provides `memberNodeIds` for each combo.
- `openComboIds` and `collapsedComboIds` with their setters are available in the store.

## Goals / Non-Goals

**Goals:**
- Add double-click toggle, context menu, and full pointer event callbacks to combo containers
- Thread combo event props from GraphCanvas → GraphScene → ComboContainer
- Constrain node dragging within open combo container boundaries (circle and rectangle)
- Extend GraphCanvasRef with programmatic combo methods (open, close, toggle, query)
- Integrate combo selection with the existing selection mechanism
- Support hover intent on combo containers with pointer event callbacks
- Add Storybook demos for each interaction pattern

**Non-Goals:**
- Keyboard navigation for combos (stretch goal deferred to follow-up)
- Custom combo renderers or render override props
- Drag-and-drop nodes between combos (future enhancement)
- Nested combo interaction specifics (handled by 105)
- Combo-specific selection highlighting styles (consumers handle via callbacks)

## Decisions

### 1. Event Props Threading Pattern

New props on `GraphCanvasProps` and `GraphSceneProps`:

```typescript
// In GraphCanvasProps / GraphSceneProps
onComboClick?: (combo: InternalCombo, event: ThreeEvent<MouseEvent>) => void;
onComboDoubleClick?: (combo: InternalCombo, event: ThreeEvent<MouseEvent>) => void;
onComboContextMenu?: (props: ComboContextMenuProps) => void;
onComboPointerOver?: (combo: InternalCombo, event: ThreeEvent<PointerEvent>) => void;
onComboPointerOut?: (combo: InternalCombo, event: ThreeEvent<PointerEvent>) => void;
```

`GraphCanvas` passes these through to `GraphScene` which passes them to each `ComboContainer` instance. This follows the same prop-threading pattern used for `onNodeClick` → `GraphScene` → `Node`.

### 2. ComboContextMenuProps Type

```typescript
interface ComboContextMenuProps {
  comboId: string;
  isOpen: boolean;
  memberCount: number;
  combo: InternalCombo;
  event: ThreeEvent<MouseEvent>;
}
```

Defined in `src/types.ts` alongside other public types. The context menu callback receives rich metadata so consumers can build context menus without additional lookups.

### 3. ComboContainer Event Handlers

Extend ComboContainer (from 101-02) with two new handlers:

```typescript
// onDoubleClick handler
const handleDoubleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
  if (disabled) return;
  event.stopPropagation();
  onDoubleClick?.(comboId, event);
}, [disabled, comboId, onDoubleClick]);

// onContextMenu handler
const handleContextMenu = useCallback((event: ThreeEvent<MouseEvent>) => {
  if (disabled) return;
  event.stopPropagation();
  onContextMenu?.({
    comboId,
    isOpen: true, // container is only rendered for open combos
    memberCount: memberNodeIds.length,
    combo: internalCombo,
    event
  });
}, [disabled, comboId, memberNodeIds, internalCombo, onContextMenu]);
```

Applied to the outer `<group>` element via `onDoubleClick` and `onContextMenu` R3F event props.

### 4. Drag Containment for Combo Members

In `useDrag.ts`, after computing the raw drag position, check if the dragged node is a member of an open combo. If so, clamp the position to the combo container's bounding box:

```typescript
// Look up combo containment for this node
const combo = comboContainers.get(nodeComboId);
if (combo) {
  if (combo.shape === 'circle') {
    // Radial clamping (existing pattern from cluster containment)
    const dx = dragX - combo.center.x;
    const dy = dragY - combo.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = combo.radius - nodeRadius;
    if (dist > maxRadius) {
      dragX = combo.center.x + (dx / dist) * maxRadius;
      dragY = combo.center.y + (dy / dist) * maxRadius;
    }
  } else if (combo.shape === 'rectangle') {
    // Axis-aligned clamping (new)
    const halfW = combo.width / 2 - nodeRadius;
    const halfH = combo.height / 2 - nodeRadius;
    dragX = Math.max(combo.center.x - halfW, Math.min(combo.center.x + halfW, dragX));
    dragY = Math.max(combo.center.y - halfH, Math.min(combo.center.y + halfH, dragY));
  }
}
```

The `nodeComboId` is determined by looking up the dragged node ID in `comboDefinitions` member lists (only for open combos). This lookup is cached in a ref to avoid per-frame recomputation.

### 5. GraphCanvasRef Combo Methods

Added to the existing `useImperativeHandle` in `GraphCanvas.tsx`:

```typescript
useImperativeHandle(ref, () => ({
  // ... existing methods ...

  openCombo: (comboId: string) => {
    const state = storeRef.current.getState();
    state.setCollapsedComboIds(state.collapsedComboIds.filter(id => id !== comboId));
    state.setOpenComboIds([...state.openComboIds, comboId]);
  },

  closeCombo: (comboId: string) => {
    const state = storeRef.current.getState();
    state.setOpenComboIds(state.openComboIds.filter(id => id !== comboId));
    state.setCollapsedComboIds([...state.collapsedComboIds, comboId]);
  },

  toggleCombo: (comboId: string) => {
    const state = storeRef.current.getState();
    if (state.openComboIds.includes(comboId)) {
      ref.current.closeCombo(comboId);
    } else {
      ref.current.openCombo(comboId);
    }
  },

  openAllCombos: () => {
    const state = storeRef.current.getState();
    const allIds = state.comboDefinitions.map(c => c.id);
    state.setOpenComboIds(allIds);
    state.setCollapsedComboIds([]);
  },

  closeAllCombos: () => {
    const state = storeRef.current.getState();
    const allIds = state.comboDefinitions.map(c => c.id);
    state.setCollapsedComboIds(allIds);
    state.setOpenComboIds([]);
  },

  isComboOpen: (comboId: string) => {
    return storeRef.current.getState().openComboIds.includes(comboId);
  },

  getComboMembers: (comboId: string) => {
    const state = storeRef.current.getState();
    const combo = state.comboDefinitions.find(c => c.id === comboId);
    if (!combo) return [];
    return state.nodes.filter(n => combo.memberNodeIds.includes(n.id));
  }
}));
```

### 6. Selection Integration

No new store fields. Combo selection works through existing mechanisms:

- **Proxy nodes:** Already selectable as regular nodes. Proxy node ID goes into `selections` via `onNodeClick`.
- **Container background:** `onComboClick` callback notifies the consumer. Consumer calls `setSelections([...selections, comboId])` or equivalent. The consumer decides the selection semantics (replace vs append).
- **Multi-select:** Ctrl+click behavior is handled by the consumer's `onComboClick` handler checking `event.ctrlKey || event.metaKey`.

### 7. Hover Intent Integration

ComboContainer already uses `useHoverIntent` from 101-02. The new `onComboPointerOver` and `onComboPointerOut` callbacks are wired to the existing hover intent hooks:

```typescript
const { handlePointerOver, handlePointerOut } = useHoverIntent({
  disabled,
  onPointerOver: (event) => {
    onPointerOver?.(internalCombo, event);
    // Optional: add to actives
  },
  onPointerOut: (event) => {
    onPointerOut?.(internalCombo, event);
    // Optional: remove from actives
  }
});
```

## Risks / Trade-offs

1. **Drag containment lookup cost** — For each drag frame, we look up the dragged node's combo membership and container bounds. With a cached membership map (ref), this is O(1) per frame. Risk is low.

2. **Event bubbling from member nodes to container** — When clicking a member node inside an open combo, the event may bubble up to the ComboContainer's click handler. `event.stopPropagation()` on the member node click prevents this. Need to verify that existing Node.tsx handlers call `stopPropagation()`.

3. **Selection semantics left to consumer** — The library does not auto-select all members when a combo is selected. This is intentional — consumers have different needs (some want auto-highlight, some don't). The `onComboClick` callback provides the combo info for consumers to implement their own selection logic.

4. **Programmatic API state conflicts** — If a consumer provides controlled `collapsedComboIds` / `openComboIds` props, the programmatic API methods (which write to store) may conflict with the controlled state. The API methods should be used only in uncontrolled mode, or the consumer should update their state in response to store changes. This mirrors how `setSelections` works with controlled selections.

5. **Rectangular clamping is axis-aligned** — If combo containers are ever rotated, axis-aligned clamping breaks. Since containers don't rotate in the current design, this is acceptable.

## Migration Plan

No migration needed. All additions are new optional props and new methods on the existing ref. Existing consumers are unaffected.

## Open Questions

1. **Should the programmatic API methods accept options (e.g., `{ animated?: boolean }`) to control whether the transition animates?** — Deferred. Start with always using the current `animated` prop value. Can add options in a follow-up.

2. **Should keyboard navigation for combos (Enter to open, Escape to close, Tab navigation) be included?** — Deferred to a follow-up change. Listed as a stretch goal in the source document.

3. **Should drag containment account for node size (radius)?** — Yes, included in the design. The clamping subtracts `nodeRadius` from the boundary to keep the entire node visual within the container.
