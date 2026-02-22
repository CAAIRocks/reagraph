## 1. Theme Extension (`src/themes/`)
<!-- COMPLEXITY: Low — adding optional section mirroring existing cluster pattern -->

- [ ] 1.1 Add `combo?` section to `Theme` interface in `src/themes/theme.ts` with fields: `fill?`, `stroke?`, `opacity?`, `selectedOpacity?`, `inactiveOpacity?`, `label?: { color?, fontSize?, offset?, stroke? }` [senior-typescript-engineer]
- [ ] 1.2 Add combo defaults to `lightTheme` in `src/themes/lightTheme.ts`: `stroke: '#D8E6EA'`, `opacity: 1`, `selectedOpacity: 1`, `inactiveOpacity: 0.1`, `label: { stroke: '#fff', color: '#2A6475' }` [senior-typescript-engineer]
- [ ] 1.3 Add combo defaults to `darkTheme` in `src/themes/darkTheme.ts`: `stroke: '#474B56'`, `opacity: 1`, `selectedOpacity: 1`, `inactiveOpacity: 0.1`, `label: { stroke: '#1E2026', color: '#ACBAC7' }` [senior-typescript-engineer]

## 2. Circle Shape Component (`src/symbols/containers/`)
<!-- COMPLEXITY: Medium — new component following Ring.tsx geometry pattern -->
<!-- PARALLEL: Groups 1, 2, and 3 can be worked simultaneously since they do not share files -->

- [ ] 2.1 Create `src/symbols/containers/CircleContainer.tsx` with props: `outerRadius`, `innerRadius`, `padding`, `normalizedFill`, `normalizedStroke`, `opacity`, `animated`, `theme` [frontend-designer-engineer]
- [ ] 2.2 Implement circle fill mesh using `ringGeometry` with `args={[outerRadius, 0, 128]}` and `meshBasicMaterial` with combo fill color, `DoubleSide`, `transparent: true`, `depthTest: false` [frontend-designer-engineer]
- [ ] 2.3 Implement circle stroke mesh using `ringGeometry` with `args={[outerRadius, innerRadius + padding, 128]}` and `meshBasicMaterial` with combo stroke color [frontend-designer-engineer]
- [ ] 2.4 Add animated opacity via `useSpring` following `clusters/Ring.tsx` pattern [frontend-designer-engineer]
- [ ] 2.5 Create `src/symbols/containers/index.ts` barrel export for `CircleContainer` and `RectangleContainer` [frontend-designer-engineer]

## 3. Rectangle Shape Component (`src/symbols/containers/`)
<!-- COMPLEXITY: Medium — new geometry pattern not present in codebase -->
<!-- PARALLEL: Groups 1, 2, and 3 can be worked simultaneously since they do not share files -->

- [ ] 3.1 Create `src/symbols/containers/RectangleContainer.tsx` with props: `width`, `height`, `padding`, `normalizedFill`, `normalizedStroke`, `opacity`, `animated`, `theme` [frontend-designer-engineer]
- [ ] 3.2 Implement rectangle fill mesh using `planeGeometry` with `args={[width + padding*2, height + padding*2]}` and `meshBasicMaterial` with combo fill color, `DoubleSide`, `transparent: true`, `depthTest: false` [frontend-designer-engineer]
- [ ] 3.3 Implement rectangle border using `EdgesGeometry` from the plane geometry rendered via `lineSegments` with `lineBasicMaterial` using combo stroke color [frontend-designer-engineer]
- [ ] 3.4 Add animated opacity via `useSpring` matching CircleContainer pattern [frontend-designer-engineer]

## 4. ComboContainer Wrapper (`src/symbols/ComboContainer.tsx`)
<!-- COMPLEXITY: Medium — orchestrator mirroring Cluster.tsx with shape delegation -->

- [ ] 4.1 Create `src/symbols/ComboContainer.tsx` with `ComboContainerProps` interface: `comboId`, `shape`, `center`, `boundingBox`, `padding?`, `label?`, `animated?`, `disabled?`, `labelFontUrl?`, `draggable?`, event callbacks (`onClick`, `onDoubleClick`, `onPointerOver`, `onPointerOut`, `onDragged`) [senior-typescript-engineer]
- [ ] 4.2 Implement store access: read `theme`, `actives`, `selections`, `draggingIds`, `hoveredNodeId` from Zustand store (matching Cluster.tsx pattern) [senior-typescript-engineer]
- [ ] 4.3 Implement opacity calculation based on selections/actives using `theme.combo` values (matching Cluster.tsx logic) [senior-typescript-engineer]
- [ ] 4.4 Implement position animation via `useSpring` with `containerPosition: [center.x, center.y, -1]` and `animationConfig` [senior-typescript-engineer]
- [ ] 4.5 Implement size computation: for circle `outerRadius = max(width, height)/2 + padding`, for rectangle pass `width`/`height` from boundingBox [senior-typescript-engineer]
- [ ] 4.6 Delegate to `CircleContainer` or `RectangleContainer` based on `shape` prop, passing computed size, normalized theme colors, opacity, and animated flag [senior-typescript-engineer]
- [ ] 4.7 Implement label rendering at bottom edge using `Label` component with combo theme label colors; position at `[0, -offset, 2]` where offset depends on shape [senior-typescript-engineer]
- [ ] 4.8 Implement event handling: `useHoverIntent` for hover, click/double-click handlers on `a.group`, `useDrag` for draggable containers, `useCursor` for cursor changes — all following Cluster.tsx patterns [senior-typescript-engineer]
- [ ] 4.9 Set `userData={{ id: comboId, type: 'combo' }}` on the outer `a.group` for hit testing [senior-typescript-engineer]
- [ ] 4.10 Export `ComboContainer` and `ComboContainerProps` from `src/symbols/index.ts` barrel [senior-typescript-engineer]

## 5. GraphScene Integration (`src/GraphScene.tsx`)
<!-- COMPLEXITY: Low — adding render loop for combo containers -->
<!-- SHARED: src/GraphScene.tsx — also modified by 103-two-phase-layout-pipeline, 106-combo-interactions -->

- [ ] 5.1 Import `ComboContainer` in `src/GraphScene.tsx` [senior-typescript-engineer]
- [ ] 5.2 Read `comboContainers` and `comboDefinitions` from store [senior-typescript-engineer]
- [ ] 5.3 Add render block after cluster rendering: iterate `comboContainers` map and render `<ComboContainer>` for each entry, forwarding `animated`, `disabled`, `labelFontUrl`, and combo event callbacks from props [senior-typescript-engineer]

## 6. Storybook Demos (`stories/demos/Combo.story.tsx`)
<!-- COMPLEXITY: Low — static stories with mock data -->
<!-- SHARED: stories/demos/Combo.story.tsx — also modified by 101-01-combo-data-model, 103, 106 -->

- [ ] 6.1 Create or extend `stories/demos/Combo.story.tsx` with "ContainerCircle" story: static combo container with circle shape and nodes positioned inside [frontend-designer-engineer]
- [ ] 6.2 Add "ContainerRectangle" story: same layout but with rectangle shape [frontend-designer-engineer]
- [ ] 6.3 Add "ContainerAnimated" story: container that dynamically resizes as node positions change (use timer or controls to move nodes) [frontend-designer-engineer]
- [ ] 6.4 Add "ContainerThemed" story: custom theme colors for combo container demonstrating theme.combo customization [frontend-designer-engineer]

## 7. Verification
<!-- COMPLEXITY: Low -->

- [ ] 7.1 Run `npm run lint` — passes with no new warnings
- [ ] 7.2 Run `npm run build` — builds successfully with new types and components (typecheck included in build)
