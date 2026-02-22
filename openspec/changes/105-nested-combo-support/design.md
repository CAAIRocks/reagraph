## Context

The combo system (100–104) handles combos as flat, independent groups. While the data model supports `parentComboId` nesting and `resolveComboTree()` computes depth, the transform (`transformCollapsedCombos`), sub-layout (`computeOpenComboSubLayouts`), and position resolution (`resolveComboPositions`) functions iterate combos without regard to nesting order. This change adds depth-aware processing to all three functions, enabling correct behavior for nested combo hierarchies.

**Dependency chain:** 100 → 101-01 + 101-02 + 102 → 103 → 104 → **105 (this change)** → 106 (interactions).

## Reuse Strategy

- **`resolveComboTree()`** (from 100) — Used as-is to obtain `InternalCombo[]` with `depth` and `childComboIds`. The depth values drive the sort order in all three modified functions.
- **`getComboAncestors()`** (from 100) — Used as-is for consumer-side layer-by-layer orchestration patterns. Not used internally by the library.
- **`transformCollapsedCombos()`** (from 101-01) — Modified internally to sort by depth. The function signature and external behavior are unchanged for non-nested combos.
- **`computeOpenComboSubLayouts()`** (from 103) — Modified internally to process bottom-up and allow inner body nodes as parent sub-layout members. Signature unchanged.
- **`resolveComboPositions()`** (from 103) — Modified internally to resolve top-down with cascading offsets. Signature unchanged.
- **`ComboContainer`** (from 101-02) — Extended with `depth` prop. Existing behavior unchanged when `depth` is 0 or undefined.

**Assumption risk:** The `InternalCombo.depth` field from `resolveComboTree()` is assumed to be accurate. If depth computation has bugs, all nesting behavior will be incorrect. Low risk — depth computation is straightforward and tested in 100.

## Goals / Non-Goals

**Goals:**
- Process collapsed combos in depth-first order (deepest first) so inner proxies are consumed by outer combos
- Compute sub-layouts bottom-up so inner bounding boxes inform parent sub-layout body node sizes
- Resolve positions top-down so outer body positions cascade to inner body positions and then to leaf members
- Layer nested containers with correct z-ordering (outer behind inner, all behind nodes)
- Support mid-animation state changes for layer-by-layer open/close orchestration
- Handle mixed nesting: some levels open, some closed, at any depth

**Non-Goals:**
- Implementing layer-by-layer orchestration as library code (consumer-side responsibility using `getComboAncestors` and `await waitForAnimation()`)
- Drag interactions for nested containers (handled by 106-combo-interactions)
- Maximum nesting depth enforcement (unlimited, practically 2-3 levels)
- Performance optimization for deeply nested combos (defer until real-world use cases surface)

## Worked Example: 3-Level Nested Hierarchy

### Setup

```
Combo A (depth 0): members [n1, n2], children [B]
  Combo B (depth 1): members [n3, n4], children [C]
    Combo C (depth 2): members [n5, n6]
External nodes: [n7, n8]
Edges: n1→n3, n3→n5, n7→n6, n5→n6, n1→n7
```

### Scenario 1: All Collapsed

**Depth-ordered transform (deepest first):**

```
Pass 1 (depth 2 — combo C):
  Remove n5, n6
  Inject combo-proxy-C (size from 2 members)
  Remap n3→n5 → n3→combo-proxy-C
  Remap n7→n6 → n7→combo-proxy-C
  Drop n5→n6 (intra-combo)

Pass 2 (depth 1 — combo B):
  Members: [n3, n4, combo-proxy-C]  ← proxy-C is now a member of B
  Remove n3, n4, combo-proxy-C
  Inject combo-proxy-B (size from 3 members)
  Remap n1→n3 → n1→combo-proxy-B
  Remap n7→combo-proxy-C → n7→combo-proxy-B
  Remap n3→combo-proxy-C → drop (intra-combo: both in B)

Pass 3 (depth 0 — combo A):
  Members: [n1, n2, combo-proxy-B]  ← proxy-B is now a member of A
  Remove n1, n2, combo-proxy-B
  Inject combo-proxy-A (size from 3 members)
  Remap n1→combo-proxy-B → drop (intra-combo: both in A)
  Remap n1→n7 → combo-proxy-A→n7
  Remap n7→combo-proxy-B → n7→combo-proxy-A

Result: nodes = [combo-proxy-A, n7, n8], edges = [combo-proxy-A→n7, n7→combo-proxy-A]
```

