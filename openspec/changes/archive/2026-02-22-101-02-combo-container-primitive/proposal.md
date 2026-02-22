# Change: 101-02-combo-container-primitive

## Why

The combo data model (100-combo-data-model) defines how combos are stored and resolved, but there is no visual representation yet. Open combos need a visible boundary drawn around their member nodes so users can perceive groupings. This change creates the `ComboContainer` rendering primitive — a Three.js component that draws a circle or rectangle boundary with label, theming, and interaction support — which downstream changes (103-two-phase-layout-pipeline, 104-open-close-animation, 106-combo-interactions) depend on for visual output.

## What Changes

1. **Theme extension** in `src/themes/theme.ts`: Add `combo?` section to `Theme` interface (parallel to `cluster?`), with defaults in `lightTheme.ts` and `darkTheme.ts`.
2. **Circle shape component** in `src/symbols/containers/CircleContainer.tsx`: Ring-based container using `ringGeometry` (same pattern as `clusters/Ring.tsx`) with translucent fill and stroke border.
3. **Rectangle shape component** in `src/symbols/containers/RectangleContainer.tsx`: Plane-based container using `planeGeometry` for fill and `edgesGeometry`/`lineSegments` for border, or `RoundedBox` from drei.
4. **ComboContainer wrapper** in `src/symbols/ComboContainer.tsx`: Orchestrator component that delegates to circle or rectangle sub-component based on `shape` prop. Handles spring-animated position/size, theme resolution, label rendering, hover/click events, drag support, and cursor management — following the `Cluster.tsx` pattern closely.
5. **GraphScene integration**: Render `ComboContainer` instances from `comboContainers` store state inside the scene graph (at z=-1, behind nodes).
6. **Storybook demos** in `stories/demos/Combo.story.tsx`: Stories for circle, rectangle, animated, and themed container variants.

## Dependencies

- **100-combo-data-model**: Provides `ComboDefinition`, `ComboContainerData`, `InternalCombo` types, store state (`comboContainers`, `comboDefinitions`), and `GraphCanvas`/`GraphScene` combo props.

## Capabilities

### New Capabilities
- `combo-system`: ComboContainer rendering primitive with circle and rectangle shapes, dynamic sizing, theme support, and interaction events

### Modified Capabilities
_(none)_

## Impact

- **src/themes/theme.ts** — `Theme` interface extended with optional `combo` section
- **src/themes/lightTheme.ts** — Default combo theme values added
- **src/themes/darkTheme.ts** — Default combo theme values added
- **src/symbols/containers/CircleContainer.tsx** — New file: circle shape mesh component
- **src/symbols/containers/RectangleContainer.tsx** — New file: rectangle shape mesh component
- **src/symbols/containers/index.ts** — New barrel export
- **src/symbols/ComboContainer.tsx** — New file: main container orchestrator
- **src/symbols/index.ts** — Updated barrel export to include ComboContainer
- **src/GraphScene.tsx** — Render ComboContainer instances from store state
- **stories/demos/Combo.story.tsx** — New or extended Storybook stories

## Reuse Inventory

### Existing Code
- `src/symbols/Cluster.tsx` — Nearly identical structure: uses `useSpring` for animated position, `useStore` for theme/actives/selections/draggingIds, `useDrag` for draggable container, `useHoverIntent` for hover events, `useCursor` for cursor changes, `Ring` sub-component for visual, `Label` for text. ComboContainer follows this pattern directly.
- `src/symbols/clusters/Ring.tsx` — Circle shape rendering with `ringGeometry` for fill + stroke meshes, animated opacity via `@react-spring/three`. CircleContainer reuses this geometry pattern.
- `src/symbols/Label.tsx` — Text label component used by Cluster.tsx; reused for combo label positioning at bottom edge.
- `src/themes/theme.ts:Theme.cluster` — Theme structure pattern with `stroke`, `fill`, `opacity`, `selectedOpacity`, `inactiveOpacity`, `label`; combo theme section mirrors this structure.
- `src/themes/lightTheme.ts` / `src/themes/darkTheme.ts` — Default theme value patterns; combo defaults follow same conventions.
- `src/utils/animation.ts:animationConfig` — Shared spring animation configuration; used in all animated components.
- `src/utils/useDrag.ts:useDrag` — Drag hook used by Cluster; reused for draggable combo containers.
- `src/utils/useHoverIntent.ts:useHoverIntent` — Hover intent detection; reused for combo hover events.

### From Dependency Specs
- **100-combo-data-model**: `ComboContainerData` type per `openspec/specs/combo-system.md`
  - Expected interface: `{ comboId, center, boundingBox: CenterPositionVector, shape, radius?, width?, height?, memberNodeIds }`
  - Relevant scenario: "combo container computed after layout"
- **100-combo-data-model**: Store state `comboContainers: Map<string, ComboContainerData>` per `openspec/changes/100-combo-data-model/proposal.md`
  - ComboContainer reads from this map to know where and how to render each container

### Net-New Components
- `CircleContainer` — Ring-geometry-based shape component; while it follows `clusters/Ring.tsx` pattern, it's a separate component because combos have different sizing semantics (bounding box driven) and need to support the combo theme section.
- `RectangleContainer` — Plane-geometry-based shape component with border; no equivalent exists in the codebase (clusters only support circles).
- `ComboContainer` — Orchestrator that delegates to shape sub-components; while structurally similar to `Cluster.tsx`, it's a separate component because combos are a different entity type with different store state, props, and interaction semantics.

## Backwards Compatibility

None required. All additions are new components and optional theme extensions. Existing cluster rendering is untouched.
