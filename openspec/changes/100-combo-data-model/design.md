## Context

Reagraph supports attribute-based node clustering via `clusterAttribute`, but lacks explicit combo (node grouping) support with nesting, collapse/expand, and configurable arrangement. This change introduces the data model foundation: types, store state, prop threading, and tree-resolution utilities. All subsequent combo proposals (rendering, layout, animation, interactions) build on these types.

The existing cluster system (`buildClusterGroups`, `ClusterGroup`, `Ring` renderer) operates on data attributes and is orthogonal to combos. The two systems coexist — combos are explicit groupings defined by the consumer, clusters are implicit groupings derived from node data.

## Reuse Strategy

- **`CenterPositionVector`** from `src/utils/layout.ts` is used directly as the bounding box type within `ComboContainerData`. No adaptation needed.
- **`getLayoutCenter()`** from `src/utils/layout.ts` serves as the reference algorithm for computing combo container geometry. The combo container computation will follow the same min/max sweep pattern.
- **`GraphState` Zustand pattern** — Combo state fields and setters follow the exact same pattern as existing fields (e.g., `collapsedNodeIds`/`setCollapsedNodeIds`, `clusters`/`setClusters`). The `createStore` factory is extended with combo defaults.
- **`InternalGraphNode` extension pattern** — `InternalCombo extends ComboDefinition` mirrors how `InternalGraphNode extends GraphNode` adds computed fields to the public type.

## Goals / Non-Goals

**Goals:**
- Define stable TypeScript interfaces for the combo system that all dependent proposals consume
- Extend the Zustand store with combo state that follows existing patterns
- Thread combo props from `GraphCanvas` through `GraphScene` to the store
- Provide pure utility functions for combo tree resolution with cycle detection
- Full unit test coverage for utility functions

**Non-Goals:**
- Visual rendering of combos (see `101-02-combo-container-primitive`)
- Layout engine changes (see `102-sub-layout-engine`, `103-two-phase-layout-pipeline`)
- Collapse/expand animation (see `104-open-close-animation`)
- Nested combo rendering (see `105-nested-combo-support`)
- Interaction handling beyond prop callbacks (see `106-combo-interactions`)
- Storybook demos (see `107-combo-storybook-demos`)

## Decisions

### D1: Combo types live in `src/types.ts` alongside existing graph types

**Rationale:** All public and internal graph types are defined in `src/types.ts`. Placing combo types here maintains consistency, enables co-location with related types (`GraphNode`, `InternalGraphNode`), and avoids a separate type file that would fragment the type system.

### D2: Utility functions in new `src/utils/combo.ts` file

**Rationale:** Combo utilities are logically distinct from layout and cluster utilities. A dedicated file keeps responsibilities clear and avoids bloating existing utility files. Exported via `src/utils/index.ts` barrel.

### D3: `ComboContainerData.boundingBox` uses `CenterPositionVector` directly

**Rationale:** `CenterPositionVector` already captures min/max/center/dimensions for a set of positioned nodes — exactly what combo containers need. Reusing it avoids type duplication and ensures compatibility with existing layout utilities.

### D4: Store fields initialized with empty defaults (not undefined)

**Rationale:** Using `[]` and `new Map()` instead of `undefined` avoids null checks throughout the codebase. This matches the existing pattern where `collapsedNodeIds` defaults to `[]`.

### D5: Combo callbacks typed with `ComboDefinition` parameter

**Rationale:** `onComboClick` and `onComboDoubleClick` receive the full `ComboDefinition` (not just ID) for consumer convenience, matching the pattern of node/edge event callbacks that receive the full object.

## Type Definitions

### ComboDefinition (consumer-facing)

```typescript
export interface ComboDefinition {
  /** Unique combo identifier */
  id: string;
  /** Display label */
  label: string;
  /** Node IDs belonging to this combo */
  memberNodeIds: string[];
  /** Parent combo ID for nesting (undefined = top-level) */
  parentComboId?: string;
  /** Visual shape of the combo container */
  shape?: 'circle' | 'rectangle';
  /** Internal arrangement strategy for member nodes */
  arrangement?: 'concentric' | 'grid' | 'sequential' | 'lens';
  /** Direction for sequential arrangement */
  arrangementDirection?: 'right' | 'down' | 'left' | 'up';
  /** Spacing tightness (1 = loose, 10 = tight) */
  tightness?: number;
  /** Custom data (icon, fill, etc.) */
  data?: Record<string, any>;
}
```

### ComboContainerData (computed geometry)

