# 102-sub-layout-engine Scratchpad

## Decisions and Rationale

- Followed design.md exactly: pure functions with no React/Three.js/graphology dependencies
- `computeBoundingBox` and `computeSpacing` placed in `types.ts` as shared utilities per spec
- All algorithms use the tightness formula: `spacing = baseSpacing * (11 - tightness) / 5`
- Concentric ring capacity adapted from `concentric2d.ts` but simplified (no graphology, no fixed-level logic)
- Lens uses `sqrt(i+1)` distance scaling for even area distribution as specified
- Barrel export added to `src/layout/index.ts` via `export * from './subLayouts'`
- Storybook demos use `fx`/`fy` fixed positions with `layoutType="custom"` to display sub-layout output

## Progress

- All 4 algorithms implemented: concentric, grid, sequential, lens
- All types and shared utilities in place
- 5 test files with 41 tests covering all algorithms, tightness behavior, and edge cases
- 4 Storybook stories with interactive tightness controls (and direction for sequential)

## Verification

## npm run lint
All checks passed (0 errors, 0 warnings on new files)

## npm test
117 tests passed (41 new sub-layout tests + 76 existing). 0 failures.

## npm run build
Build succeeded. Library bundle: 205.37 kB, UMD: 226.92 kB. Type declarations generated.

## tsc --noEmit
All checks passed. No type errors.

## Files Created
- `src/layout/subLayouts/types.ts` — SubLayoutInput, SubLayoutOutput, SubLayoutFn, computeBoundingBox, computeSpacing
- `src/layout/subLayouts/concentric.ts` — concentricSubLayout
- `src/layout/subLayouts/grid.ts` — gridSubLayout
- `src/layout/subLayouts/sequential.ts` — sequentialSubLayout
- `src/layout/subLayouts/lens.ts` — lensSubLayout
- `src/layout/subLayouts/index.ts` — barrel export
- `src/layout/subLayouts/concentric.test.ts` — 5 tests
- `src/layout/subLayouts/grid.test.ts` — 5 tests
- `src/layout/subLayouts/sequential.test.ts` — 7 tests
- `src/layout/subLayouts/lens.test.ts` — 5 tests
- `src/layout/subLayouts/tightness.test.ts` — 19 tests

## Files Modified
- `src/layout/index.ts` — added `export * from './subLayouts'`
- `stories/demos/Combo.story.tsx` — added 4 sub-layout demo stories
