## 1. Types (`src/types.ts`)
<!-- COMPLEXITY: Low — adding three interfaces to existing types file -->

- [x] 1.1 Add `ComboDefinition` interface to `src/types.ts` with all fields: `id`, `label`, `memberNodeIds`, `parentComboId?`, `shape?`, `arrangement?`, `arrangementDirection?`, `tightness?`, `data?`
- [x] 1.2 Add `ComboContainerData` interface to `src/types.ts` with fields: `comboId`, `center`, `boundingBox` (type `CenterPositionVector`), `shape`, `radius?`, `width?`, `height?`, `memberNodeIds`
- [x] 1.3 Add `InternalCombo` interface extending `ComboDefinition` with computed fields: `collapsed`, `open`, `depth`, `childComboIds`, `proxyNodeId?`
- [x] 1.4 Add import for `CenterPositionVector` from `./utils/layout` in `src/types.ts`

## 2. Store Extensions (`src/store.ts`)
<!-- COMPLEXITY: Low — following existing setter pattern -->

- [x] 2.1 Add combo state fields to `GraphState` interface: `comboDefinitions`, `collapsedComboIds`, `openComboIds`, `comboContainers`
- [x] 2.2 Add combo setter types to `GraphState` interface: `setComboDefinitions`, `setCollapsedComboIds`, `setOpenComboIds`, `setComboContainers`
- [x] 2.3 Add combo imports (`ComboDefinition`, `ComboContainerData`) to store imports
- [x] 2.4 Add combo state defaults in `createStore` factory: `comboDefinitions: []`, `collapsedComboIds: []`, `openComboIds: []`, `comboContainers: new Map()`
- [x] 2.5 Add combo setter implementations in `createStore` factory following existing pattern

## 3. Prop Threading (`src/GraphScene.tsx`, `src/GraphCanvas/GraphCanvas.tsx`)
<!-- COMPLEXITY: Medium — threading props through two components and syncing to store -->
<!-- SHARED: src/GraphScene.tsx — no other group touches this file -->

- [x] 3.1 Add `combos?`, `collapsedComboIds?`, `onComboClick?`, `onComboDoubleClick?` props to `GraphScene` component props interface
- [x] 3.2 Add store sync effects in `GraphScene` for `combos` → `setComboDefinitions` and `collapsedComboIds` → `setCollapsedComboIds` (matching existing `selections`/`actives` pattern)
- [x] 3.3 Add `combos?`, `collapsedComboIds?`, `onComboClick?`, `onComboDoubleClick?` props to `GraphCanvasProps` in `GraphCanvas.tsx`
- [x] 3.4 Forward combo props from `GraphCanvas` to `GraphScene`

<!-- PARALLEL: Groups 1, 2, and 4 can be worked simultaneously since they do not share files -->

## 4. Utilities (`src/utils/combo.ts`, `src/utils/index.ts`)
<!-- COMPLEXITY: Medium — tree resolution algorithm with cycle detection -->

- [x] 4.1 Create `src/utils/combo.ts` with `resolveComboTree(combos: ComboDefinition[]): InternalCombo[]` — build index, resolve children, detect cycles, compute depths
- [x] 4.2 Add `getComboForNode(nodeId: string, combos: ComboDefinition[]): ComboDefinition | undefined` to `src/utils/combo.ts`
- [x] 4.3 Add `getComboAncestors(comboId: string, combos: ComboDefinition[]): string[]` to `src/utils/combo.ts` — walks parentComboId chain returning ordered ancestors
- [x] 4.4 Export combo utilities from `src/utils/index.ts` barrel

## 5. Tests (`src/utils/combo.test.ts`)
<!-- COMPLEXITY: Medium — multiple scenarios for tree resolution and edge cases -->

- [x] 5.1 Test `resolveComboTree` with flat combos (no nesting) — all depth 0, empty childComboIds
- [x] 5.2 Test `resolveComboTree` with nested combos — correct depth, correct childComboIds
- [x] 5.3 Test `resolveComboTree` cycle detection — throws error for circular parentComboId references
- [x] 5.4 Test `resolveComboTree` with empty input — returns empty array
- [x] 5.5 Test `getComboForNode` — returns correct combo or undefined
- [x] 5.6 Test `getComboAncestors` — returns ordered ancestor chain, empty for top-level

## 6. Verification

- [x] 6.1 Run `npm run lint` — passes with no new warnings
- [x] 6.2 Run `npm test` — all tests pass including new combo utility tests
- [x] 6.3 Run `npm run build` — builds successfully with new types