```typescript
export interface ComboContainerData {
  /** The combo this container represents */
  comboId: string;
  /** Center position of the combo */
  center: { x: number; y: number; z: number };
  /** Bounding box with min/max/dimensions */
  boundingBox: CenterPositionVector;
  /** Visual shape */
  shape: 'circle' | 'rectangle';
  /** Radius (for circle shape) */
  radius?: number;
  /** Width (for rectangle shape) */
  width?: number;
  /** Height (for rectangle shape) */
  height?: number;
  /** Node IDs contained in this combo */
  memberNodeIds: string[];
}
```

### InternalCombo (resolved with computed fields)

```typescript
export interface InternalCombo extends ComboDefinition {
  /** Whether this combo is collapsed (showing proxy node) */
  collapsed: boolean;
  /** Whether this combo is open (expanded, showing members) */
  open: boolean;
  /** Nesting depth (0 = top-level) */
  depth: number;
  /** IDs of direct child combos */
  childComboIds: string[];
  /** Synthetic node ID when collapsed */
  proxyNodeId?: string;
}
```

## Store Extension

New fields added to `GraphState` interface:

```typescript
// State
comboDefinitions: ComboDefinition[];
collapsedComboIds: string[];
openComboIds: string[];
comboContainers: Map<string, ComboContainerData>;

// Setters
setComboDefinitions: (definitions: ComboDefinition[]) => void;
setCollapsedComboIds: (ids: string[]) => void;
setOpenComboIds: (ids: string[]) => void;
setComboContainers: (containers: Map<string, ComboContainerData>) => void;
```

In `createStore` factory, defaults:

```typescript
comboDefinitions: [],
collapsedComboIds: collapsedComboIds ?? [],
openComboIds: [],
comboContainers: new Map(),
setComboDefinitions: (definitions) => set({ comboDefinitions: definitions }),
setCollapsedComboIds: (ids) => set({ collapsedComboIds: ids }),
setOpenComboIds: (ids) => set({ openComboIds: ids }),
setComboContainers: (containers) => set({ comboContainers: containers }),
```

## Prop Threading

### GraphCanvas → GraphScene

`GraphCanvasProps` (in `GraphCanvas.tsx`) gains:

```typescript
combos?: ComboDefinition[];
collapsedComboIds?: string[];
onComboClick?: (combo: ComboDefinition) => void;
onComboDoubleClick?: (combo: ComboDefinition) => void;
```

These are destructured and forwarded to `GraphScene`. Inside `GraphScene`, `combos` and `collapsedComboIds` are synced to the store via effects (matching the pattern used for `selections`, `actives`, `collapsedNodeIds`).

The callback props (`onComboClick`, `onComboDoubleClick`) are stored in refs and consumed by the combo container renderer (in a later proposal).

## Combo Tree Resolution Algorithm

`resolveComboTree(combos: ComboDefinition[]): InternalCombo[]`

1. **Index phase:** Build a `Map<string, ComboDefinition>` for O(1) lookup by ID.
2. **Child resolution:** For each combo with a `parentComboId`, add its ID to the parent's `childComboIds` array.
3. **Cycle detection:** Walk the `parentComboId` chain for each combo using a visited set. If a combo is encountered twice, throw `Error('Cycle detected in combo hierarchy: ...')`.
4. **Depth computation:** For each combo, walk the `parentComboId` chain counting steps until reaching a root (no parent). Cache computed depths to avoid redundant walks.
5. **Output:** Return `InternalCombo[]` with `collapsed: false`, `open: true`, `depth`, `childComboIds`, and `proxyNodeId: undefined` as defaults.

Time complexity: O(n) where n = number of combos (each combo visited at most twice — once for child resolution, once for depth computation with caching).

## Risks / Trade-offs

- **Combo + Cluster coexistence:** A node can belong to both a cluster (via `clusterAttribute`) and a combo. This is intentionally allowed; the rendering layer (later proposals) must handle overlapping visual groupings. The data model does not prevent it.
- **Node in multiple combos:** The current `memberNodeIds` model allows a node to appear in multiple combos. Whether this is an error or valid use case is deferred to the rendering/layout layer. The data model records it as-is.
- **`proxyNodeId` population:** This field is set to `undefined` by `resolveComboTree`. It will be populated by the collapse transform (proposal `101-01`). The data model reserves the field.

## Migration Plan

No migration needed. All additions are net-new with no behavioral changes to existing code paths. The `combos` prop defaults to `undefined`, and the store initializes combo state as empty.

## Open Questions

_(none — all design decisions resolved)_
