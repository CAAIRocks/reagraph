## Context

Reagraph's layout pipeline in `useGraph.ts` currently runs a single pass: `buildGraph` → `layoutProvider` → `tick` → `transformGraph`. The closed combo transform (101-01) modifies the node/edge arrays *before* this pipeline, replacing collapsed combos with proxy nodes. However, open combos — where member nodes remain visible inside a container — require a fundamentally different approach: member nodes must be positioned locally within the combo, while the combo itself participates in the outer layout as a single rigid body.

This design introduces a two-phase pipeline that runs sub-layouts for open combo interiors (Phase 1), injects virtual body nodes into the outer layout (Phase 2), and resolves final world positions by composing body positions with local offsets.

**Dependency chain:** 100 (data model) → 101-01 (closed transform) + 101-02 (container primitive) + 102 (sub-layout engine) → **103 (this change)** → 104 (animation) → 105 (nesting).

## Reuse Strategy

- **`useGraph.ts:updateLayout`** — The existing callback structure is preserved. The two-phase logic wraps around the existing `buildGraph` → `layoutProvider` → `tick` → `transformGraph` sequence. No refactoring of the existing flow is needed; we insert pre-processing before `buildGraph` and post-processing after `tick`.
- **`layoutProvider()`** — Used as-is for the outer layout. Body nodes appear as regular simulation nodes to the layout engine.
- **`forceDirected.ts` collision force** — Body nodes leverage the existing `forceCollide(d => d.radius + 10)`. The radius property on body nodes causes natural spacing. Minimal change needed: ensure the radius accessor reads from node data for body nodes.
- **`buildGraph()` / `transformGraph()`** — Used as-is. `buildGraph` receives the modified arrays (with body nodes, without combo members). `transformGraph` runs on the resolved full node set after position resolution.
- **`CenterPositionVector`** — Reused for bounding box in `ComboContainerData`.
- **`calculateClusters()`** — Coexists unchanged. Cluster rings and combo containers are independent visual layers.
- **`transformCollapsedCombos()`** (from 101-01) — Called first in the pipeline. Its output (with proxy nodes for closed combos) feeds into the two-phase pipeline.
- **Sub-layout functions** (from 102) — Invoked per open combo in Phase 1. Expected interface: `(memberNodes, options) => { positions, boundingBox }`.
- **`ComboContainer` component** (from 101-02) — Rendered by GraphScene using `comboContainers` store data populated by `resolveComboPositions`.

**Assumption risk:** The sub-layout engine (102) interface is not yet finalized. If the return type diverges from `{ positions: Map<string, {x, y}>, boundingBox: {width, height} }`, the Phase 1 integration will need adjustment. This is low-risk since the interface is straightforward.

## Goals / Non-Goals

**Goals:**
- Implement a two-phase layout pipeline that correctly positions open combo members inside their containers while the containers participate in the outer layout
- Create virtual body nodes that represent open combos in the outer force simulation with appropriate collision radii
- Split edges into render edges (for display) and shadow edges (for layout force computation)
- Resolve final world positions by composing body node positions with local sub-layout offsets
- Populate `comboContainers` store state for `ComboContainer` rendering
- Support mixed scenarios: some combos open, some closed, some nodes not in any combo
- Initially restrict open combos to force-directed layouts

**Non-Goals:**
- Custom layout algorithms for combo interiors (handled by 102-sub-layout-engine)
- Collapse/expand animation transitions (handled by 104-open-close-animation)
- Nested combo support where open combos contain other open combos (handled by 105-nested-combo-support)
- Open combo support in hierarchical/tree/circular layouts (future enhancement)
- Combo container rendering implementation (handled by 101-02, consumed here)
- Drag interaction for body nodes or combo containers (separate concern)

## Full Pipeline Flow

