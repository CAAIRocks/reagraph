## 1. Sub-layout types and interface (`src/layout/subLayouts/types.ts`)
<!-- COMPLEXITY: Low — defining interfaces and a shared bounding box utility -->

- [x] 1.1 Create `src/layout/subLayouts/types.ts` with `SubLayoutInput` interface (`nodeIds: string[]`, `tightness?: number`, `direction?: 'right' | 'down' | 'left' | 'up'`), `SubLayoutOutput` interface (`positions: Map<string, { x: number; y: number }>`, `boundingBox: { width: number; height: number }`), and `SubLayoutFn` type
- [x] 1.2 Add `computeBoundingBox(positions: Map<string, { x: number; y: number }>): { width: number; height: number }` shared utility to `types.ts`
- [x] 1.3 Add `computeSpacing(baseSpacing: number, tightness: number): number` shared utility implementing `baseSpacing * (11 - tightness) / 5`
- [x] 1.4 Create `src/layout/subLayouts/index.ts` barrel export (initially just types; algorithms added by subsequent groups)

## 2. Concentric algorithm (`src/layout/subLayouts/concentric.ts`) [senior-typescript-engineer]
<!-- COMPLEXITY: Medium — ring capacity math adapted from concentric2d.ts -->
<!-- PARALLEL: Groups 2, 3, 4, 5, and 6 can be worked simultaneously since they do not share files (except index.ts barrel) -->

- [x] 2.1 Create `src/layout/subLayouts/concentric.ts` exporting `concentricSubLayout: SubLayoutFn`
- [x] 2.2 Implement ring capacity calculation: `capacity = max(1, floor(2π * radius / minNodeSpacing))` where `minNodeSpacing = ringSpacing * 0.8`, adapted from `concentric2d.ts` ring math
- [x] 2.3 Implement ring filling: place nodes at even angles within each ring, advancing to next ring when full. `baseSpacing = 40`, `baseRadius = ringSpacing`
- [x] 2.4 Handle edge cases: 0 nodes returns empty map/zero bounding box, 1 node placed at (0,0)
- [x] 2.5 Add export to `src/layout/subLayouts/index.ts`

## 3. Grid algorithm (`src/layout/subLayouts/grid.ts`) [junior-engineer]
<!-- COMPLEXITY: Low — straightforward grid math -->
<!-- PARALLEL -->

- [x] 3.1 Create `src/layout/subLayouts/grid.ts` exporting `gridSubLayout: SubLayoutFn`
- [x] 3.2 Implement grid dimensions: `cols = ceil(sqrt(n))`, `rows = ceil(n / cols)`, `baseSpacing = 30`
- [x] 3.3 Implement grid placement centered at (0,0): `x = col * cellSpacing - (cols-1) * cellSpacing / 2`, `y = row * cellSpacing - (rows-1) * cellSpacing / 2`
- [x] 3.4 Handle edge cases: 0 nodes returns empty, 1 node at (0,0), non-square counts (e.g., 7 nodes in 3x3 grid with 2 empty cells)
- [x] 3.5 Add export to `src/layout/subLayouts/index.ts`

## 4. Sequential algorithm (`src/layout/subLayouts/sequential.ts`) [junior-engineer]
<!-- COMPLEXITY: Low — simple line placement with direction mapping -->
<!-- PARALLEL -->

- [x] 4.1 Create `src/layout/subLayouts/sequential.ts` exporting `sequentialSubLayout: SubLayoutFn`
- [x] 4.2 Implement directional placement: compute offset per node (`i * nodeSpacing - totalLength / 2`), map to (x,y) based on direction. `baseSpacing = 30`
- [x] 4.3 Support all 4 directions: `right` (+x), `left` (-x), `down` (+y), `up` (-y). Default to `right` when `direction` is not provided
- [x] 4.4 Handle edge cases: 0 nodes returns empty, 1 node at (0,0)
- [x] 4.5 Add export to `src/layout/subLayouts/index.ts`

## 5. Lens algorithm (`src/layout/subLayouts/lens.ts`) [junior-engineer]
<!-- COMPLEXITY: Low-Medium — radial spread with sqrt distance scaling -->
<!-- PARALLEL -->

- [x] 5.1 Create `src/layout/subLayouts/lens.ts` exporting `lensSubLayout: SubLayoutFn`
- [x] 5.2 Implement radial placement: `angle = 2π * i / n`, `distance = radialIncrement * sqrt(i + 1)` for even area distribution. `baseSpacing = 35`
- [x] 5.3 Handle edge cases: 0 nodes returns empty, 1 node at (0,0), 2 nodes placed at opposite sides
- [x] 5.4 Add export to `src/layout/subLayouts/index.ts`

## 6. Unit tests (`src/layout/subLayouts/*.test.ts`)
<!-- COMPLEXITY: Medium — covering 4 algorithms × multiple scenarios each -->
<!-- PARALLEL with Groups 2-5 -->

- [x] 6.1 Create `src/layout/subLayouts/concentric.test.ts`: test ring placement for 1 node (center), 3 nodes (single ring), 20+ nodes (multiple rings); verify positions centered around (0,0); verify bounding box correctness
- [x] 6.2 Create `src/layout/subLayouts/grid.test.ts`: test correct rows/cols for perfect square (4, 9) and non-square (5, 7) counts; verify centering at (0,0); verify bounding box matches grid dimensions
- [x] 6.3 Create `src/layout/subLayouts/sequential.test.ts`: test all 4 directions produce correct axis alignment; verify centering at (0,0); test with 1, 2, and many nodes
- [x] 6.4 Create `src/layout/subLayouts/lens.test.ts`: test radial spread increases with index; verify even angle distribution; verify bounding box covers all positions
- [x] 6.5 Create `src/layout/subLayouts/tightness.test.ts`: test that tightness=1 produces ~2x spacing vs tightness=5; tightness=10 produces ~0.2x spacing; test across all 4 algorithms
- [x] 6.6 Test edge cases across all algorithms: 0 nodes returns empty positions and zero bounding box; 1 node at (0,0) with zero bounding box

## 7. Storybook demos (`stories/demos/Combo.story.tsx`)
<!-- COMPLEXITY: Low — static demos with manually positioned nodes -->
<!-- SHARED: stories/demos/Combo.story.tsx — coordinate with other combo story work -->

- [x] 7.1 Add "SubLayoutConcentric" story: Open combo container with nodes arranged in concentric rings using `concentricSubLayout` to compute positions, displayed with `GraphCanvas`
- [x] 7.2 Add "SubLayoutGrid" story: Open combo container with nodes in grid arrangement using `gridSubLayout`
- [x] 7.3 Add "SubLayoutSequential" story: Open combo container with nodes in sequential line, with Storybook controls for direction toggle
- [x] 7.4 Add "SubLayoutLens" story: Open combo container with nodes in lens radial arrangement using `lensSubLayout`
- [x] 7.5 Add shared Storybook controls for tightness parameter (range 1-10) across all sub-layout stories

## 8. Verification

- [x] 8.1 Run `npm run lint` — passes with no new warnings
- [x] 8.2 Run `npm test` — all tests pass including new sub-layout tests (117 total, 41 new)
- [x] 8.3 Run `npm run build` — builds successfully with new files
- [x] 8.4 Verify all sub-layout exports are accessible from `src/layout/subLayouts/index.ts`
