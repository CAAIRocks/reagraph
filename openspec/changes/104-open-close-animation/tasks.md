## 1. Position Seeding Logic (`src/utils/comboAnimation.ts`)
<!-- COMPLEXITY: High — core transition logic with position seeding, centroid computation, size seeding, and transition state types -->

- [ ] 1.1 Create `src/utils/comboAnimation.ts` with `ComboTransitionState` interface: `{ comboId, direction: 'opening' | 'closing', positionSeed: {x,y,z}, sizeSeed: {width,height}, startedAt: number }` (senior-typescript-engineer)
- [ ] 1.2 Implement `computeOpenTransitionSeed()`: accept `{ comboId, proxyNodeId, dragReferences, nodePositions, graphCenter }`, return position with priority: drag state → layout position → graph center (senior-typescript-engineer)
- [ ] 1.3 Implement `computeCloseTransitionSeed()`: accept `memberPositions: Map<string, {x,y,z}>`, return centroid `{x,y,z}` computed as average of all member positions; return `{0,0,0}` for empty input (senior-typescript-engineer)
- [ ] 1.4 Implement `computeSizeSeed()`: accept `direction` and optional `proxyNodeSize` / `currentBoundingBox`, return `{width, height}` — proxy diameter for opening, current bbox for closing (senior-typescript-engineer)
- [ ] 1.5 Implement `detectComboTransitions()`: compare previous and current `openComboIds`/`collapsedComboIds` to identify combos transitioning between states; return `{ nowOpening: string[], nowClosing: string[] }` (senior-typescript-engineer)
- [ ] 1.6 Export all functions and types from `src/utils/comboAnimation.ts`; add `export * from './comboAnimation'` to `src/utils/index.ts` barrel (senior-typescript-engineer)

## 2. Node Position Seed Integration (`src/symbols/Node.tsx`)
<!-- COMPLEXITY: Medium — light touch on existing spring configuration -->
<!-- SHARED: src/symbols/Node.tsx — existing component, minimal change to useSpring from value -->

- [ ] 2.1 In `Node.tsx`, modify the `useSpring` `from` position: read `node.data?.positionSeed` and use it as `from.nodePosition` if present, falling back to existing `center` default (senior-typescript-engineer)
- [ ] 2.2 For closing transitions, ensure that when `node.position` is updated to centroid, the spring's `to.nodePosition` updates accordingly and members animate toward centroid (senior-typescript-engineer)
- [ ] 2.3 Handle initial opacity for opening transitions: read `node.data?.initialOpacity` (default: existing opacity), use as spring `from` value to enable fade-in effect for combo member nodes (senior-typescript-engineer)

## 3. Container Size Animation (`src/symbols/ComboContainer.tsx`)
<!-- COMPLEXITY: Medium — extending existing spring with transition-aware from values -->
<!-- SHARED: src/symbols/ComboContainer.tsx — from 101-02-combo-container-primitive -->

- [ ] 3.1 Add `onTransitionRest?: (comboId: string) => void` prop to `ComboContainerProps` interface (senior-typescript-engineer)
- [ ] 3.2 Read `comboTransitions` from store; when a transition exists for this container's `comboId`, seed the spring `from` values with `transition.positionSeed` and `transition.sizeSeed` instead of current values (senior-typescript-engineer)
- [ ] 3.3 Wire `onRest` callback on the spring: when `isTransitioning`, call `onTransitionRest(comboId)` to signal transition completion to the orchestrator (senior-typescript-engineer)
- [ ] 3.4 Ensure `animated === false` causes `duration: 0` on the transition spring, making `onRest` fire immediately (senior-typescript-engineer)

## 4. Transition State Management (`src/useGraph.ts`, `src/store.ts`)
<!-- COMPLEXITY: High — transition detection, layout guarding, orchestration, onRest handling -->
<!-- SHARED: src/store.ts — also modified by 100, 101-01; src/useGraph.ts — also modified by 101-01, 103 -->