```
Input: nodes, edges, comboDefinitions, collapsedComboIds, openComboIds, layoutType

┌─────────────────────────────────────────────────────────────┐
│ Pre-processing                                               │
│                                                              │
│  1. getVisibleEntities() → visibleNodes, visibleEdges        │
│     (existing tree-collapse filter)                          │
│                                                              │
│  2. transformCollapsedCombos() → transformedNodes,            │
│     transformedEdges                                         │
│     (from 101-01: proxy nodes for closed combos)             │
│                                                              │
│  3. filterOpenComboIds(openComboIds, layoutType)              │
│     → effectiveOpenComboIds                                  │
│     (restrict to force-directed; warn + treat as closed      │
│      for other layout types)                                 │
│                                                              │
│  4. IF effectiveOpenComboIds is empty → skip to standard     │
│     single-pass layout (no Phase 1/2)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Sub-Layouts (inside-out)                            │
│                                                              │
│  For each comboId in effectiveOpenComboIds:                   │
│    a. Gather member nodes from transformedNodes              │
│    b. Gather intra-combo edges                               │
│    c. Get sub-layout fn from comboDefinition.arrangement     │
│    d. Run sub-layout → { positions, boundingBox }            │
│    e. Store in subLayoutResults map                           │
│    f. Create body node:                                      │
│       id: combo-body-${comboId}                              │
│       radius: max(bb.width, bb.height) / 2 + padding        │
│                                                              │
│  Build outer graph arrays:                                   │
│    outerNodes = non-member nodes + body nodes                │
│    outerEdges = non-member edges + shadow edges              │
│    (member nodes and intra-combo edges excluded)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Outer Layout                                        │
│                                                              │
│  buildGraph(graph, outerNodes, outerEdges)                   │
│  layout = layoutProvider({...})                              │
│  await tick(layout)                                          │
│                                                              │
│  → Body nodes now have world positions from the simulation   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Position Resolution                                          │
│                                                              │
│  resolveComboPositions():                                    │
│    For each open combo:                                      │
│      bodyPos = layout position of combo-body-${comboId}      │
│      For each member in subLayoutResults:                    │
│        worldPos = bodyPos + localPos                         │
│      containerData = computeContainer(worldPositions)        │
│                                                              │
│  Assemble final arrays:                                      │
│    resolvedNodes = non-member nodes + resolved member nodes  │
│                    (body nodes EXCLUDED)                     │
│    resolvedEdges = original edges (shadow edges EXCLUDED)    │
│                                                              │
│  Store updates:                                              │
│    setComboContainers(containerDataMap)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Standard post-processing                                     │
│                                                              │
│  transformGraph({ graph, layout, ... })                      │
│  → final render data                                         │
└─────────────────────────────────────────────────────────────┘
```

## computeOpenComboSubLayouts Function

### Signature

```typescript
interface SubLayoutResult {
  comboId: string;
  positions: Map<string, { x: number; y: number }>;  // memberId → local position
  boundingBox: { width: number; height: number };
  bodyNode: InternalGraphNode;  // virtual body node for outer layout
}

interface ComboSubLayoutOutput {
  outerNodes: InternalGraphNode[];      // non-member nodes + body nodes
  outerEdges: InternalGraphEdge[];      // non-member edges + shadow edges
  renderEdges: InternalGraphEdge[];     // original edges for rendering
  subLayoutResults: Map<string, SubLayoutResult>;
}

function computeOpenComboSubLayouts(input: {
  nodes: InternalGraphNode[];
  edges: InternalGraphEdge[];
  comboDefinitions: ComboDefinition[];
  openComboIds: string[];
  subLayoutFns: Map<string, SubLayoutFunction>;  // from 102
  bodyNodePadding?: number;  // default: 20
}): ComboSubLayoutOutput;
```

### Algorithm

```
1. Build lookup: memberToCombo = Map<nodeId, comboId> for open combos only
2. Build lookup: comboMembers = Map<comboId, InternalGraphNode[]>

3. For each openComboId:
   a. memberNodes = comboMembers.get(comboId)
   b. intraEdges = edges where both source and target in memberNodes
   c. subLayoutFn = subLayoutFns.get(combo.arrangement) || defaultSubLayout
   d. result = subLayoutFn(memberNodes, intraEdges, combo.tightness)
   e. boundingBox = result.boundingBox
   f. bodyNode = {
        id: `combo-body-${comboId}`,
        label: combo.label,
        data: { isComboBody: true, comboId, memberCount: memberNodes.length },
        position: undefined,  // free-floating in outer layout
        radius: Math.max(boundingBox.width, boundingBox.height) / 2 + padding
      }
   g. Store { comboId, positions: result.positions, boundingBox, bodyNode }

4. Build outerNodes:
   - All nodes NOT in any open combo's memberToCombo
   - Plus all body nodes from step 3

5. Build outerEdges (shadow edges):
   - For each edge:
     - If both endpoints in same open combo → skip (intra-combo)
     - If source in open combo → shadow: source = body node, target unchanged
     - If target in open combo → shadow: target = body node, source unchanged
     - If both in different open combos → shadow: both remapped to body nodes
     - If neither in open combo → pass through unchanged

6. Build renderEdges:
   - All original edges (unmodified) — these use final world positions after resolution

7. Return { outerNodes, outerEdges, renderEdges, subLayoutResults }
```