### Scenario 2: A Open, B Closed, C Closed

**Transform:** B is collapsed first (depth 1), consuming C's proxy. Then A is NOT collapsed (it's open).

```
Pass 1 (depth 2 — combo C):
  Remove n5, n6 → inject combo-proxy-C

Pass 2 (depth 1 — combo B):
  Members: [n3, n4, combo-proxy-C]
  Remove all → inject combo-proxy-B
```

**Sub-layout (A is open):**

```
A's members for sub-layout: [n1, n2, combo-proxy-B]  ← proxy-B is a regular member
Run sub-layout → local positions for n1, n2, combo-proxy-B
Bounding box → body node combo-body-A
```

**Outer layout:** nodes = [combo-body-A, n7, n8]

**Position resolution:** body-A position + local offsets → world positions for n1, n2, combo-proxy-B

### Scenario 3: A Open, B Open, C Closed

**Transform:** C collapsed → proxy-C created.

**Bottom-up sub-layout:**

```
Step 1 (depth 1 — combo B, open):
  B's members: [n3, n4, combo-proxy-C]
  Run sub-layout → local positions, bounding box
  Create body node combo-body-B (radius from bounding box)

Step 2 (depth 0 — combo A, open):
  A's members: [n1, n2, combo-body-B]  ← body node replaces B's members
  Run sub-layout → local positions for n1, n2, combo-body-B
  combo-body-B has large radius → sub-layout respects its size
  Create body node combo-body-A
```

**Outer layout:** nodes = [combo-body-A, n7, n8]

**Top-down position resolution:**

```
Step 1 (depth 0 — combo A):
  body-A at (100, 50) from outer layout
  n1 world = (100 + n1.local.x, 50 + n1.local.y)
  n2 world = (100 + n2.local.x, 50 + n2.local.y)
  combo-body-B world = (100 + bodyB.local.x, 50 + bodyB.local.y) = e.g., (120, 60)

Step 2 (depth 1 — combo B):
  body-B at (120, 60) from step 1
  n3 world = (120 + n3.local.x, 60 + n3.local.y)
  n4 world = (120 + n4.local.x, 60 + n4.local.y)
  combo-proxy-C world = (120 + proxyC.local.x, 60 + proxyC.local.y)

Container A: computed from [n1, n2, combo-body-B extent] world positions
Container B: computed from [n3, n4, combo-proxy-C] world positions, rendered inside A
```

### Scenario 4: All Open

Same as Scenario 3 but with C also open:

```
Bottom-up sub-layout:
  Step 1 (depth 2 — C): sub-layout for [n5, n6] → body-C
  Step 2 (depth 1 — B): sub-layout for [n3, n4, body-C] → body-B
  Step 3 (depth 0 — A): sub-layout for [n1, n2, body-B] → body-A

Top-down position resolution:
  Step 1: body-A from outer layout → A member world positions (including body-B position)
  Step 2: body-B from step 1 → B member world positions (including body-C position)
  Step 3: body-C from step 2 → C member world positions

Three containers rendered at z=-1, z=-1.5, z=-2
```

## Edge Routing Through Nesting

### External-to-deeply-nested member (both combos open)

Edge `n7 → n6` where n6 is inside combo C inside combo B inside combo A, all open:

- **Render edge:** Original `n7 → n6` — both have world positions after resolution, edge draws directly.
- **Shadow edge:** `n7 → combo-body-A` — for outer layout force simulation. The shadow connects to the outermost body node because n6's ultimate representative in the outer layout is body-A.

### Member of outer combo to member of inner combo (both open)

Edge `n1 → n3` where n1 is in A and n3 is in B (child of A):

- **Render edge:** Original `n1 → n3` — both have world positions after resolution.
- **Shadow edge:** Not needed for the outer layout — both n1 and n3 are within A's sub-layout context. The edge is intra-combo from the outer layout's perspective (both are inside body-A). However, within A's sub-layout, n1 connects to body-B, so a **sub-layout shadow edge** from n1 to body-B is used during A's sub-layout computation.

### Cross-nesting edges

