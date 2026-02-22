# 103 Two-Phase Layout Pipeline - Scratchpad

## Exploration Summary

### Dependencies Status (all implemented)
- **100-combo-data-model**: `ComboDefinition`, `InternalCombo`, `ComboContainerData` types in `src/types.ts`. Store fields (`comboDefinitions`, `openComboIds`, `comboContainers`, setters) in `src/store.ts`.
- **101-01-closed-combo-transform**: `transformCollapsedCombos()` in `src/utils/comboTransform.ts`. Already called from `useGraph.ts`.
- **101-02-combo-container-primitive**: `ComboContainer` component in `src/symbols/ComboContainer.tsx`. Already rendered in `GraphScene.tsx` from `comboContainers` store.
- **102-sub-layout-engine**: Sub-layout functions (`concentricSubLayout`, `gridSubLayout`, `sequentialSubLayout`, `lensSubLayout`) in `src/layout/subLayouts/`. Interface: `SubLayoutFn = (input: SubLayoutInput) => SubLayoutOutput` where output has `positions: Map<string, {x,y}>` and `boundingBox: {width, height}`.

### Key Observations
1. `GraphScene.tsx` already has combo container rendering wired up — reads `comboContainers` from store and renders `ComboContainer` components. Group 4 is already done.
2. `forceDirected.ts` uses `forceCollide(d => d.radius + 10)`. In `layoutUtils.ts:buildNodeEdges()`, each node gets `radius: n.size || 1`. So body nodes need a `size` property for correct collision radius, OR radius set directly. Since `buildNodeEdges` maps `n.size` to `radius`, setting body node `size` to the computed radius value will work.
3. `useGraph.ts` already has the combo transform pipeline wired: `transformCollapsedCombos()` → `comboNodes/comboEdges` → `buildGraph` → `tick` → `transformGraph`. The two-phase pipeline inserts between combo transform output and `buildGraph`.
4. `openComboIds` store field exists but is not yet used. Need to wire it via GraphScene/GraphCanvas props.

### Implementation Plan
1. Create `src/utils/comboLayout.ts` with `computeOpenComboSubLayouts()` and `resolveComboPositions()`
2. Modify `src/useGraph.ts` to integrate two-phase pipeline
3. Verify `forceDirected.ts` body node support (may need minor size handling)
4. Wire `openComboIds` prop through GraphCanvas/GraphScene
5. Create tests in `src/utils/comboLayout.test.ts`
6. Add Storybook demos

## Progress Notes
- All implementation complete

## Decisions
- D1 confirmed: Body nodes use `size` property which `buildNodeEdges()` maps to `radius` for `forceCollide`. No changes to `forceDirected.ts` needed.
- GraphScene.tsx already had combo container rendering wired from 101-02. Only added `openComboIds` prop.
- Shadow edges use deduplication by sorted body-pair key with `data.count` for force weight.
- Position resolution rebuilds the graph with resolved nodes to run through `transformGraph`.

## npm test
All 129 tests pass (13 test files, including 12 new comboLayout tests)

## npm run lint
0 errors, 7 warnings (all pre-existing or test-file `any` types)

## npm run build
Build successful. Library: 218.11 kB, UMD: 240.59 kB, 26 doc components generated.

## Verification (2026-02-22 re-run)

### npm test
All 129 tests pass (13 test files, 12 new comboLayout tests). Duration: 1.07s.

### npm run lint
46 errors — all from pre-existing `.vscode/extensions/b2emo/extension.js` (prettier formatting). 0 errors from implementation files. 158 warnings (all pre-existing).

### npm run build
Build successful. No TypeScript errors.

### Code Review
- `comboLayout.ts`: matches design.md interfaces and algorithm. Body node creation, edge shadow splitting with dedup, layout type restriction all implemented.
- `useGraph.ts`: Two-phase pipeline correctly inserts after `transformCollapsedCombos()`, feeds `outerNodes`/`outerEdges` to `buildGraph`, resolves positions after `tick`, filters body nodes and shadow edges from rendered output.
- `comboLayout.test.ts`: 12 tests covering all scenarios from tasks.md (basic, radius calc, shadow edges, intra-combo exclusion, cross-combo, dedup, position resolution, container data, layout type restriction, no-op, body node exclusion).
- Stories: OpenCombo, MixedCombos, OpenComboForceLayout present in Combo.story.tsx.
- Barrel export: `src/utils/index.ts` exports `comboLayout`.

### Remaining
- 8.4/8.5: Storybook visual verification requires manual inspection (`npm start`).