### Shadow Edge Construction

Shadow edges serve only the force simulation. They are constructed as:

```typescript
{
  id: `shadow-${originalEdge.id}`,
  source: bodyNodeIdOrOriginal,
  target: bodyNodeIdOrOriginal,
  data: { isShadow: true, originalEdgeId: originalEdge.id }
}
```

Shadow edges inherit no visual properties (fill, label, dashed, etc.) since they are never rendered. They carry only connectivity information for force-link computation.

**Deduplication:** Multiple edges between members of two different combos produce multiple shadow edges between the same body node pair. These are deduplicated by body-pair key to avoid over-attraction in the force simulation:

```
shadowEdgeKey = `${bodyA}-${bodyB}` (sorted to normalize direction)
Keep only one shadow edge per unique key, with data.count for force weight
```

## Virtual Body Node Injection

Body nodes are standard `InternalGraphNode` objects with specific metadata:

```typescript
const bodyNode: InternalGraphNode = {
  id: `combo-body-${comboId}`,
  label: combo.label ?? comboId,
  data: {
    isComboBody: true,
    comboId,
    memberCount: memberNodes.length,
    memberNodeIds: memberNodes.map(n => n.id)
  },
  position: { x: 0, y: 0, z: 0 },  // initial; layout will override
  // radius stored in data for force collision
};
```

**In forceDirected.ts**, the collision force accessor must account for body node radius:

```typescript
// Current:
forceCollide(d => d.radius + 10)

// Updated (minor change):
forceCollide(d => (d.data?.isComboBody ? d.data.radius : (d.radius ?? nodeSize)) + 10)
```

Alternatively, the body node's `radius` can be set directly on the simulation node object, which the existing accessor already reads. This is the preferred approach — it requires no changes to `forceDirected.ts` if the body node has `radius` as a top-level property on the simulation node data.

**Decision: Set `radius` directly on the body node's simulation data.** The existing `forceCollide(d => d.radius + 10)` will read it naturally. If `radius` is not already a simulation node property, we set it during node preparation in `computeOpenComboSubLayouts`. This requires verifying how `forceDirected.ts` maps `InternalGraphNode` to D3 simulation nodes.

## Edge Shadow Splitting Strategy

### Classification Matrix

| Edge Source | Edge Target | In Outer Layout? | Shadow Created? | Rendered? |
|-------------|-------------|-------------------|-----------------|-----------|
| Regular node | Regular node | Yes (as-is) | No | Yes |
| Regular node | Open combo member | No | Yes (→ body node) | Yes (original) |
| Open combo member | Regular node | No | Yes (→ body node) | Yes (original) |
| Same open combo member | Same open combo member | No | No | Yes (original) |
| Open combo A member | Open combo B member | No | Yes (body A → body B) | Yes (original) |
| Regular node | Proxy node (closed) | Yes (as-is) | No | Yes |
| Proxy node | Open combo member | No | Yes (proxy → body) | Yes (original) |

### Key Invariant

Every edge that exists in the input appears in `renderEdges` exactly once (with original source/target). Shadow edges are a separate set that exists only in `outerEdges` and is discarded after the outer layout phase.

## resolveComboPositions Algorithm

### Signature

```typescript
interface PositionResolutionInput {
  outerLayoutPositions: Map<string, { x: number; y: number; z: number }>;  // from outer layout
  subLayoutResults: Map<string, SubLayoutResult>;
  nonMemberNodes: InternalGraphNode[];  // nodes not in any open combo
  renderEdges: InternalGraphEdge[];     // original edges
  comboDefinitions: ComboDefinition[];
  openComboIds: string[];
}

interface PositionResolutionOutput {
  resolvedNodes: InternalGraphNode[];       // all nodes with world positions
  resolvedEdges: InternalGraphEdge[];       // render edges (no shadows)
  comboContainers: Map<string, ComboContainerData>;  // for store
}

function resolveComboPositions(input: PositionResolutionInput): PositionResolutionOutput;
```

### Algorithm

