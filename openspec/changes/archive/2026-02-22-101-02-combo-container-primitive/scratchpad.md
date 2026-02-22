# Scratchpad: 101-02-combo-container-primitive

## Approach
- Following Cluster.tsx + Ring.tsx pattern closely for ComboContainer + CircleContainer
- RectangleContainer is new geometry pattern (planeGeometry + EdgesGeometry)
- Theme extension mirrors cluster theme section exactly
- GraphScene integration adds combo rendering after cluster rendering

## Decisions
- Using scale animation for size changes (GPU efficient, potential border distortion acceptable)
- Sharp rectangle corners via EdgesGeometry (defer RoundedBox)
- No custom renderer (onRender) — deferred
- Reading from store.comboContainers Map populated by layout pipeline

## Progress
- [x] Theme extension
- [x] CircleContainer
- [x] RectangleContainer  
- [x] ComboContainer orchestrator
- [x] GraphScene integration
- [x] Storybook demos
- [x] Verification

## npm run lint
Pre-existing: 54 fixable errors (import sort), 157 warnings. No new errors/warnings in our files.

## npm run build
Build succeeded. All 26 doc files generated. 0 failures.

## npm test
6 test files, 57 tests passed. All green.

## Review Fix Round (2026-02-21)

### Issues addressed:
1. **Task 4.1**: Added `onDragged?: (comboId: string) => void` to `ComboContainerProps` interface
2. **Task 4.8**: Implemented `useDrag` in ComboContainer following Cluster.tsx pattern:
   - Added `setComboContainerPosition` store method (moves member nodes + updates container center)
   - Wired `useDrag` with `addDraggingId`/`removeDraggingId` lifecycle
   - Added grab/grabbing cursors matching Cluster.tsx
   - Guarded click handler with `isDraggingCurrent` to prevent click-on-drag
   - GraphScene now passes `draggable` prop to ComboContainer
3. **Task 6.3**: ContainerAnimated story now uses `useEffect`+`setInterval` to randomize node positions every 2s via `fx`/`fy`, demonstrating dynamic container resizing

### Verification (post-fix)
## npx tsc --noEmit
All checks passed (exit 0)

## npm run lint
Pre-existing: 47 errors (import sort), 154 warnings. No new errors in our files.

## npm test
6 test files, 57 tests passed. All green.

## npm run build
Build succeeded. 26 doc files generated. 0 failures.