Edge between members of sibling combos (e.g., member of B → member of a sibling combo D, both children of A, both open):

- **Render edge:** Direct between the two members (both have world positions).
- **Sub-layout shadow:** Within A's sub-layout, shadow edge from body-B to body-D.
- **Outer shadow:** Not needed — both are within body-A in the outer layout.

## Z-Ordering Scheme

Container z-depth formula:

```typescript
const containerZ = -1 - (depth * 0.5);
```

| Element | Z-depth | Notes |
|---------|---------|-------|
| Nodes | 0 | Always in front |
| Edges | ~0 | At node level |
| Depth-0 container | -1.0 | Outermost combo |
| Depth-1 container | -1.5 | First nesting level |
| Depth-2 container | -2.0 | Second nesting level |
| Depth-3 container | -2.5 | Third nesting level |

The 0.5 increment ensures visual separation between nested containers. This supports up to ~18 nesting levels before reaching z=-10 (well beyond practical use).

**Implementation in ComboContainer:**

```typescript
// In ComboContainer component
interface ComboContainerProps {
  // ... existing props
  depth?: number;  // nesting depth, default 0
}

// In the component body:
const containerZ = -1 - ((depth ?? 0) * 0.5);
// Use containerZ instead of hardcoded -1 for mesh position
```

**In GraphScene:** When rendering `ComboContainer`, look up the combo's depth from the resolved `InternalCombo` list (from `resolveComboTree`):

```typescript
const internalCombos = useMemo(
  () => resolveComboTree(comboDefinitions),
  [comboDefinitions]
);

// When rendering:
<ComboContainer
  depth={internalCombos.find(c => c.id === container.comboId)?.depth ?? 0}
  // ... other props
/>
```

## Orchestration Support for Layer-by-Layer Open/Close

The library itself does NOT implement layer-by-layer orchestration. It provides the building blocks:

1. **`getComboAncestors(comboId, combos)`** — Returns ancestor chain for sequencing
2. **`openComboIds` / `collapsedComboIds`** — State arrays that can be updated incrementally
3. **Correct pipeline behavior on state change** — Each re-render produces a consistent snapshot

**Consumer-side orchestration pattern:**

```typescript
async function openComboLayerByLayer(comboId: string) {
  const ancestors = getComboAncestors(comboId, combos); // ['B', 'A'] for combo C
  // Open from outermost to innermost
  for (const ancestorId of [...ancestors].reverse()) {
    if (collapsedComboIds.includes(ancestorId)) {
      setCollapsedComboIds(prev => prev.filter(id => id !== ancestorId));
      setOpenComboIds(prev => [...prev, ancestorId]);
      await waitForAnimation(); // wait ~300ms for spring to settle
    }
  }
  // Finally open the target
  setCollapsedComboIds(prev => prev.filter(id => id !== comboId));
  setOpenComboIds(prev => [...prev, comboId]);
}
```

**Library requirements for this to work:**
- Pipeline must handle partial open states correctly (outer open, inner still collapsed)
- Mid-animation state changes must trigger a clean re-layout (no stale body node positions)
- Multiple combos can transition simultaneously without conflict
- Each pipeline pass is a pure function of current state — no dependency on previous animation frame

## Algorithm Modifications

### transformCollapsedCombos — Depth-Ordered Processing

```diff
 function transformCollapsedCombos(input: ComboTransformInput): ComboTransformOutput {
+  // Resolve combo tree to get depth information
+  const internalCombos = resolveComboTree(input.comboDefinitions);
+  const comboDepthMap = new Map(internalCombos.map(c => [c.id, c.depth]));
+
+  // Sort collapsed combos by depth descending (deepest first)
+  const sortedCollapsedIds = [...input.collapsedComboIds].sort(
+    (a, b) => (comboDepthMap.get(b) ?? 0) - (comboDepthMap.get(a) ?? 0)
+  );

   // Use sortedCollapsedIds instead of input.collapsedComboIds for iteration
-  for (const comboId of input.collapsedComboIds) {
+  // Process iteratively: each pass updates the working node/edge arrays
+  let workingNodes = [...input.nodes];
+  let workingEdges = [...input.edges];
+
+  for (const comboId of sortedCollapsedIds) {
     // ... existing per-combo transform logic, operating on workingNodes/workingEdges
+    // After processing, inner proxies become members of outer combos
   }
 }
```