```
resolvedNodes = [...nonMemberNodes]  // these already have positions from outer layout
comboContainers = new Map()

for each openComboId in openComboIds:
  bodyNodeId = `combo-body-${openComboId}`
  bodyPos = outerLayoutPositions.get(bodyNodeId)
  subLayout = subLayoutResults.get(openComboId)

  memberWorldPositions = new Map()

  for each [memberId, localPos] of subLayout.positions:
    worldPos = {
      x: bodyPos.x + localPos.x,
      y: bodyPos.y + localPos.y,
      z: 1  // standard node z-depth
    }
    // Create resolved node with world position
    resolvedNode = findOriginalNode(memberId)
    resolvedNode.position = worldPos
    resolvedNodes.push(resolvedNode)
    memberWorldPositions.set(memberId, worldPos)

  // Compute container data
  containerData = computeContainerFromWorldPositions({
    comboId: openComboId,
    comboDefinition: comboDefinitions.find(c => c.id === openComboId),
    memberPositions: memberWorldPositions,
    padding: bodyNodePadding
  })
  comboContainers.set(openComboId, containerData)

return { resolvedNodes, resolvedEdges: renderEdges, comboContainers }
```

### computeContainerFromWorldPositions

```typescript
function computeContainerFromWorldPositions(input: {
  comboId: string;
  comboDefinition: ComboDefinition;
  memberPositions: Map<string, { x: number; y: number; z: number }>;
  padding: number;
}): ComboContainerData {
  const positions = Array.from(memberPositions.values());
  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));

  const width = maxX - minX;
  const height = maxY - minY;
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: -1  // behind nodes
  };

  return {
    comboId,
    center,
    boundingBox: { x: center.x, y: center.y, width, height },
    shape: comboDefinition.shape ?? 'circle',
    memberNodeIds: Array.from(memberPositions.keys()),
    label: comboDefinition.label
  };
}
```

## GraphScene ComboContainer Rendering Integration

In `GraphScene.tsx`, after the existing cluster rendering block:

```typescript
// Read from store
const comboContainers = useStore(state => state.comboContainers);
const comboDefinitions = useStore(state => state.comboDefinitions);

// In JSX, after cluster rendering:
{Array.from(comboContainers.values()).map(container => (
  <ComboContainer
    key={container.comboId}
    comboId={container.comboId}
    shape={container.shape}
    center={container.center}
    boundingBox={container.boundingBox}
    label={container.label}
    animated={animated}
    disabled={disabled}
    labelFontUrl={labelFontUrl}
    onClick={onComboClick
      ? (id, e) => onComboClick(comboDefinitions.find(c => c.id === id), e)
      : undefined}
    onDoubleClick={onComboDoubleClick
      ? (id, e) => onComboDoubleClick(comboDefinitions.find(c => c.id === id), e)
      : undefined}
  />
))}
```

This renders a `ComboContainer` (from 101-02) for each open combo. The containers are positioned behind nodes (z=-1) and update reactively when `comboContainers` store state changes.

## Layout Type Compatibility Matrix

| Layout Type | Closed Combos | Open Combos | Notes |
|-------------|---------------|-------------|-------|
| `forceDirected2d` | ✅ Proxy nodes | ✅ Full two-phase | Primary supported layout |
| `forceDirected3d` | ✅ Proxy nodes | ✅ Full two-phase | 3D positions with z-depth |
| `treeTd2d/3d` | ✅ Proxy nodes | ❌ Falls back to closed | Body node as tree leaf is complex |
| `treeLr2d/3d` | ✅ Proxy nodes | ❌ Falls back to closed | Same as treeTd |
| `hierarchicalTd/Lr` | ✅ Proxy nodes | ❌ Falls back to closed | Hierarchy doesn't suit body nodes |
| `radialOut2d/3d` | ✅ Proxy nodes | ❌ Falls back to closed | Segment allocation complex |
| `circular2d` | ✅ Proxy nodes | ❌ Falls back to closed | Circle segment sizing needed |
| `concentric2d/3d` | ✅ Proxy nodes | ❌ Falls back to closed | Ring allocation complex |
| `nooverlap` | ✅ Proxy nodes | ❌ Falls back to closed | Overlap removal for bodies complex |
| `forceatlas2` | ✅ Proxy nodes | ⚠️ Experimental | Similar to force-directed |
| `custom` | ✅ Via getNodePosition | ⚠️ Consumer-controlled | Consumer must handle body nodes |