- [ ] 4.1 Extend `GraphState` in `src/store.ts` with `comboTransitions: Map<string, ComboTransitionState>`, `setComboTransitions()`, and `clearComboTransition(comboId)` (senior-typescript-engineer)
- [ ] 4.2 In `src/useGraph.ts`, add refs to track previous `openComboIds` and `collapsedComboIds` for transition detection across renders (senior-typescript-engineer)
- [ ] 4.3 Implement opening transition sequence in `useGraph.ts`: capture proxy position seed, create `ComboTransitionState`, set `positionSeed` on member node data, set `initialOpacity: 0` on member data, add to `comboTransitions` store, then proceed with two-phase layout (senior-typescript-engineer)
- [ ] 4.4 Implement closing transition sequence in `useGraph.ts`: compute member centroid, create `ComboTransitionState`, update member target positions to centroid, add to `comboTransitions` store; defer proxy insertion until `onRest` (senior-typescript-engineer)
- [ ] 4.5 Implement layout re-run guard: check `comboTransitions.size > 0` before running layout pipeline; if transitions in-flight, skip layout re-run (the `onRest` callback triggers deferred re-run) (senior-typescript-engineer)
- [ ] 4.6 Implement `handleTransitionComplete(comboId)` callback: for closing — remove members, remove body node, insert proxy at centroid, trigger layout re-run; for opening — mark transition complete; always call `clearComboTransition(comboId)` (senior-typescript-engineer)
- [ ] 4.7 Pass `onTransitionRest` callback through to `GraphScene` → `ComboContainer` so container springs can signal completion back to `useGraph` (senior-typescript-engineer)
- [ ] 4.8 Handle animation-disabled case: when `animated === false`, execute the full transition sequence synchronously (seed → set positions → skip spring → immediate cleanup) (senior-typescript-engineer)
- [ ] 4.9 Handle rapid toggling: if a transition for the same `comboId` is already in-flight in `comboTransitions`, ignore the new open/close command until the current transition completes (senior-typescript-engineer)

## 5. Storybook Demos (`stories/demos/Combo.story.tsx`)
<!-- COMPLEXITY: Medium — interactive stories demonstrating animation behavior -->
<!-- SHARED: stories/demos/Combo.story.tsx — also used by 101-01, 103 -->

- [ ] 5.1 Create `AnimatedOpenClose` story: single combo (5-8 nodes), button to toggle between open and closed; demonstrates full open/close animation cycle with position seeding and container size animation (senior-typescript-engineer)
- [ ] 5.2 Create `AnimatedMultiple` story: 3 combos that can be independently toggled open/closed; demonstrates concurrent transitions and spatial coherence (senior-typescript-engineer)
- [ ] 5.3 Create `AnimatedDisabled` story: same setup as AnimatedOpenClose but with `animated={false}`; demonstrates instant transitions with no visual animation (senior-typescript-engineer)
- [ ] 5.4 Add combo state toggle controls (buttons or checkboxes) that update `openComboIds`/`collapsedComboIds` props on `GraphCanvas`

## 6. Verification

- [ ] 6.1 Run `npm run lint` — passes with no new warnings
- [ ] 6.2 Run `npm test` — all tests pass including new comboAnimation tests
- [ ] 6.3 Run `npm run build` — builds successfully with new code
- [ ] 6.4 Verify Storybook: `npm start` → AnimatedOpenClose story shows smooth burst-outward on open and convergence on close
- [ ] 6.5 Verify Storybook: AnimatedMultiple story — multiple combos animate independently without interfering
- [ ] 6.6 Verify Storybook: AnimatedDisabled story — transitions are instant with no spring animation
- [ ] 6.7 Verify position seeding: after close + re-open, members start at proxy position (not graph center)
- [ ] 6.8 Verify container sizing: container grows from small to final bounding box during open, shrinks during close
- [ ] 6.9 Verify no regression: existing non-combo stories render unchanged