**Key change:** Instead of building all lookups upfront from the original arrays, the transform processes iteratively. After collapsing depth-2 combos, their proxy nodes exist in `workingNodes` and are available as members of depth-1 combos.

**memberToCombo must be rebuilt per pass** or all combos must be preprocessed upfront with awareness that proxy nodes from deeper combos are members of shallower combos. The iterative approach is simpler: each pass sees the current state of the arrays.

### computeOpenComboSubLayouts — Bottom-Up Processing

```diff
 function computeOpenComboSubLayouts(input: ComboSubLayoutInput): ComboSubLayoutOutput {
+  const internalCombos = resolveComboTree(input.comboDefinitions);
+  const comboDepthMap = new Map(internalCombos.map(c => [c.id, c.depth]));
+
+  // Sort open combos by depth descending (deepest first = bottom-up)
+  const sortedOpenIds = [...input.openComboIds].sort(
+    (a, b) => (comboDepthMap.get(b) ?? 0) - (comboDepthMap.get(a) ?? 0)
+  );
+
+  const bodyNodes = new Map<string, InternalGraphNode>();  // comboId → body node
+
-  for (const comboId of input.openComboIds) {
+  for (const comboId of sortedOpenIds) {
     const combo = input.comboDefinitions.find(c => c.id === comboId);
-    const memberNodes = input.nodes.filter(n => combo.memberNodeIds.includes(n.id));
+    // Gather members: original member nodes + body nodes of open child combos
+    const memberNodes = input.nodes.filter(n => combo.memberNodeIds.includes(n.id));
+    const childBodyNodes = (internalCombos.find(c => c.id === comboId)?.childComboIds ?? [])
+      .filter(childId => input.openComboIds.includes(childId))
+      .map(childId => bodyNodes.get(childId))
+      .filter(Boolean);
+    const allMembers = [...memberNodes, ...childBodyNodes];

     // Run sub-layout with allMembers (body nodes have large radius)
     // ... existing sub-layout invocation

     // Create body node and store for potential parent consumption
+    bodyNodes.set(comboId, bodyNode);
   }
 }
```

**Key change:** After computing a child combo's sub-layout and creating its body node, that body node is available for the parent combo's sub-layout. The sub-layout function must handle nodes with varying radii (body nodes are much larger than regular nodes).

### resolveComboPositions — Top-Down Processing

```diff
 function resolveComboPositions(input: PositionResolutionInput): PositionResolutionOutput {
+  const internalCombos = resolveComboTree(input.comboDefinitions);
+  const comboDepthMap = new Map(internalCombos.map(c => [c.id, c.depth]));
+
+  // Sort open combos by depth ascending (shallowest first = top-down)
+  const sortedOpenIds = [...input.openComboIds].sort(
+    (a, b) => (comboDepthMap.get(a) ?? 0) - (comboDepthMap.get(b) ?? 0)
+  );
+
+  // Track resolved body positions for cascading
+  const resolvedBodyPositions = new Map<string, { x: number; y: number; z: number }>();

-  for (const comboId of input.openComboIds) {
+  for (const comboId of sortedOpenIds) {
     const bodyNodeId = `combo-body-${comboId}`;
-    const bodyPos = input.outerLayoutPositions.get(bodyNodeId);
+    // Body position comes from either:
+    // 1. Outer layout (for depth-0 combos)
+    // 2. Parent combo's resolved member positions (for nested combos)
+    const bodyPos = resolvedBodyPositions.get(bodyNodeId)
+      ?? input.outerLayoutPositions.get(bodyNodeId);

     // Resolve member world positions
     for (const [memberId, localPos] of subLayout.positions) {
       const worldPos = {
         x: bodyPos.x + localPos.x,
         y: bodyPos.y + localPos.y,
         z: 1
       };
+      // If this member is a child body node, record its world position
+      if (memberId.startsWith('combo-body-')) {
+        resolvedBodyPositions.set(memberId, worldPos);
+      }
       // ... existing member resolution
     }
   }
 }
```

**Key change:** After resolving members for a depth-0 combo, any child body nodes among those members now have known world positions. These positions feed into the next iteration (depth-1 combos) via `resolvedBodyPositions`.

## Decisions

### D1: Iterative transform with working arrays (not upfront preprocessing)

