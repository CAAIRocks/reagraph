# Change: 105-nested-combo-support

## Why

The combo system (100–104) currently processes combos as flat, independent groups. While `ComboDefinition` supports `parentComboId` for nesting and `resolveComboTree()` computes depth, the transform and layout pipelines treat each combo independently — they do not enforce depth-ordered processing. This means a nested combo hierarchy (e.g., "Paris Office" containing "Subnet-A" containing nodes) cannot be collapsed or opened correctly: inner proxies are not consumed by outer combos, sub-layout bounding boxes do not cascade, and position resolution does not compose through multiple nesting levels.

This change extends `transformCollapsedCombos()`, `computeOpenComboSubLayouts()`, and `resolveComboPositions()` to process combos in correct depth order, enabling unlimited nesting depth (practically 2-3 levels). It also adds z-ordering for nested containers and ensures the library supports mid-animation state changes needed for layer-by-layer open/close orchestration.

## What Changes

1. **Depth-ordered closed transform** in `src/utils/comboTransform.ts`: Modify `transformCollapsedCombos()` to sort collapsed combos by depth (deepest first) before processing, ensuring inner proxies are created before outer combos consume them as members.

2. **Bottom-up nested sub-layout** in `src/utils/comboLayout.ts`: Modify `computeOpenComboSubLayouts()` to process open combos bottom-up (deepest first), with inner combo body nodes participating as large member nodes in parent combo sub-layouts.

3. **Top-down position resolution** in `src/utils/comboLayout.ts`: Modify `resolveComboPositions()` to resolve positions top-down (shallowest first), composing body positions through nesting levels to produce correct world positions for all members.

4. **Container z-ordering** in `src/symbols/ComboContainer.tsx`: Accept a `depth` prop and compute z-position as `z = -1 - (depth * 0.5)` to layer nested containers correctly.

5. **Unit tests** in `src/utils/comboTransform.test.ts` and `src/utils/comboLayout.test.ts`: Tests for 3-level nesting, partial open/closed combos, edge routing through nesting levels, and z-ordering.

6. **Storybook demos**: NestedClosed, NestedPartialOpen, NestedAllOpen, and NestedLayerByLayer stories.

## Dependencies

- `100-combo-data-model` — Provides `resolveComboTree()` with depth computation, `getComboAncestors()`, and `InternalCombo` with `depth`/`childComboIds` fields.
- `101-01-closed-combo-transform` — Provides `transformCollapsedCombos()` (modified by this change to enforce depth ordering).
- `102-sub-layout-engine` — Provides sub-layout algorithm functions invoked during nested bottom-up computation.
- `103-two-phase-layout-pipeline` — Provides `computeOpenComboSubLayouts()` and `resolveComboPositions()` (both modified by this change).
- `104-open-close-animation` — Provides animation spring infrastructure that must support mid-animation state changes.

## Capabilities

### New Capabilities
_(none — extends existing combo-system capability)_

### Modified Capabilities
- `combo-system`: Nested combo resolution order, bottom-up sub-layout, top-down position resolution, layer-by-layer orchestration support, nested container z-ordering

## Impact

- **src/utils/comboTransform.ts** — Modified: sort collapsed combos by depth before processing (SHARED with 101-01)
- **src/utils/comboLayout.ts** — Modified: depth-ordered sub-layout and position resolution (SHARED with 103)
- **src/symbols/ComboContainer.tsx** — Modified: accept `depth` prop, compute z-position (SHARED with 101-02)
- **src/GraphScene.tsx** — Modified: pass combo `depth` to ComboContainer (SHARED with 103, 101-02)
- **src/utils/comboTransform.test.ts** — New nesting test cases
- **src/utils/comboLayout.test.ts** — New nesting test cases
- **stories/demos/Combo.story.tsx** — New nested combo stories (SHARED with 101-01, 103)

## Reuse Inventory

### Existing Code
- `src/utils/comboTransform.ts:transformCollapsedCombos()` — Extended to sort by depth. Current flat processing is correct for non-nested combos; adding depth sort is the only change needed.
- `src/utils/comboLayout.ts:computeOpenComboSubLayouts()` — Extended to process bottom-up. Current flat iteration works for non-nested combos; sort by depth and allow inner body nodes in parent sub-layouts.
- `src/utils/comboLayout.ts:resolveComboPositions()` — Extended to process top-down with cascading offset composition. Current flat resolution works for non-nested combos.
- `src/symbols/ComboContainer.tsx` — Extended to accept `depth` prop for z-ordering. Current z=-1 is correct for non-nested combos.

### From Dependency Specs
- **100-combo-data-model**: `resolveComboTree()` per `openspec/specs/combo-system.md`
  - Expected interface: returns `InternalCombo[]` with `depth: number` and `childComboIds: string[]`
  - Relevant scenario: "nested combos resolved with correct depth"
- **100-combo-data-model**: `getComboAncestors()` per `openspec/specs/combo-system.md`
  - Expected interface: `(comboId, combos) => string[]` — ordered ancestor IDs from parent to root
  - Relevant scenario: "combo with ancestors"
- **101-01-closed-combo-transform**: `transformCollapsedCombos()` per `openspec/changes/101-01-closed-combo-transform/design.md`
  - Expected interface: `(input: ComboTransformInput) => ComboTransformOutput`
  - Relevant scenario: This change modifies its internal processing order
- **103-two-phase-layout-pipeline**: `computeOpenComboSubLayouts()` and `resolveComboPositions()` per `openspec/changes/103-two-phase-layout-pipeline/design.md`
  - Expected interface: input/output as defined in 103's design
  - Relevant scenario: This change modifies their internal iteration order and adds cascading logic

### Net-New Components
- Depth-sorting logic within existing functions — minimal new code; primarily reordering iteration based on `InternalCombo.depth`
- Cascading position composition in `resolveComboPositions` — new inner loop that resolves nested body positions before member positions
- Z-depth computation in `ComboContainer` — single line: `z = -1 - (depth * 0.5)`

## Backwards Compatibility

None required. Nesting behavior activates only when `parentComboId` is set on combo definitions. Graphs without nested combos are completely unaffected — the depth-ordering sort is a no-op for flat combos (all depth 0).
