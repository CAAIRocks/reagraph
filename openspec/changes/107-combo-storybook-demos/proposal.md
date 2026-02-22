# Change: 107-combo-storybook-demos

## Why

The combo system (proposals 100–106) introduces a significant new feature surface: data model, closed/open transforms, container rendering, sub-layouts, two-phase pipeline, animation, interactions, and nesting. Each prior proposal includes narrow, feature-specific stories. However, there are no integration/showcase stories that demonstrate multiple combo features working together in realistic scenarios, and no consolidated unit test suites that validate the combo utility functions end-to-end.

Without comprehensive demos, consumers cannot easily discover combo capabilities or validate that the features compose correctly. Without thorough unit tests, regressions in the combo pipeline may go undetected as the codebase evolves.

This change creates a dedicated `Combo.story.tsx` with 24 stories covering basic usage, sub-layouts, animation, nesting, interactions, and real-world showcases. It also creates test data fixtures and unit test suites for all combo utility functions introduced in proposals 100–103.

## What Changes

1. **Test data fixtures** in `stories/assets/comboDemo.ts`: Four dataset tiers (basic, nested, large-scale, network topology) providing reusable graph data for all combo stories.

2. **Consolidated combo stories** in `stories/demos/Combo.story.tsx`: 24 stories organized into groups — basic (5), sub-layout (5), animation (2), nested (3), interaction (5), and showcase (4). Each story demonstrates specific combo features in isolation or combination.

3. **Unit test suites**: Test files for combo utilities (`combo.test.ts`), combo transform edge cases (`comboTransform.test.ts`), and all four sub-layout algorithms (`concentric.test.ts`, `grid.test.ts`, `sequential.test.ts`, `lens.test.ts`), plus combo layout integration tests (`comboLayout.test.ts`).

## Dependencies

- `100-combo-data-model` — Provides `ComboDefinition`, `InternalCombo`, combo store state, and tree resolution utilities tested here.
- `101-01-closed-combo-transform` — Provides `transformCollapsedCombos()` tested for edge cases here.
- `101-02-combo-container-primitive` — Provides `ComboContainer` rendered in stories.
- `102-sub-layout-engine` — Provides concentric, grid, sequential, and lens algorithms tested here.
- `103-two-phase-layout-pipeline` — Provides `computeOpenComboSubLayouts()` and `resolveComboPositions()` tested here.
- `104-open-close-animation` — Provides animation transitions demonstrated in stories.
- `105-nested-combo-support` — Provides nesting support demonstrated in nested stories.
- `106-combo-interaction-events` — Provides interaction callbacks demonstrated in interaction stories.

## Capabilities

### New Capabilities
_(none — this change validates and demonstrates existing capabilities)_

### Modified Capabilities
- `combo-system`: Comprehensive Storybook demo coverage, unit test coverage for combo utilities, combo test data fixtures

## Impact

- **stories/assets/comboDemo.ts** — New file with test data fixtures
- **stories/demos/Combo.story.tsx** — New file with 24 stories (SHARED story file referenced by earlier proposals)
- **src/utils/combo.test.ts** — New/extended test file for combo tree utilities
- **src/utils/comboTransform.test.ts** — New test file for transform edge cases
- **src/layout/subLayouts/concentric.test.ts** — New test file for concentric algorithm
- **src/layout/subLayouts/grid.test.ts** — New test file for grid algorithm
- **src/layout/subLayouts/sequential.test.ts** — New test file for sequential algorithm
- **src/layout/subLayouts/lens.test.ts** — New test file for lens algorithm
- **src/utils/comboLayout.test.ts** — New test file for layout pipeline integration

## Reuse Inventory

### Existing Code
- `stories/assets/demo.ts` — Pattern reference for test data exports; `comboDemo.ts` follows same structure (exported named constants with typed node/edge arrays)
- `stories/demos/Cluster.story.tsx` — Pattern reference for group-related stories; combo stories follow same component structure and control overlay patterns
- `stories/demos/Collapsible.story.tsx` — Pattern reference for expand/collapse interaction stories
- `stories/demos/Basic.story.tsx` — Pattern reference for story metadata and simple story structure
- `src/utils/graph.test.ts` — Pattern reference for utility function unit tests (describe/test/expect structure)

### From Dependency Specs
- **100-combo-data-model**: `resolveComboTree()`, `getComboForNode()`, `getComboAncestors()` per `openspec/specs/combo-system.md`
  - Expected interface: utilities accepting `ComboDefinition[]` and returning tree/lookup results
  - Relevant scenarios: cycle detection, depth computation, node lookup, ancestor chain
- **101-01-closed-combo-transform**: `transformCollapsedCombos()` per `openspec/changes/101-01-closed-combo-transform/design.md`
  - Expected interface: `(input: ComboTransformInput) => ComboTransformOutput`
  - Relevant scenarios: proxy injection, edge rerouting, intra-combo edge elimination, parallel edge aggregation
- **102-sub-layout-engine**: `concentricSubLayout()`, `gridSubLayout()`, `sequentialSubLayout()`, `lensSubLayout()` per `openspec/changes/102-sub-layout-engine/design.md`
  - Expected interface: `(input: SubLayoutInput) => SubLayoutOutput`
  - Relevant scenarios: empty input, single node, tightness scaling, direction control
- **103-two-phase-layout-pipeline**: `computeOpenComboSubLayouts()`, `resolveComboPositions()` per `openspec/changes/103-two-phase-layout-pipeline/design.md`
  - Expected interface: pipeline functions accepting graph state and producing positioned outputs
  - Relevant scenarios: two-phase activation, body node creation, position resolution

### Net-New Components
- `stories/assets/comboDemo.ts` — Test data fixture file; no existing combo test data exists
- 24 Storybook stories — Demonstration code; no existing combo stories in the codebase
- 7 unit test files — Test suites for combo utilities; no existing combo tests in the codebase

## Backwards Compatibility

None required. All additions are new files (stories, test data, tests) with no modifications to existing APIs or behavior.