**Rationale:** Processing collapsed combos iteratively (deepest first, updating working arrays after each pass) is simpler than preprocessing all nesting relationships upfront. Each pass sees a consistent array state. The alternative (building a full dependency graph of proxy→parent relationships) adds complexity for marginal performance gain — nesting is typically 2-3 levels.

### D2: Body nodes stored in a Map for parent lookup during sub-layout

**Rationale:** During bottom-up sub-layout, a parent combo needs access to its child combo's body node (to include it as a large member). Storing body nodes in a `Map<comboId, InternalGraphNode>` makes this O(1) lookup. The alternative (re-scanning the node array) is less clean.

### D3: Z-depth formula: `-1 - (depth * 0.5)`

**Rationale:** A 0.5 increment provides clear visual separation between nesting levels without pushing deep containers too far behind. It supports 18+ nesting levels (far beyond practical use) before reaching z=-10. The base of -1 maintains compatibility with non-nested combos (depth 0 → z=-1, same as current).

### D4: Consumer-side layer-by-layer orchestration (not library-managed)

**Rationale:** Layer-by-layer open/close is an interaction pattern, not a layout concern. Different consumers may want different animation timing, easing, or sequencing. The library provides the building blocks (ancestor lookup, state arrays, consistent pipeline snapshots) and leaves orchestration to the consumer. This matches the KeyLines pattern where `showAlert()` is application code, not library code.

### D5: resolveComboTree called in each modified function

**Rationale:** `resolveComboTree()` is a pure function that builds the combo hierarchy from flat definitions. Calling it in `transformCollapsedCombos`, `computeOpenComboSubLayouts`, and `resolveComboPositions` is redundant but clean — each function is self-contained. For performance, the result could be memoized or passed as input, but for typical combo counts (<50), the overhead is negligible. If profiling reveals issues, hoist to `useGraph.ts` and pass as input.

## Risks / Trade-offs

1. **Iterative transform performance:** Processing combos one depth level at a time means re-scanning working arrays per pass. For N nesting levels and M total nodes, this is O(N × M). For typical graphs (M < 10K, N ≤ 3), this is negligible. For extreme cases, the upfront preprocessing approach would be O(M) total.

2. **Sub-layout with mixed node sizes:** When a parent combo's sub-layout includes a body node (large radius) alongside regular nodes, some sub-layout algorithms (grid, sequential) may not handle varying sizes well. The concentric and lens algorithms are more natural fits. Mitigation: sub-layout algorithms from 102 should treat node radius as input for spacing calculation.

3. **Mid-animation state consistency:** When `openComboIds` changes mid-animation, the pipeline re-runs from scratch. Any in-flight spring animations will be interrupted and restarted. This may cause visual discontinuities for rapid state changes. Mitigation: consumers should `await waitForAnimation()` between state changes for smooth layer-by-layer transitions.

4. **resolveComboTree called multiple times per pipeline pass:** Each of the three modified functions calls `resolveComboTree()`. For a single layout pass, this means 3 calls. Mitigation: the function is cheap (O(C) where C = combo count). Can be hoisted to `useGraph.ts` if profiling shows issues.

5. **Z-ordering in 3D layouts:** The z-depth formula assumes 2D rendering where z controls layer order. In 3D layouts (`forceDirected3d`), containers should probably not use z-offset for layering. Mitigation: 3D container rendering is not yet supported (open combos fall back to closed for non-force-2d layouts). When 3D support is added, z-ordering will need a different approach.

## Migration Plan

No migration needed. The depth-ordering modifications are backward-compatible:
- For non-nested combos (all depth 0), the sort is a no-op
- For mixed nesting, the sort produces correct ordering automatically
- The z-depth formula produces z=-1 for depth-0 combos, matching current behavior

## Open Questions

1. **Should `resolveComboTree()` be called once in `useGraph.ts` and passed to all functions?** — Proposed: defer to implementation. Start with self-contained functions; optimize if profiling shows overhead.
2. **How should sub-layout algorithms handle body nodes with large radii?** — Proposed: pass node radii to sub-layout functions and let them adjust spacing. Verify during 102 implementation.
3. **Should there be a maximum nesting depth limit?** — Proposed: no enforcement. Console.warn at depth > 5 as a hint. Practical use is 2-3 levels.
