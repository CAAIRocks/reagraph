## Context

The two-phase layout pipeline (103) positions open combo members at their final world coordinates in a single pass. When a combo transitions between open and closed states, nodes currently snap to new positions — members appear/disappear instantly and the container jumps to its final size. This creates a jarring visual experience that breaks the user's spatial understanding of where nodes came from or went to.

This design introduces animated transitions for combo open/close operations using the existing `@react-spring/three` animation system. The key challenge is coordinating multiple simultaneous animations (member positions, container size, proxy crossfade) with the layout pipeline, ensuring that layout re-runs don't interrupt in-flight animations.

**Dependency chain:** 100 → 101-01 + 101-02 + 102 → 103 → **104 (this change)** → 105 (nesting animation sequencing).

## Reuse Strategy

- **`animationConfig`** from `src/utils/animation.ts` — Used as-is for all transition springs. The existing config `{ mass: 5, tension: 170, friction: 26 }` produces smooth, slightly bouncy animations that match the existing node position springs.
- **Node.tsx `useSpring`** — The existing `from: { nodePosition: center }` pattern is extended. For combo member nodes, `from` is overridden with the position seed (proxy's last position) instead of graph center. This is a minimal change: check if the node has a `positionSeed` in its data and use it as the `from` value.
- **ComboContainer.tsx `useSpring`** (from 101-02) — Already animates position and size. For transitions, the `from` values are seeded with the proxy's size (small) when opening, or the current size when closing. The spring naturally handles the interpolation.
- **Store drag references** — `drags` / `dragReferences` in the store contain last-dragged positions. Used to look up proxy position for seeding. Read-only access, no modifications.
- **`transformCollapsedCombos()`** (from 101-01) — Proxy nodes carry position from centroid or drag state. This position is captured as the seed before the proxy is removed during open transition.

**Assumption risk:** ComboContainer from 101-02 may not yet expose `from` size override. If so, a minor prop addition (`initialBoundingBox`) is needed. Low risk — the spring pattern supports custom `from` values.

## Goals / Non-Goals

**Goals:**
- Implement smooth close-to-open transitions: members burst outward from proxy position, container grows from small to final size
- Implement smooth open-to-close transitions: members converge to centroid, container shrinks, proxy appears at centroid
- Position seeding: members always animate from/to a spatially coherent origin point
- Container size animation coordinated with member position animation
- Respect the `animated` prop and auto-disable threshold (nodes + edges > 400)
- Transition state tracking to prevent layout re-runs from interrupting animations
- `onRest` callback coordination for sequenced proxy removal/insertion

**Non-Goals:**
- Nested combo animation sequencing (handled by 105-nested-combo-support)
- Drag interaction during transitions (future enhancement)
- Custom easing/duration configuration per combo (future enhancement)
- Re-opening to previously remembered sub-layout positions (simplification: always re-compute)
- Staggered member animation (all members animate simultaneously for now)

## Transition State Machine

```
                  ┌──────────┐
                  │  closed   │  (proxy node visible)
                  └─────┬────┘
                        │ openComboIds gains comboId
                        ▼
              ┌─────────────────┐
              │    opening      │  (transition in-flight)
              │                 │
              │ 1. Capture proxy position (seed)
              │ 2. Remove proxy from scene
              │ 3. Run sub-layout
              │ 4. Insert body node at proxy position
              │ 5. Place members at seed position
              │ 6. Container appears at seed size
              │ 7. Animate members → sub-layout positions
              │ 8. Animate container → final bounding box
              │ 9. Outer layout re-runs (body node)
              └────────┬────────┘
                       │ all springs reach onRest
                       ▼
                ┌──────────┐
                │   open    │  (members + container visible)
                └─────┬────┘
                      │ collapsedComboIds gains comboId
                      ▼
              ┌─────────────────┐
              │    closing      │  (transition in-flight)
              │                 │
              │ 1. Record member positions
              │ 2. Compute centroid (seed for proxy)
              │ 3. Animate members → centroid
              │ 4. Animate container → small at centroid
              │ 5. onRest: remove members + body node
              │ 6. Insert proxy at centroid
              │ 7. Proxy fades in
              │ 8. Outer layout re-runs (proxy node)
              └────────┬────────┘
                       │ proxy fade-in completes
                       ▼
                ┌──────────┐
                │  closed   │
                └──────────┘
```

## Store Extension: comboTransitions

```typescript
interface ComboTransitionState {
  comboId: string;
  direction: 'opening' | 'closing';
  positionSeed: { x: number; y: number; z: number };
  /** Size seed for container: proxy-sized when opening, current bbox when closing */
  sizeSeed: { width: number; height: number };
  startedAt: number;  // Date.now() for timeout detection
}

// Added to GraphState in store.ts:
interface GraphState {
  // ... existing fields ...
  comboTransitions: Map<string, ComboTransitionState>;
  setComboTransitions: (transitions: Map<string, ComboTransitionState>) => void;
  clearComboTransition: (comboId: string) => void;
}
```

The `comboTransitions` map tracks in-flight transitions. While a combo is in `comboTransitions`:
- Layout re-runs do NOT remove its members or proxy prematurely
- The transition orchestrator manages the sequenced state changes
- After animation completes (`onRest`), `clearComboTransition` is called

## Position Seeding Functions (`src/utils/comboAnimation.ts`)

### computeOpenTransitionSeed

Computes the position seed for an opening transition (where members start):

```typescript
interface PositionSeedInput {
  comboId: string;
  proxyNodeId: string;
  dragReferences: Map<string, { x: number; y: number; z: number }>;
  nodePositions: Map<string, { x: number; y: number; z: number }>;
  graphCenter: { x: number; y: number; z: number };
}

function computeOpenTransitionSeed(input: PositionSeedInput): {
  x: number; y: number; z: number
} {
  // Priority 1: Drag state for proxy
  const dragPos = input.dragReferences.get(input.proxyNodeId);
  if (dragPos) return dragPos;

  // Priority 2: Last known layout position of proxy
  const layoutPos = input.nodePositions.get(input.proxyNodeId);
  if (layoutPos) return layoutPos;

  // Priority 3: Graph center (fallback)
  return input.graphCenter;
}
```

### computeCloseTransitionSeed

Computes the centroid for a closing transition (where members converge and proxy appears):

```typescript
function computeCloseTransitionSeed(
  memberPositions: Map<string, { x: number; y: number; z: number }>
): { x: number; y: number; z: number } {
  const positions = Array.from(memberPositions.values());
  if (positions.length === 0) return { x: 0, y: 0, z: 0 };

  return {
    x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
    y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length,
    z: 1  // standard node z-depth
  };
}
```

### computeSizeSeed

Computes the initial container size for transitions:

```typescript
function computeSizeSeed(
  direction: 'opening' | 'closing',
  proxyNodeSize?: number,
  currentBoundingBox?: { width: number; height: number }
): { width: number; height: number } {
  if (direction === 'opening') {
    // Container starts at proxy's approximate visual size
    const proxyDiameter = (proxyNodeSize ?? 7) * 2;
    return { width: proxyDiameter, height: proxyDiameter };
  } else {
    // Container starts at current size (will animate to small)
    return currentBoundingBox ?? { width: 0, height: 0 };
  }
}
```

## Node.tsx Position Seed Integration

The minimal change in `Node.tsx` is to override the spring's `from` position when the node has a position seed:

```typescript
// Current pattern in Node.tsx:
const { nodePosition } = useSpring({
  from: { nodePosition: center },
  to: { nodePosition: [x, y, z] },
  config: { ...animationConfig, duration: animated ? undefined : 0 }
});

// Updated pattern:
const positionSeed = node.data?.positionSeed ?? center;
const { nodePosition } = useSpring({
  from: { nodePosition: positionSeed },
  to: { nodePosition: [x, y, z] },
  config: { ...animationConfig, duration: animated ? undefined : 0 }
});
```

**How `positionSeed` gets onto the node:** During the opening transition, `useGraph.ts` sets `node.data.positionSeed = [seedX, seedY, seedZ]` on each member node before they enter the scene. This is a transient property — it's only meaningful during the first render after the combo opens. On subsequent re-renders (layout updates), the `from` value doesn't matter because the spring is already running.

For the closing transition, members animate their `to` position toward the centroid:

```typescript
// In useGraph.ts transition orchestration, before removing members:
// Set each member's target position to the centroid
memberNodes.forEach(node => {
  node.position = { x: centroid.x, y: centroid.y, z: centroid.z };
});
// The spring's `to` value updates, members animate to centroid
// After onRest, members are removed from the scene
```

## ComboContainer Size Animation Integration

The `ComboContainer` component (from 101-02) already uses `useSpring` for position and size. For transitions, we need to ensure the `from` values are seeded correctly:

```typescript
// In ComboContainer.tsx, extending the existing spring:
const transition = comboTransitions.get(comboId);
const isTransitioning = !!transition;

const { containerPosition, containerWidth, containerHeight } = useSpring({
  from: {
    containerPosition: isTransitioning
      ? [transition.positionSeed.x, transition.positionSeed.y, transition.positionSeed.z]
      : [center.x, center.y, center.z],
    containerWidth: isTransitioning
      ? transition.sizeSeed.width
      : boundingBox.width,
    containerHeight: isTransitioning
      ? transition.sizeSeed.height
      : boundingBox.height,
  },
  to: {
    containerPosition: [center.x, center.y, center.z],
    containerWidth: boundingBox.width,
    containerHeight: boundingBox.height,
  },
  config: { ...animationConfig, duration: animated ? undefined : 0 },
  onRest: isTransitioning ? () => onTransitionRest?.(comboId) : undefined,
});
```

**New prop on ComboContainer:** `onTransitionRest?: (comboId: string) => void` — called when the container spring settles. Used by the transition orchestrator to sequence proxy insertion (close) or mark transition complete (open).

## Transition Orchestration in useGraph.ts

### Detecting Transitions

When `openComboIds` or `collapsedComboIds` changes, compare with previous values to detect which combos are transitioning:

```typescript
// In useGraph.ts, within updateLayout or a useEffect:
const prevOpenRef = useRef<string[]>([]);
const prevCollapsedRef = useRef<string[]>([]);

// Combos that were closed and are now open:
const nowOpening = openComboIds.filter(id => prevCollapsedRef.current.includes(id));
// Combos that were open and are now closed:
const nowClosing = collapsedComboIds.filter(id => prevOpenRef.current.includes(id));
```

### Opening Sequence

```
1. For each nowOpening combo:
   a. Capture proxy position → computeOpenTransitionSeed()
   b. Capture proxy size → computeSizeSeed('opening', proxySize)
   c. Create ComboTransitionState and add to comboTransitions
   d. Set positionSeed on each member node's data

2. Run two-phase layout pipeline (103):
   - Members start at seed position
   - Container starts at seed size
   - Springs animate to final positions

3. When container spring reports onRest:
   a. clearComboTransition(comboId)
   b. Transition complete — combo is now in steady "open" state
```

### Closing Sequence

```
1. For each nowClosing combo:
   a. Capture member positions → computeCloseTransitionSeed()
   b. Capture current bounding box → computeSizeSeed('closing', undefined, currentBBox)
   c. Create ComboTransitionState and add to comboTransitions
   d. Set each member's target position to centroid

2. Members and container animate toward centroid

3. When container spring reports onRest:
   a. Remove member nodes from scene
   b. Remove body node
   c. Insert proxy node at centroid
   d. clearComboTransition(comboId)
   e. Trigger outer layout re-run with proxy

4. If animated === false:
   - Skip steps 2-3
   - Execute step 3a-3e immediately
```

### Layout Re-run Guard

While a transition is in-flight, the layout pipeline must not:
- Remove member nodes that are animating toward centroid (closing)
- Remove the proxy node before its position is captured (opening)
- Re-run and snap positions that are mid-animation

Implementation: Check `comboTransitions.size > 0` before running `transformCollapsedCombos` and the two-phase pipeline. If transitions are in-flight, defer the layout re-run until transitions complete.

```typescript
// In updateLayout:
if (comboTransitions.size > 0) {
  // Don't re-run layout while transitions are in-flight
  // The onRest callback will trigger layout re-run when ready
  return;
}
```

## Crossfade Opacity

During the opening transition, member nodes need to fade in (opacity 0 → target opacity). This leverages the existing opacity spring on Node.tsx:

```typescript
// Node.tsx already has an opacity spring for selection state.
// For combo transitions, the initial opacity is set to 0 and animates to the target.
// This is done by setting node.data.initialOpacity = 0 during the opening transition.
const initialOpacity = node.data?.initialOpacity ?? opacity;
```

During the closing transition, member node opacity animates to 0 before removal. This is handled by setting the target opacity to 0 when the close transition begins.

Proxy crossfade is simpler: the proxy node is removed before members appear (opening) or inserted after members disappear (closing), so there's no true simultaneous crossfade — it's sequential. This avoids complexity while maintaining visual coherence.

## Animation Disabled Behavior

When `animated` is `false` (or auto-disabled for large graphs):
- All springs use `duration: 0`, causing instant position/size/opacity changes
- `onRest` fires immediately after the spring is configured
- The transition sequence still executes in order (seed → animate → onRest → cleanup) but happens in a single frame
- No visual animation is perceived by the user

This follows the existing pattern: `config: { ...animationConfig, duration: animated ? undefined : 0 }`.

## Decisions

### D1: Sequential proxy/member swap instead of simultaneous crossfade

**Rationale:** A true simultaneous crossfade (proxy fades out while members fade in at the same time) requires both proxy and members to exist in the scene simultaneously with coordinated opacity. This complicates the layout pipeline (both proxy and members would need positions) and hit testing (clicking during crossfade is ambiguous). Sequential swap — remove proxy, then animate members in (or animate members out, then insert proxy) — is simpler and visually clear. The animation speed makes the gap imperceptible.

### D2: Position seed via node.data instead of store

**Rationale:** Passing the position seed through `node.data.positionSeed` keeps it colocated with the node and avoids adding another Map lookup to the store. It's a transient property only relevant during the first render. This follows the existing pattern where `node.data` carries computed metadata (e.g., `isCombo`, `comboId`).

### D3: comboTransitions in store (not ref)

**Rationale:** Transition state needs to be reactive — `ComboContainer` reads it to determine `from` values, and `useGraph` checks it to guard layout re-runs. A ref wouldn't trigger re-renders. A store field with `useShallow` comparison is appropriate.

### D4: Container onRest as transition completion signal

**Rationale:** The container spring encompasses the largest visual change (size animation). Using its `onRest` as the signal for transition completion ensures all visual elements have settled before proceeding to the next state (proxy insertion/removal). Member position springs use the same `animationConfig` and will settle at approximately the same time.

### D5: No staggered member animation (initial implementation)

**Rationale:** Staggering (members animate one by one instead of all at once) adds complexity and may not look good for small combos. All members animate simultaneously for the initial implementation. Staggering can be added later as an enhancement.

### D6: Re-compute sub-layout on re-open instead of caching

**Rationale:** Remembering previous sub-layout positions and animating back to them when re-opening would require persistent state that survives across multiple open/close cycles. For the initial implementation, re-computing the sub-layout is simpler and avoids stale position issues if the graph changes between cycles.

## Risks / Trade-offs

1. **Spring onRest timing:** React Spring's `onRest` fires when the spring reaches its target, but in edge cases (rapid open/close toggling), `onRest` from a previous transition may fire after a new transition starts. Mitigation: check that the transition is still active in the store when `onRest` fires; ignore stale callbacks.

2. **Layout guard during transitions:** Blocking layout re-runs while transitions are in-flight means other graph changes (node additions, edge updates) are also deferred. For typical use cases this is acceptable (transitions are ~500ms). For edge cases, a queue of pending layout updates could be added.

3. **Position seed accuracy:** If the proxy node's position is captured before the layout has converged (e.g., immediately after graph creation), the seed may be at an unexpected location. Mitigation: prefer drag references (user-positioned) over layout positions.

4. **Large combo performance:** A combo with 100+ members all animating simultaneously creates 100+ active springs. React Spring handles this efficiently for position-only springs, but it's worth monitoring frame rate. The auto-disable threshold (400 nodes+edges) provides a safety net.

5. **SHARED file conflicts:** `useGraph.ts` and `store.ts` are modified by multiple changes (100, 101-01, 103, 104). Implementation must be sequenced after dependencies. The changes target different sections, reducing conflict risk.

## Migration Plan

No migration needed. Animation is additive and activates only during combo state transitions. Existing behavior (no combos, or combos without state changes) is completely unaffected.

## Open Questions

1. **Should there be a configurable transition duration?** — Proposed: no, use the shared `animationConfig` spring for consistency. If needed later, a `transitionConfig` prop on `GraphCanvas` could override it.
2. **Should rapid toggling be debounced?** — Proposed: yes, ignore open/close commands while a transition is in-flight for the same combo. Allow different combos to transition simultaneously.
3. **Should the container have a minimum visible size during transitions?** — Proposed: yes, clamp to at least `[14, 14]` (2x default node size) to prevent the container from being invisible at the start of opening.
