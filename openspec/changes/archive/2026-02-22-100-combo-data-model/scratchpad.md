# 100-combo-data-model Scratchpad

## Progress

### Types (src/types.ts) - COMPLETE
Types were already present in the file from the planning phase:
- `ComboDefinition` with all fields per spec
- `ComboContainerData` with `CenterPositionVector` import
- `InternalCombo` extending `ComboDefinition`

### Store Extensions (src/store.ts) - COMPLETE
- Added `ComboDefinition` and `ComboContainerData` imports
- Added state fields: `comboDefinitions`, `collapsedComboIds`, `openComboIds`, `comboContainers`
- Added setters following existing pattern (spread state)
- Added `collapsedComboIds` to createStore params with `[]` default
- Defaults: arrays use `[]`, Map uses `new Map()`

### Prop Threading - COMPLETE
- Added `combos`, `collapsedComboIds`, `onComboClick`, `onComboDoubleClick` to `GraphSceneProps`
- Destructured in component with `collapsedComboIds: collapsedComboIdsProp` rename
- Added store sync effects matching existing `selections`/`actives` pattern
- `GraphCanvasProps` inherits via `Omit<GraphSceneProps, 'theme'>` — no changes needed

### Utilities (src/utils/combo.ts) - COMPLETE
- `resolveComboTree`: index → children map → cycle detection → depth computation with caching
- `getComboForNode`: simple find on memberNodeIds
- `getComboAncestors`: walks parentComboId chain via index map
- Exported via `src/utils/index.ts` barrel

### Tests (src/utils/combo.test.ts) - COMPLETE
8 tests covering all functions and edge cases:
- Flat combos, nested combos, cycle detection, empty input
- Node lookup (found/not found)
- Ancestor chain (nested/top-level)

## Verification

## npm test
All 57 tests passed (6 test files), including 8 new combo utility tests.

## npm run lint
51 errors, 145 warnings — all pre-existing. No new lint issues introduced.

## vite build --mode library
Build succeeded in 3.81s. Output: dist/index.umd.cjs (202.98 kB).

## Decisions

### D1: collapsedComboIdsProp rename in GraphScene
Renamed the destructured prop to `collapsedComboIdsProp` to avoid shadowing the store setter parameter name. This is consistent with how the component handles similar name collisions.
