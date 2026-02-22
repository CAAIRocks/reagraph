## Context

The combo data model (100-combo-data-model) provides `ComboContainerData` objects via the Zustand store's `comboContainers` map. Each entry contains a combo's center position, bounding box, shape, and dimensions. This design defines how those data objects are rendered as Three.js geometry in the React Three Fiber scene graph.

The existing `Cluster.tsx` + `clusters/Ring.tsx` pattern is the primary reference implementation. ComboContainer follows this pattern closely but adds rectangle shape support and uses combo-specific store state and theme section.

## Reuse Strategy

- **Cluster.tsx pattern** → ComboContainer mirrors the same hook composition: `useSpring` for position animation, `useStore` for theme/state, `useDrag` for draggable containers, `useHoverIntent` for hover events, `useCursor` for cursor changes, `Label` for text. The main structural difference is shape delegation (circle vs rectangle) and reading from `comboContainers` instead of cluster groups.
- **clusters/Ring.tsx geometry** → CircleContainer reuses the same `ringGeometry` approach: outer fill mesh (`args={[outerRadius, 0, 128]}`) + stroke ring mesh (`args={[outerRadius, innerRadius + padding, 128]}`). No adaptation needed beyond using combo theme colors.
- **Theme structure** → `theme.combo` mirrors `theme.cluster` exactly (same fields, same label sub-structure). Implementation can be copy-paste with rename.
- **animationConfig** → Used as-is from `src/utils/animation.ts`.

**Dependency interface assumptions:**
- `ComboContainerData.center` provides `{ x, y, z }` position (same as cluster `position`).
- `ComboContainerData.boundingBox` is `CenterPositionVector` with `width` and `height` fields.
- `comboContainers` Map is populated by the layout pipeline (103-two-phase-layout-pipeline) after node positions are computed; until then, ComboContainer simply won't render (empty map).

## Goals / Non-Goals

**Goals:**
- Render a visual boundary (circle or rectangle) around open combo member nodes
- Animate position and size changes smoothly with react-spring
- Support combo-specific theming parallel to cluster theming
- Expose click, double-click, pointer-over, pointer-out interaction events
- Render at z=-1 (behind nodes, same layer as clusters)
- Set `userData: { id: comboId, type: 'combo' }` for hit testing
- Support drag interaction for combo containers

**Non-Goals:**
- Layout computation (handled by 103-two-phase-layout-pipeline)
- Collapse/expand animation (handled by 104-open-close-animation)
- Advanced interaction modes like context menus (handled by 106-combo-interactions)
- Nested combo visual stacking (future enhancement)
- Custom combo renderers (future enhancement; Cluster has `onRender` but we defer this)

## Decisions

### 1. Component Architecture: ComboContainer → CircleContainer / RectangleContainer

ComboContainer is the orchestrator that handles shared concerns (position animation, theme resolution, events, drag, label) and delegates shape rendering to a sub-component based on the `shape` prop.

```
ComboContainer (src/symbols/ComboContainer.tsx)
├── CircleContainer (src/symbols/containers/CircleContainer.tsx)
└── RectangleContainer (src/symbols/containers/RectangleContainer.tsx)
```

**Rationale:** Keeps shape-specific geometry isolated. Adding new shapes later is a single new file without modifying the orchestrator's core logic.

### 2. Circle Shape Geometry

Follows `clusters/Ring.tsx` exactly:
- **Fill mesh:** `<ringGeometry args={[outerRadius, 0, 128]} />` with `meshBasicMaterial` using combo fill color
- **Stroke mesh:** `<ringGeometry args={[outerRadius, innerRadius + padding, 128]} />` with combo stroke color
- `outerRadius = max(boundingBox.width, boundingBox.height) / 2 + padding`
- Both meshes use `DoubleSide`, `transparent: true`, `depthTest: false`

### 3. Rectangle Shape Geometry

Two meshes:
- **Fill mesh:** `<planeGeometry args={[width + padding*2, height + padding*2]} />` with `meshBasicMaterial` using combo fill color, `DoubleSide`, `transparent: true`, `depthTest: false`
- **Border mesh:** Create `EdgesGeometry` from the plane geometry and render via `<lineSegments>` with `lineBasicMaterial` using combo stroke color

**Alternative considered:** drei's `RoundedBox` for rounded corners. Deferred — adds visual complexity and the rectangular border via EdgesGeometry is simpler and consistent with the flat aesthetic.

