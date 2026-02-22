## Context

When a combo is open (expanded), its member nodes must be arranged in a visually organized pattern within the combo boundary. The two-phase layout pipeline (103) will call these sub-layout algorithms to compute local positions for member nodes, then transform them to world coordinates. These algorithms are intentionally pure functions with no React, Three.js, or graphology dependencies — they take node IDs and configuration, return positions.

The existing layout system (`src/layout/`) uses `LayoutFactoryProps` tied to graphology graphs, drag state, and custom position getters. Sub-layouts are fundamentally simpler: they only need a list of node IDs and spacing parameters. This justifies a separate, lightweight interface.

## Reuse Strategy

- **`concentric2d.ts` ring math** — The angle distribution formula (`angle = 2π * i / count`) and ring capacity calculation from `concentric2d.ts` are adapted for the concentric sub-layout. Key difference: the sub-layout doesn't use graphology degree metrics for sorting; it receives a pre-ordered `nodeIds` array (the caller controls order).
- **`getLayoutCenter()` bounding box pattern** — Each algorithm computes its bounding box using the same min/max sweep. Since sub-layouts only produce 2D local coordinates, the bounding box is simplified to `{ width, height }` rather than the full `CenterPositionVector`.

## Goals / Non-Goals

**Goals:**
- Implement four sub-layout algorithms (concentric, grid, sequential, lens) as pure functions
- Define a clean `SubLayoutInput` → `SubLayoutOutput` interface consumed by the two-phase pipeline
- Tightness parameter controls spacing consistently across all algorithms
- Each algorithm computes its own bounding box
- Full unit test coverage for all algorithms and edge cases
- Storybook demos showing each arrangement type

**Non-Goals:**
- Integration with the main layout engine (see `103-two-phase-layout-pipeline`)
- 3D sub-layouts (all algorithms are 2D, producing x/y local coordinates)
- Dynamic re-layout on node addition/removal (sub-layouts are stateless; the pipeline re-invokes them)
- Node sizing within sub-layouts (all nodes treated as points; sizing is handled by the node size provider)

## Decisions

### D1: Sub-layouts in `src/layout/subLayouts/` directory

**Rationale:** Sub-layouts are logically part of the layout system but distinct from the main layout algorithms. A subdirectory keeps them co-located with layout code while avoiding namespace pollution. Each algorithm gets its own file for clear separation of concerns.

### D2: Pure functions with no external dependencies

**Rationale:** Sub-layouts take `nodeIds: string[]` and configuration, return `Map<string, {x, y}>` positions. They have no React, Three.js, graphology, or store dependencies. This makes them trivially testable and reusable. The two-phase pipeline is responsible for transforming local coordinates to world coordinates.

### D3: `SubLayoutOutput.positions` is `Map<string, { x: number; y: number }>`

**Rationale:** Using a Map keyed by node ID provides O(1) lookup when the pipeline needs to assign positions. The `{ x, y }` value type is intentionally simple — no z-coordinate since sub-layouts are 2D, and no full `InternalGraphPosition` since these are local coordinates centered at (0,0).

### D4: Tightness maps to spacing via formula

**Rationale:** `spacing = baseSpacing * (11 - tightness) / 5` provides a linear mapping where tightness=5 is 1x base spacing (default), tightness=1 is 2x (loose), and tightness=10 is 0.2x (tight). Each algorithm defines its own `baseSpacing` constant appropriate for its geometry:
- Concentric: `baseSpacing = 40` (ring spacing)
- Grid: `baseSpacing = 30` (cell spacing)
- Sequential: `baseSpacing = 30` (node spacing)
- Lens: `baseSpacing = 35` (radial increment)

### D5: Bounding box computed from actual positions

**Rationale:** Rather than computing theoretical bounds from the algorithm parameters, each algorithm sweeps its output positions to find actual min/max. This ensures the bounding box exactly contains all placed nodes, accounting for centering offsets and rounding.

### D6: Concentric ring sorting by array order (not degree)

**Rationale:** The existing `concentric2d.ts` sorts nodes by graphology degree. The sub-layout version doesn't have access to the graph, so it uses the input array order. The two-phase pipeline (103) is responsible for pre-sorting `nodeIds` by any desired metric before calling the sub-layout.

## Algorithm Details

### Concentric Sub-Layout

Arranges nodes in concentric rings around center (0,0).

```
Input: nodeIds, tightness (default 5)
baseSpacing = 40
ringSpacing = baseSpacing * (11 - tightness) / 5
baseRadius = ringSpacing

Algorithm:
1. If 0 nodes: return empty
2. If 1 node: place at (0, 0)
3. Ring capacity: ring_k_capacity = max(1, floor(2π * (baseRadius + k * ringSpacing) / minNodeSpacing))
   where minNodeSpacing = ringSpacing * 0.8
4. Fill rings: for each ring k starting at 0, place up to ring_k_capacity nodes
   - angle_i = 2π * i / count_in_ring
   - x = r_k * cos(angle_i), y = r_k * sin(angle_i)
   - r_k = baseRadius + k * ringSpacing
5. Compute bounding box from placed positions
```

