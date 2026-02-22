# Change: 102-sub-layout-engine

## Why

The combo system requires a way to arrange member nodes within open combo containers. When a combo is expanded (open), its member nodes need to be positioned in a visually organized pattern — concentric rings, grids, lines, or radial spreads. These sub-layout algorithms are pure positioning functions that operate independently of the main graph layout engine. Without them, open combos would have no internal structure, and the two-phase layout pipeline (103) would have no way to compute member positions before placing combos in the outer layout.

## What Changes

1. **New interface types** in `src/layout/subLayouts/types.ts`: `SubLayoutInput`, `SubLayoutOutput`, and `SubLayoutFn` defining the contract for all sub-layout algorithms.
2. **Concentric algorithm** in `src/layout/subLayouts/concentric.ts`: Arranges nodes in concentric rings around center (0,0), placing highest-degree nodes in inner rings. Reuses math patterns from existing `concentric2d.ts`.
3. **Grid algorithm** in `src/layout/subLayouts/grid.ts`: Arranges nodes in a regular grid pattern centered at (0,0) with auto-calculated dimensions.
4. **Sequential algorithm** in `src/layout/subLayouts/sequential.ts`: Arranges nodes in a line along one of four directions (right, down, left, up) centered at (0,0).
5. **Lens algorithm** in `src/layout/subLayouts/lens.ts`: Radial spread from center outward with even angle distribution and distance proportional to index.
6. **Tightness parameter**: All algorithms share a tightness-to-spacing mapping (`spacing = baseSpacing * (11 - tightness) / 5`).
7. **Bounding box computation**: Each algorithm computes the bounding box of its output positions for use by the two-phase pipeline.
8. **Unit tests** for all four algorithms covering correctness, edge cases, and tightness behavior.
9. **Storybook demos** in `stories/demos/Combo.story.tsx` showing each arrangement type with static positioning.

## Dependencies

- `100-combo-data-model`: Combo types (`ComboDefinition` with `arrangement`, `arrangementDirection`, `tightness` fields) and store state

## Capabilities

### New Capabilities
- `combo-system`: Sub-layout algorithms (concentric, grid, sequential, lens) for arranging nodes within open combo containers

### Modified Capabilities
_(none)_

## Impact

- **src/layout/subLayouts/types.ts** — New file defining `SubLayoutInput`, `SubLayoutOutput`, `SubLayoutFn`
- **src/layout/subLayouts/concentric.ts** — New file with concentric ring sub-layout algorithm
- **src/layout/subLayouts/grid.ts** — New file with grid sub-layout algorithm
- **src/layout/subLayouts/sequential.ts** — New file with sequential line sub-layout algorithm
- **src/layout/subLayouts/lens.ts** — New file with lens radial sub-layout algorithm
- **src/layout/subLayouts/index.ts** — Barrel export for all sub-layout functions and types
- **src/layout/subLayouts/*.test.ts** — Unit test files for each algorithm
- **stories/demos/Combo.story.tsx** — Storybook demos for each sub-layout type

## Reuse Inventory

### Existing Code
- `src/layout/concentric2d.ts:concentric2d()` — Concentric ring math with level-based placement; the sub-layout concentric algorithm reuses the ring capacity and angle distribution logic but simplifies it (no graphology dependency, no drag refs, pure function)
- `src/utils/layout.ts:getLayoutCenter()` — Min/max sweep for bounding box computation; the bounding box calculation in each sub-layout follows this same pattern
- `src/utils/layout.ts:CenterPositionVector` — Type reference for bounding box dimensions; sub-layout output uses a simplified `{ width, height }` since local coordinates don't need full 3D bounds

### From Dependency Specs
- **100-combo-data-model**: `ComboDefinition` type per `openspec/changes/100-combo-data-model/design.md`
  - Expected interface: `arrangement?: 'concentric' | 'grid' | 'sequential' | 'lens'`, `arrangementDirection?: 'right' | 'down' | 'left' | 'up'`, `tightness?: number`
  - Relevant scenario: "combo definition with arrangement options" in `openspec/specs/combo-system.md`

### Net-New Components
- `SubLayoutInput` / `SubLayoutOutput` / `SubLayoutFn` types — No sub-layout interface exists; the main layout system uses `LayoutFactoryProps` which is tightly coupled to graphology and Three.js
- `concentricSubLayout()` — Simplified concentric ring placement as pure function; existing `concentric2d()` requires a graphology graph instance
- `gridSubLayout()` — No grid layout exists in codebase
- `sequentialSubLayout()` — No sequential/line layout exists in codebase
- `lensSubLayout()` — Simplified radial spread; existing `radialOut2d` is hierarchy-based via d3-hierarchy

## Backwards Compatibility

None required. All additions are net-new files in a new `src/layout/subLayouts/` directory with no modifications to existing APIs or behavior.
