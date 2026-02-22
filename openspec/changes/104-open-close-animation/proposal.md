# Change: 104-open-close-animation

## Why

The two-phase layout pipeline (103) positions open combo members at their final world coordinates instantly. Without animated transitions, combos snap between collapsed (proxy node) and expanded (container + members) states, which is visually disorienting — the user loses spatial context of where nodes came from or went to. Animated transitions are essential for maintaining the user's mental model of the graph topology during combo open/close operations.

This change adds smooth, spring-based animations for both directions of combo state transitions: expanding (proxy → container + members) and collapsing (container + members → proxy). It includes position seeding (so members emerge from the proxy's location), crossfade between proxy and members, animated container sizing, and coordinated timing via `onRest` callbacks.

## What Changes

1. **New utility module** `src/utils/comboAnimation.ts` — Position seeding logic (computing seed positions from proxy/drag state/centroid), transition state types, and helper functions for managing combo transition lifecycle.

2. **Store extension** in `src/store.ts` — New `comboTransitions` state field tracking which combos are currently animating (in-flight transitions), plus setter functions. This prevents layout re-runs from interrupting animations.

3. **Node position seed integration** in `src/symbols/Node.tsx` — The `from` position in `useSpring` is modified to use a combo-specific position seed (proxy's last position) instead of the default graph center when a node is a member of a transitioning combo.

4. **Container size animation** in `src/symbols/ComboContainer.tsx` — Spring-animated bounding box dimensions so the container grows/shrinks smoothly during transitions. Already partially supported by 101-02's dynamic sizing requirement; this change ensures the initial "from" size is seeded correctly for transitions.

5. **Transition orchestration** in `src/useGraph.ts` — When `openComboIds` or `collapsedComboIds` changes, detect which combos are transitioning, compute position seeds, manage the transition-in-flight state, and coordinate the sequence of proxy removal/insertion with animation callbacks.

6. **Storybook demos** — AnimatedOpenClose, AnimatedMultiple, and AnimatedDisabled stories demonstrating transition behavior.

## Dependencies

- `100-combo-data-model` — Provides `ComboDefinition`, `InternalCombo`, store fields, proxy node data structures.
- `101-01-closed-combo-transform` — Provides proxy node creation and edge remapping; proxy position is the seed for open transitions.
- `101-02-combo-container-primitive` — Provides `ComboContainer` component with spring-animated position/size; this change extends it with transition-aware initial sizing.
- `103-two-phase-layout-pipeline` — Provides the two-phase pipeline, body node injection, and position resolution that this change wraps with animation logic.

## Capabilities

### New Capabilities
- `combo-system`: Close-to-open combo transition animation, open-to-close combo transition animation, position seeding for transitions, container size animation during transitions

### Modified Capabilities
- `combo-system`: Extending combo-container-dynamic-sizing with transition-aware initial size seeding

## Impact

- **src/utils/comboAnimation.ts** — New file: position seeding, transition state helpers
- **src/utils/comboAnimation.test.ts** — New file: unit tests for seeding logic
- **src/utils/index.ts** — Updated barrel export
- **src/store.ts** — Extended with `comboTransitions` state (SHARED with 100, 101-01, 103)
- **src/symbols/Node.tsx** — Modified `useSpring` `from` position for combo member seeding (SHARED: lightly touched)
- **src/symbols/ComboContainer.tsx** — Modified spring `from` for transition-aware initial size (SHARED: from 101-02)
- **src/useGraph.ts** — Modified to detect transitions and orchestrate animation lifecycle (SHARED with 101-01, 103)
- **src/GraphScene.tsx** — Modified to pass transition state to ComboContainer (SHARED with 103, 106)
- **stories/demos/Combo.story.tsx** — New animated transition stories (SHARED with 101-01, 103)

## Reuse Inventory

### Existing Code
- `src/utils/animation.ts:animationConfig` — Shared spring config `{ mass: 5, tension: 170, friction: 26 }`. Used as-is for all combo transition springs.
- `src/symbols/Node.tsx:useSpring` — Existing node position animation. The `from` position currently uses `center` (graph center). Modified to accept a `positionSeed` override for combo members.
- `src/symbols/Node.tsx:nodePosition` spring — Pattern: `{ from: { nodePosition: center }, to: { nodePosition: [x, y, z] } }`. Same pattern extended with combo seed.
- `src/symbols/ComboContainer.tsx:useSpring` — Existing spring for position and size (from 101-02). Extended with initial "from" size for transitions.
- `src/store.ts:GraphState.drags` / `dragReferences` — Existing drag state used to look up proxy node's last dragged position for seeding.
- `src/useGraph.ts:updateLayout` — Existing layout callback. Transition detection and seed computation inserted around the two-phase pipeline calls.
- `src/CameraControls/useControls.ts` — Reference for `onRest`-style callback patterns with spring animations.

### From Dependency Specs
- **100-combo-data-model**: `InternalCombo.proxyNodeId` per `openspec/specs/combo-system.md`
  - Expected interface: proxy node ID for each collapsed combo
  - Relevant scenario: "collapsed combo has proxy node"
- **101-01-closed-combo-transform**: `transformCollapsedCombos()` and proxy node position per `openspec/changes/101-01-closed-combo-transform/design.md`
  - Expected interface: proxy node in output carries position (from centroid or drag state)
  - Relevant scenario: "proxy-node-position-seeding" — proxy position from drag state or member centroid
- **101-02-combo-container-primitive**: `ComboContainer` animated props per `openspec/changes/101-02-combo-container-primitive/design.md`
  - Expected interface: `animated`, `center`, `boundingBox` props with spring animation
  - Relevant scenario: "container animates position change" and "container animates size change"
- **103-two-phase-layout-pipeline**: `computeOpenComboSubLayouts()`, `resolveComboPositions()` per `openspec/changes/103-two-phase-layout-pipeline/design.md`
  - Expected interface: sub-layout results include member positions, body node creation
  - Relevant scenario: two-phase pipeline flow — position seeds injected before Phase 2

### Net-New Components
- `ComboTransitionState` type — Tracks in-flight transitions: `{ comboId, direction: 'opening' | 'closing', positionSeed, startedAt }`. No existing transition tracking in the codebase.
- `computePositionSeed()` — Computes seed position for a combo transition from proxy position, drag state, or member centroid. No existing position seeding logic.
- `computeMemberCentroid()` — Computes centroid from member world positions for close transition seeding. Similar to `getLayoutCenter()` but scoped to a specific set of nodes.
- `onTransitionComplete` callback coordination — Orchestrates proxy insertion/removal after spring animations settle. No existing `onRest`-based state machine in the codebase.

## Backwards Compatibility

None required. Animation is additive — existing graphs without combos are unaffected. When `animated` is `false`, transitions are instant. The animation system activates only during combo state changes.
