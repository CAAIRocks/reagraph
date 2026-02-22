## Context

The combo system (proposals 100–106) is a multi-tier feature spanning data model, transforms, rendering, layout, animation, interactions, and nesting. Each proposal includes narrow feature-specific stories, but there is no consolidated set of integration stories or comprehensive test coverage. This change creates the unified demo and testing layer that validates the complete system.

Reagraph uses Storybook 8 (`@storybook/react-vite`) with stories in `stories/demos/*.story.tsx` and test data in `stories/assets/`. Tests use Vitest with `.test.ts` suffix, focusing on utility and business logic (not React component rendering due to Three.js WebGL context requirements).

## Reuse Strategy

- **Story patterns** from `stories/demos/Cluster.story.tsx` and `stories/demos/Collapsible.story.tsx`: Interactive controls via `position: absolute; zIndex: 9` overlays, `useState` for toggling state, `useRef<GraphCanvasRef>` for programmatic API access.
- **Test data patterns** from `stories/assets/demo.ts`: Named exports of typed `GraphNode[]` and `GraphEdge[]` arrays with consistent ID naming conventions.
- **Test patterns** from existing `.test.ts` files: `describe()`/`test()`/`expect()` structure, edge case testing for empty inputs and single elements, boundary condition validation.
- **Sub-layout interfaces** from `102-sub-layout-engine/design.md`: `SubLayoutInput`/`SubLayoutOutput` types for testing algorithm contracts.
- **Transform interfaces** from `101-01-closed-combo-transform/design.md`: `ComboTransformInput`/`ComboTransformOutput` types for testing transform contracts.

## Goals / Non-Goals

**Goals:**
- Provide 24 Storybook stories demonstrating all combo features individually and in combination
- Create reusable test data fixtures at four scale tiers (basic, nested, large, network)
- Achieve unit test coverage for all combo utility functions from proposals 100–103
- Test edge cases: empty combos, single-node combos, cycle detection, 3-level nesting
- Include performance-oriented stories (200+ nodes) with `animated={false}`

**Non-Goals:**
- Visual regression testing (no screenshot comparisons; Storybook is for manual visual validation)
- React component tests for ComboContainer, Node, or Edge (Three.js WebGL context prevents unit testing)
- Automated interaction testing (no Playwright/Cypress; interaction stories are for manual validation)
- Testing animation timing or spring parameters (visual-only; validated via Storybook)

## Decisions

### D1: Single consolidated story file

**Rationale:** All 24 combo stories go in `stories/demos/Combo.story.tsx` rather than splitting across multiple files. This matches the existing pattern where feature areas have a single story file (e.g., `Cluster.story.tsx`, `Collapsible.story.tsx`). The Storybook sidebar groups them under `Demos/Combos` with named exports providing sub-navigation.

### D2: Dedicated test data file

**Rationale:** `stories/assets/comboDemo.ts` provides typed, reusable datasets separate from story logic. This avoids inline data definitions in stories (which are hard to maintain and reuse) and follows the `demo.ts` pattern. Four dataset tiers ensure stories can demonstrate features at different scales.

### D3: Test files co-located with source

**Rationale:** Unit test files are placed next to the source files they test (e.g., `src/utils/combo.test.ts` next to `src/utils/combo.ts`, `src/layout/subLayouts/concentric.test.ts` next to `concentric.ts`). This follows the existing project convention where test files use `.test.ts` suffix in the same directory.

### D4: No component tests, only utility/logic tests

**Rationale:** The project explicitly avoids React component tests due to Three.js WebGL context requirements (see CLAUDE.md: "Tests focus on utilities and business logic (not React components)"). All test files target pure functions and utility logic.

### D5: Performance story uses `animated={false}`

**Rationale:** The LargeScale story (200+ nodes, 20 combos) sets `animated={false}` to match the existing pattern where graphs exceeding 400 nodes+edges auto-disable animation. This validates that the combo system performs acceptably at scale without spring overhead.

## Story Organization

### Story Categories and Data Dependencies

| Category | Stories | Data Source | Key Features Validated |
|----------|---------|-------------|----------------------|
| Basic | ClosedCombos, OpenCombos, MixedState, CircleShape, RectangleShape | `basicComboNodes`, `basicComboEdges`, `basicComboDefs` | Proxy nodes, containers, shapes, mixed state |
| Sub-Layout | ArrangementConcentric, ArrangementGrid, ArrangementSequential, ArrangementLens, TightnessControl | `basicComboNodes`, `basicComboEdges`, single combo def with varying arrangement | All four algorithms, tightness parameter |
| Animation | AnimatedOpenClose, AnimatedMultiple | `basicComboNodes`, `basicComboEdges`, `basicComboDefs` | Open/close transitions, concurrent animation |
| Nested | NestedTwoLevel, NestedThreeLevel, NestedPartialOpen | `nestedComboNodes`, `nestedComboEdges`, `nestedComboDefs` | Multi-level nesting, partial open states |
| Interaction | DoubleClickToggle, ComboContextMenu, ComboDragContainment, ComboSelection, ProgrammaticAPI | `basicComboNodes`, `basicComboEdges`, `basicComboDefs` | Event callbacks, drag, selection, ref methods |
| Showcase | NetworkTopology, SocialNetwork, DataDrivenCombos, LargeScale | Dedicated datasets per story | Real-world complexity, performance |