### 4. Animation Spring Configuration

Position animation (same as Cluster.tsx):
```typescript
const { containerPosition } = useSpring({
  from: { containerPosition: [center.x, center.y, -1] },
  to: { containerPosition: [center.x, center.y, -1] },
  config: { ...animationConfig, duration: animated && !isDragging ? undefined : 0 }
});
```

Size animation (new — Cluster doesn't animate size):
```typescript
const { containerSize } = useSpring({
  to: { containerSize: [computedWidth, computedHeight, computedRadius] },
  config: { ...animationConfig, duration: animated ? undefined : 0 }
});
```

The shape sub-components receive animated size values and apply them to geometry args via `a.mesh` scale or by reconstructing geometry.

### 5. Theme Extension

```typescript
// In Theme interface (src/themes/theme.ts)
combo?: {
  fill?: ColorRepresentation;
  stroke?: ColorRepresentation;
  opacity?: number;
  selectedOpacity?: number;
  inactiveOpacity?: number;
  label?: {
    color?: string;
    fontSize?: number;
    offset?: [number, number, number];
    stroke?: string;
  };
};
```

Light theme defaults: `stroke: '#D8E6EA'`, `opacity: 1`, `selectedOpacity: 1`, `inactiveOpacity: 0.1`, `label: { stroke: '#fff', color: '#2A6475' }` — matching cluster defaults.

Dark theme defaults: `stroke: '#474B56'`, `opacity: 1`, `selectedOpacity: 1`, `inactiveOpacity: 0.1`, `label: { stroke: '#1E2026', color: '#ACBAC7' }` — matching cluster defaults.

### 6. GraphScene Integration

In `GraphScene.tsx`, after the existing cluster rendering block, iterate `comboContainers` from store and render a `<ComboContainer>` for each open combo:

```typescript
const comboContainers = useStore(state => state.comboContainers);
// ... in JSX:
{Array.from(comboContainers.values()).map(container => (
  <ComboContainer
    key={container.comboId}
    comboId={container.comboId}
    shape={container.shape}
    center={container.center}
    boundingBox={container.boundingBox}
    animated={animated}
    disabled={disabled}
    labelFontUrl={labelFontUrl}
    onClick={onComboClick ? (id, e) => onComboClick(comboDefinitions.find(c => c.id === id), e) : undefined}
    onDoubleClick={onComboDoubleClick ? (id, e) => onComboDoubleClick(comboDefinitions.find(c => c.id === id), e) : undefined}
  />
))}
```

### 7. Label Positioning

Label positioned at bottom edge of boundary:
- **Circle:** `[0, -outerRadius - labelOffset, 2]`
- **Rectangle:** `[0, -(height/2 + padding) - labelOffset, 2]`

Uses the `Label` component from `src/symbols/Label.tsx` with combo theme label colors.

## Risks / Trade-offs

1. **Rectangle border via EdgesGeometry** — `EdgesGeometry` + `lineSegments` produces sharp corners without anti-aliasing on some GPUs. If visual quality is insufficient, we can switch to drei's `RoundedBox` or a custom shader. Low risk — can be swapped in the RectangleContainer without affecting the rest of the system.

2. **Size animation via scale vs geometry reconstruction** — Animating mesh scale is GPU-efficient but can distort border line width. Animating geometry args requires new geometry each frame. We start with scale animation and can switch if border distortion is noticeable.

3. **No custom renderer prop yet** — Cluster.tsx supports `onRender` for custom rendering. ComboContainer defers this to avoid scope creep. Can be added in a follow-up.

4. **Store dependency on 100-combo-data-model** — ComboContainer reads `comboContainers` and `comboDefinitions` from the store. If 100 is not yet merged, the store fields won't exist. Tasks must enforce sequencing.

## Migration Plan

No migration needed. This is a net-new rendering component. It becomes active only when `comboContainers` store state is populated (by 103-two-phase-layout-pipeline).

## Open Questions

1. **Should ComboContainer support a custom renderer (`onRender`) like Cluster?** — Deferred for now. Can be added as a follow-up change.
2. **Should rectangle corners be rounded?** — Deferred. Start with sharp corners via EdgesGeometry; can switch to RoundedBox later.
3. **Should nested combos have visual stacking (z-offset per depth)?** — Deferred to a future change focused on nested combo rendering.
