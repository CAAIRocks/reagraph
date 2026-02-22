## Context

Reagraph's combo data model (from `100-combo-data-model`) defines `ComboDefinition`, store state, and tree resolution, but does not alter the rendered graph when a combo is collapsed. This change introduces the transform layer: a pure function that rewrites node and edge arrays to replace collapsed combo members with proxy nodes and remap all edges accordingly. This transform slots into the existing pipeline in `useGraph.ts` between visibility filtering and graph construction.

The existing collapse system (`getVisibleEntities` in `src/collapse/utils.ts`) handles tree-based node collapse (hiding children of a collapsed parent node). Combo collapse is orthogonal — it replaces a set of peer nodes with a single synthetic proxy. Both systems coexist in the pipeline.

## Reuse Strategy

- **`aggregateEdges` pattern** — The existing `aggregateEdges.ts` groups parallel edges and produces aggregated edges with `data.originalEdges` and `data.count`. The combo transform produces parallel edges after remapping (multiple original edges → same proxy pair). Rather than calling `aggregateEdges` directly (which requires a Graphology instance), the transform implements a lightweight array-based dedup following the same output shape (`data.originalEdges`, `data.count`, `data.isAggregated`).
- **`getVisibleEntities`** — Called *before* the combo transform. Its output feeds into `transformCollapsedCombos` as input. Not modified.
- **`buildGraph`** — Called *after* the combo transform. Receives the transformed arrays. Not modified.
- **`DragReferences` store map** — Queried for position seeding when a proxy node has been previously positioned via drag.
- **`ComboDefinition` / store fields** — Consumed directly from the `100-combo-data-model` dependency.

## Goals / Non-Goals

**Goals:**
- Implement a pure, testable transform function with no side effects
- Handle all edge remapping cases: one-end-in-combo, both-ends-same-combo (drop), both-ends-different-combos, self-loops after remap (drop)
- Aggregate parallel edges created by remapping with count metadata
- Seed proxy node positions from drag state or member centroid
- Integrate seamlessly into useGraph.ts pipeline with minimal coupling
- Full unit test coverage for transform function

**Non-Goals:**
- Visual rendering of proxy nodes (handled by node renderer responding to `data.isCombo`)
- Combo container rendering (see `101-02-combo-container-primitive`)
- Layout adjustments for proxy nodes (see `103-two-phase-layout-pipeline`)
- Collapse/expand animation (see `104-open-close-animation`)
- Nested combo collapse (see `105-nested-combo-support`) — this change handles flat collapse only; nested combos are a later extension

## Decisions

### D1: Transform operates on arrays, not Graphology instance

**Rationale:** The transform must run *before* `buildGraph()` constructs the Graphology graph. Operating on plain arrays keeps the function pure and easily testable without Graphology setup. The existing `aggregateEdges` works on Graphology, so we implement a simpler array-based dedup.

### D2: Proxy node ID format: `combo-proxy-${comboId}`

**Rationale:** Deterministic ID enables stable identity across re-renders, drag position lookup, and layout cache. The `combo-proxy-` prefix clearly distinguishes synthetic nodes from user nodes.

### D3: Proxy node size formula: `7 + Math.log2(memberCount) * 3`

**Rationale:** Logarithmic scaling prevents extremely large nodes for combos with many members while still conveying relative group size. Base size of 7 matches typical node sizes in the default theme.

### D4: Intra-combo edges are dropped (not aggregated)

**Rationale:** Edges between nodes within the same collapsed combo have no visual representation — both endpoints collapse to the same proxy. Aggregating them as self-loops would be confusing. They are silently dropped and restored on expand.

### D5: Self-loops created by remapping are dropped

**Rationale:** If both ends of an edge map to the same proxy (both source and target are in the same combo), the result is a self-loop on the proxy. These are redundant with the intra-combo drop logic and are eliminated.

### D6: Position seeding priority: drag state → centroid → undefined

**Rationale:** If a proxy was previously dragged, it should return to its dragged position on re-collapse. Otherwise, the centroid of member node positions provides a reasonable initial position. If no positions are available (first render), the layout engine will position it.

## Function Signature

```typescript
interface ComboTransformInput {
  nodes: InternalGraphNode[];
  edges: InternalGraphEdge[];
  comboDefinitions: ComboDefinition[];
  collapsedComboIds: string[];
  dragReferences?: Map<string, { x: number; y: number; z: number }>;
}

interface ComboTransformOutput {
  transformedNodes: InternalGraphNode[];
  transformedEdges: InternalGraphEdge[];
}

function transformCollapsedCombos(input: ComboTransformInput): ComboTransformOutput;
```

## Algorithm

### Step 1: Build lookup structures