### Grid Sub-Layout

Arranges nodes in a regular grid centered at (0,0).

```
Input: nodeIds, tightness (default 5)
baseSpacing = 30
cellSpacing = baseSpacing * (11 - tightness) / 5

Algorithm:
1. If 0 nodes: return empty
2. If 1 node: place at (0, 0)
3. cols = ceil(sqrt(n)), rows = ceil(n / cols)
4. For node at index i:
   - col = i % cols, row = floor(i / cols)
   - x = col * cellSpacing - (cols - 1) * cellSpacing / 2
   - y = row * cellSpacing - (rows - 1) * cellSpacing / 2
5. Compute bounding box from placed positions
```

### Sequential Sub-Layout

Arranges nodes in a line along a specified direction, centered at (0,0).

```
Input: nodeIds, tightness (default 5), direction (default 'right')
baseSpacing = 30
nodeSpacing = baseSpacing * (11 - tightness) / 5

Algorithm:
1. If 0 nodes: return empty
2. If 1 node: place at (0, 0)
3. totalLength = (n - 1) * nodeSpacing
4. For node at index i:
   - offset = i * nodeSpacing - totalLength / 2
   - direction 'right': (offset, 0)
   - direction 'left':  (-offset, 0)
   - direction 'down':  (0, offset)
   - direction 'up':    (0, -offset)
5. Compute bounding box from placed positions
```

### Lens Sub-Layout

Radial spread from center outward with even angle distribution.

```
Input: nodeIds, tightness (default 5)
baseSpacing = 35
radialIncrement = baseSpacing * (11 - tightness) / 5

Algorithm:
1. If 0 nodes: return empty
2. If 1 node: place at (0, 0)
3. For node at index i (0-based):
   - angle = 2π * i / n (evenly distributed)
   - distance = radialIncrement * (i + 1) / n * (n > 1 ? n : 1)
     Simplified: distance = radialIncrement * (i + 1)  when n > 1
     But scale so outermost node is at maxRadius = radialIncrement * ceil(sqrt(n))
   - Actually: distance = radialIncrement * (floor(i / spreadPerRing) + 1)
     where spreadPerRing = max(1, floor(sqrt(n)))
   
   Simplified approach:
   - angle = 2π * i / n
   - distance = radialIncrement * ((i / (n - 1)) * maxRings + 0.5) for n > 1
     where maxRings = ceil(sqrt(n))
   
   Cleanest approach:
   - angle = 2π * i / n  (golden angle variant for better spread)
   - distance = radialIncrement * sqrt(i + 1)  (square root scaling for even area distribution)
4. Compute bounding box from placed positions
```

The lens algorithm uses square-root distance scaling (`distance = radialIncrement * sqrt(i + 1)`) to achieve even area distribution, similar to sunflower seed patterns. Nodes are distributed at evenly-spaced angles with increasing distance from center.

## Bounding Box Computation

All algorithms use a shared utility:

```typescript
function computeBoundingBox(
  positions: Map<string, { x: number; y: number }>
): { width: number; height: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const { x, y } of positions.values()) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  
  return {
    width: positions.size > 0 ? maxX - minX : 0,
    height: positions.size > 0 ? maxY - minY : 0,
  };
}
```

This is extracted as a shared helper in `types.ts` or a shared utility within the `subLayouts/` directory.

## Interface Design

```typescript
// src/layout/subLayouts/types.ts

export interface SubLayoutInput {
  /** Node IDs to arrange. Order may influence placement (e.g., concentric inner ring). */
  nodeIds: string[];
  /** Spacing tightness: 1 (very loose) to 10 (very tight). Default: 5. */
  tightness?: number;
  /** Direction for sequential layout only. Default: 'right'. */
  direction?: 'right' | 'down' | 'left' | 'up';
}

export interface SubLayoutOutput {
  /** Local coordinates for each node (center = 0,0). */
  positions: Map<string, { x: number; y: number }>;
  /** Bounding box of all placed positions. */
  boundingBox: { width: number; height: number };
}

/** A sub-layout algorithm: pure function from input to positioned output. */
export type SubLayoutFn = (input: SubLayoutInput) => SubLayoutOutput;
```

## Risks / Trade-offs

- **Node order dependence in concentric:** The concentric algorithm places earlier nodes on inner rings. If the caller doesn't pre-sort by relevance/degree, the visual grouping may be suboptimal. This is by design — the pipeline controls sorting.
- **Lens golden angle vs even distribution:** The lens algorithm uses even angle spacing (`2π * i / n`) rather than golden angle spacing. This produces uniform angular distribution but may create visual overlap for small node counts. Golden angle could be a future improvement.
- **No node size awareness:** Sub-layouts treat all nodes as points. For nodes with varying sizes (via sizing provider), positions may overlap. The bounding box also doesn't account for node radii. This is acceptable for the initial implementation; the pipeline can add padding.

## Migration Plan

No migration needed. All additions are net-new files in a new directory with no modifications to existing code.

## Open Questions

_(none — all design decisions resolved)_