**Implementation:** In `computeOpenComboSubLayouts`, check `layoutType`. If not `forceDirected2d`, `forceDirected3d`, or `forceatlas2`, emit `console.warn` and return the combos as if they were closed (add them to `collapsedComboIds` for the transform).

## Decisions

### D1: Body nodes use top-level `radius` property for force collision

**Rationale:** The existing `forceCollide` accessor reads `d.radius`. Setting radius directly on the simulation node data avoids modifying `forceDirected.ts`. The body node's radius is set during `computeOpenComboSubLayouts`.

### D2: Shadow edges are deduplicated by body-pair key

**Rationale:** Multiple original edges between members of two open combos would create multiple shadow edges between the same body pair. In force-directed layout, multiple link forces between the same pair cause over-attraction. Deduplicating to one shadow edge per body pair (with `data.count` as weight) produces more stable simulations.

### D3: Members excluded from outer layout entirely

**Rationale:** Member nodes are positioned by their sub-layout (Phase 1). Including them in the outer layout would cause the force simulation to scatter them. The body node is the sole representative of the open combo in the outer layout. After the outer layout converges, members get world positions via offset from body position.

### D4: Render edges preserved as-is (no modification)

**Rationale:** All original edges are rendered with their original source/target. After position resolution, both endpoints (whether external nodes, proxy nodes, or resolved combo members) have world positions. The rendering system doesn't need to know about shadow edges — it just draws edges between positioned nodes.

### D5: Open combos fall back to closed for non-force layouts

**Rationale:** Force-directed layouts naturally accommodate variable-radius body nodes via collision forces. Tree, hierarchical, and circular layouts have rigid structural constraints that don't easily accommodate a "large placeholder node." Rather than producing poor results, we treat the combo as closed and warn the developer. This can be relaxed in future changes.

### D6: Position resolution runs synchronously after outer layout tick

**Rationale:** The outer layout's `tick()` is async (returns a Promise). After it resolves, position resolution is a pure synchronous computation (read body positions, add offsets). No additional async work needed.

### D7: Body node padding default: 20

**Rationale:** The padding adds space between the outermost member node and the combo container boundary. A padding of 20 (in graph units) provides visual breathing room. This matches typical node sizes and can be overridden per combo via `ComboDefinition.tightness`.

## Risks / Trade-offs

1. **Force simulation stability with large body nodes:** A body node with radius 200 in a graph of radius-5 nodes may dominate the simulation, causing instability or very slow convergence. Mitigation: cap body node radius at a configurable maximum (e.g., 500) and tune forceCollide strength. This can be adjusted after initial implementation.

2. **Sub-layout bounding box accuracy:** If the sub-layout algorithm produces positions that change after the body node is created, the body radius may be inaccurate. Mitigation: sub-layouts are deterministic synchronous computations — their output is final before the outer layout starts.

3. **Edge count explosion with shadow edges:** A combo with M members and E external edges creates up to E shadow edges (deduplicated by body pair). For typical graphs this is manageable, but combos with high connectivity could increase outer layout edge count. Mitigation: shadow edge deduplication reduces this significantly.

4. **useGraph.ts complexity growth:** The two-phase pipeline adds significant logic to `useGraph.ts`. Mitigation: the core algorithms are in `comboLayout.ts` utility functions. `useGraph.ts` only orchestrates the calls, keeping the main hook lean.

5. **Shared file conflicts:** `useGraph.ts` is modified by both 101-01 and 103. `GraphScene.tsx` is modified by 101-02, 103, and 106. Implementation must coordinate to avoid merge conflicts. Mitigation: each change targets different sections of these files.

6. **102 interface uncertainty:** The sub-layout engine (102) is not yet implemented. If its interface differs from the assumed `{ positions, boundingBox }`, Phase 1 integration will need adjustment. Low risk — the interface is minimal.

## Migration Plan

No migration needed. The two-phase pipeline is additive and activates only when `openComboIds` is non-empty. When no combos are open, the standard single-pass layout runs unchanged. The feature is opt-in via the `combos` and `openComboIds` props on `GraphCanvas`.

## Open Questions

1. **Should body node radius have a configurable maximum cap?** — Proposed: yes, default 500, configurable via `GraphCanvas` prop. Defer to implementation.
2. **Should shadow edge weight scale with original edge count?** — Proposed: yes, `data.count` serves as force-link weight. Verify during force simulation testing.
3. **How does `forceatlas2` handle body nodes?** — ForceAtlas2 uses its own collision model. Mark as experimental and test during implementation.