```
memberToCombo: Map<nodeId, comboId>  // for each collapsed combo's members
collapsedComboSet: Set<comboId>       // for O(1) membership check
comboDefMap: Map<comboId, ComboDefinition>  // for label/data lookup
```

Only populate for combos in `collapsedComboIds`.

### Step 2: Filter nodes and inject proxies

```
For each node in nodes:
  if node.id is in memberToCombo → skip (removed)
  else → keep in output

For each collapsed combo:
  create proxy node:
    id: `combo-proxy-${comboId}`
    label: combo.label
    data: { isCombo: true, comboId, memberCount, memberNodeIds, originalCombo }
    size: 7 + Math.log2(memberCount) * 3
    fill: combo.data?.fill or undefined (theme will handle)
    position: from dragReferences[proxyId] or centroid of member positions
  append proxy to output nodes
```

### Step 3: Remap edges

```
For each edge in edges:
  newSource = memberToCombo.has(edge.source) ? `combo-proxy-${memberToCombo.get(edge.source)}` : edge.source
  newTarget = memberToCombo.has(edge.target) ? `combo-proxy-${memberToCombo.get(edge.target)}` : edge.target

  if newSource === newTarget → drop (intra-combo or self-loop after remap)
  else → add to remapped edges with { ...edge, source: newSource, target: newTarget }
```

### Step 4: Deduplicate parallel edges

```
Group remapped edges by `${source}-${target}` key (treating undirected as ordered)
For each group:
  if group.length === 1 → keep as-is
  if group.length > 1 → create aggregated edge:
    id: first edge's id (stable reference)
    source, target from group key
    label: `${group.length} edges`
    size: baseSize + group.length * baseSize * 0.5
    data: { originalEdges: group, count: group.length, isAggregated: true }
```

### Step 5: Return

```
return { transformedNodes, transformedEdges }
```

## Integration into useGraph.ts

Current pipeline (simplified):
```typescript
const { visibleEdges, visibleNodes } = getVisibleEntities({
  collapsedIds: stateCollapsedNodeIds,
  nodes,
  edges
});
// ... 
buildGraph(graph, visibleNodes, visibleEdges);
```

New pipeline:
```typescript
const { visibleEdges, visibleNodes } = getVisibleEntities({
  collapsedIds: stateCollapsedNodeIds,
  nodes,
  edges
});

// Combo collapse transform — replaces member nodes with proxies
const { transformedNodes, transformedEdges } = transformCollapsedCombos({
  nodes: visibleNodes,
  edges: visibleEdges,
  comboDefinitions: stateComboDefinitions,
  collapsedComboIds: stateCollapsedComboIds,
  dragReferences: dragRef?.current
});

buildGraph(graph, transformedNodes, transformedEdges);
```

The `stateComboDefinitions` and `stateCollapsedComboIds` are read from the Zustand store (provided by `100-combo-data-model`).

## Position Seeding Detail

When computing the centroid for a proxy node:
```typescript
function computeCentroid(memberNodeIds: string[], nodes: InternalGraphNode[]): { x: number; y: number; z: number } | undefined {
  const memberNodes = nodes.filter(n => memberNodeIds.includes(n.id));
  if (memberNodes.length === 0) return undefined;

  const sum = memberNodes.reduce(
    (acc, n) => ({
      x: acc.x + (n.position?.x ?? 0),
      y: acc.y + (n.position?.y ?? 0),
      z: acc.z + (n.position?.z ?? 0)
    }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: sum.x / memberNodes.length,
    y: sum.y / memberNodes.length,
    z: sum.z / memberNodes.length
  };
}
```

Priority:
1. `dragReferences.get(proxyNodeId)` — user-dragged position persists
2. `computeCentroid(memberNodeIds, inputNodes)` — computed from pre-filter node positions (use input array, not filtered)
3. `undefined` — let the layout engine decide

## Risks / Trade-offs

- **Edge dedup vs Graphology aggregation:** Implementing array-based dedup duplicates some logic from `aggregateEdges`. However, the alternative (running `buildGraph` → `aggregateEdges` → rebuild) would require two Graphology constructions, which is worse for performance. The duplication is minimal and isolated.
- **Nested combo collapse not handled:** This change only handles flat collapse. If combo A contains combo B, and both are collapsed, the behavior is undefined until `105-nested-combo-support`. The transform processes collapsed combos in order and nested scenarios may produce unexpected results. This is acceptable as nested support is explicitly deferred.
- **Performance with many combos:** The transform is O(N + E) where N = nodes and E = edges, with additional Map lookups. For typical graph sizes (< 10K nodes), this is negligible. For very large graphs, the Map-based lookups ensure constant-time per element.

## Migration Plan

No migration needed. The transform is a new pipeline step that is a no-op when `collapsedComboIds` is empty. Existing graphs without combos are unaffected.

## Open Questions

_(none — all design decisions resolved)_