### Interactive Controls Pattern

Stories with interactive controls use overlay HTML positioned absolutely:
```tsx
<div style={{ position: 'absolute', top: 10, left: 10, zIndex: 9, background: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 4, color: '#fff' }}>
  <button onClick={handleToggle}>Toggle Combo</button>
</div>
```

## Test Data Structure

### `stories/assets/comboDemo.ts` exports:

```typescript
// Basic tier: 15 nodes, 3 combos, ~20 edges
export const basicComboNodes: GraphNode[];      // 15 nodes across 3 groups + 3 external
export const basicComboEdges: GraphEdge[];      // ~20 edges (intra-combo + cross-combo + external)
export const basicComboDefs: ComboDefinition[]; // 3 flat combos (no nesting)

// Nested tier: 30 nodes, 6 combos in 2-level hierarchy, ~40 edges
export const nestedComboNodes: GraphNode[];
export const nestedComboEdges: GraphEdge[];
export const nestedComboDefs: ComboDefinition[]; // 2 outer combos, each with 2 inner combos

// Three-level tier: for 3-level nesting stress test
export const deepNestedComboNodes: GraphNode[];
export const deepNestedComboEdges: GraphEdge[];
export const deepNestedComboDefs: ComboDefinition[];

// Large tier: 200+ nodes, 20 combos, 100+ edges
export const largeComboNodes: GraphNode[];
export const largeComboEdges: GraphEdge[];
export const largeComboDefs: ComboDefinition[];

// Network topology: offices/subnets/devices
export const networkNodes: GraphNode[];
export const networkEdges: GraphEdge[];
export const networkComboDefs: ComboDefinition[]; // 3 offices with 2-3 subnets each
```

## Test Coverage Matrix

| Test File | Source File | Functions Tested | Key Edge Cases |
|-----------|------------|-----------------|----------------|
| `src/utils/combo.test.ts` | `src/utils/combo.ts` | `resolveComboTree`, `getComboForNode`, `getComboAncestors` | Empty input, single combo, cycle detection, 3-level depth, orphan nodes |
| `src/utils/comboTransform.test.ts` | `src/utils/comboTransform.ts` | `transformCollapsedCombos` | Empty combos, single-node combos, no edges, self-loops after remap, cross-combo edges, parallel edge aggregation |
| `src/layout/subLayouts/concentric.test.ts` | `src/layout/subLayouts/concentric.ts` | `concentricSubLayout` | 0 nodes, 1 node, tightness extremes (1, 10), ring capacity, bounding box |
| `src/layout/subLayouts/grid.test.ts` | `src/layout/subLayouts/grid.ts` | `gridSubLayout` | 0 nodes, 1 node, non-square count (7), tightness extremes, centering |
| `src/layout/subLayouts/sequential.test.ts` | `src/layout/subLayouts/sequential.ts` | `sequentialSubLayout` | 0 nodes, 1 node, all 4 directions, tightness extremes, centering |
| `src/layout/subLayouts/lens.test.ts` | `src/layout/subLayouts/lens.ts` | `lensSubLayout` | 0 nodes, 1 node, angle distribution, sqrt distance scaling, tightness |
| `src/utils/comboLayout.test.ts` | `src/utils/comboLayout.ts` | `computeOpenComboSubLayouts`, `resolveComboPositions` | Empty open combos, single combo, nested combos, mixed open/closed |

## Risks / Trade-offs

- **Story file size:** A single file with 24 stories may become large (~800-1000 lines). Acceptable since stories are independent named exports with minimal shared logic. If too unwieldy, sub-layout and showcase stories could be split to separate files in a future refactor.
- **Test data maintenance:** Hard-coded test datasets must be kept in sync with evolving `ComboDefinition` and `GraphNode` types. Using typed exports catches breaking changes at compile time.
- **No visual regression baseline:** Stories provide manual visual validation only. Automated visual regression testing (e.g., Chromatic) is out of scope but could be added later.

## Migration Plan

No migration needed. All files are net-new additions with no modifications to existing code.

## Open Questions

_(none — all design decisions resolved)_
