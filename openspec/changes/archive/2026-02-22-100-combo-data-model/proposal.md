# Change: 100-combo-data-model

## Why

Reagraph currently supports flat node clustering via a `clusterAttribute` prop, which groups nodes by a shared data attribute. However, there is no mechanism for explicit, consumer-defined node groupings (combos) with nesting, collapse/expand, or configurable arrangement. This change introduces the foundational data model — TypeScript types, store extensions, and utility functions — that all subsequent combo system features depend on. Without this foundation, no combo rendering, layout, or interaction work can proceed.

## What Changes

1. **New types** in `src/types.ts`: `ComboDefinition` (consumer-facing), `ComboContainerData` (computed geometry), and `InternalCombo` (resolved with computed fields).
2. **Store extensions** in `src/store.ts`: New state fields (`comboDefinitions`, `collapsedComboIds`, `openComboIds`, `comboContainers`) and their setter functions added to `GraphState`.
3. **Prop threading**: New optional props on `GraphCanvas` and `GraphScene` (`combos`, `collapsedComboIds`, `onComboClick`, `onComboDoubleClick`) threaded to the store.
4. **Utility functions** in a new `src/utils/combo.ts`: `resolveComboTree` (hierarchy builder with cycle detection), `getComboForNode` (node-to-combo lookup), `getComboAncestors` (ancestor chain walker).
5. **Unit tests** in `src/utils/combo.test.ts` for the utility functions.

## Dependencies

None. This is the foundation tier — all other combo changes depend on this.

## Capabilities

### New Capabilities
- `combo-system`: Core data model, store state, props, and tree-resolution utilities for the combo (node grouping) system

### Modified Capabilities
_(none)_

## Impact

- **src/types.ts** — Three new interfaces added (no existing types modified)
- **src/store.ts** — `GraphState` interface extended with new fields and setters; `createStore` factory updated with defaults
- **src/GraphScene.tsx** — New optional props accepted and threaded to store
- **src/GraphCanvas/GraphCanvas.tsx** — New optional props accepted and forwarded to `GraphScene`
- **src/utils/combo.ts** — New file with utility functions
- **src/utils/combo.test.ts** — New file with unit tests
- **src/utils/index.ts** — Updated barrel export to include combo utilities

## Reuse Inventory

### Existing Code
- `src/types.ts:GraphElementBaseAttributes` — Base interface pattern with `id`, `data`, `label`; combo types follow same conventions
- `src/types.ts:InternalGraphNode` — Pattern for "internal" types extending public types with computed fields; `InternalCombo` follows this pattern
- `src/store.ts:GraphState` — Zustand store interface; combo state follows identical getter/setter pattern (e.g., `collapsedNodeIds`/`setCollapsedNodeIds`)
- `src/store.ts:createStore` — Factory function pattern for store initialization with defaults; combo state initialized the same way
- `src/utils/layout.ts:CenterPositionVector` — Reused directly as the bounding box type in `ComboContainerData`
- `src/utils/layout.ts:getLayoutCenter()` — Reference implementation for computing center/bounds from node positions; combo container computation follows same approach
- `src/utils/cluster.ts:ClusterGroup` — Existing grouping type with `nodes`, `position`, `label`; combo system is a parallel but more feature-rich grouping mechanism
- `src/utils/cluster.ts:buildClusterGroups()` — Pattern reference for iterating nodes and building group maps

### From Dependency Specs
_(none — no dependencies)_

### Net-New Components
- `ComboDefinition` type — Consumer-facing combo descriptor; no equivalent exists (clusters use attribute-based grouping, not explicit membership lists)
- `ComboContainerData` type — Computed geometry for rendering combo containers; clusters don't have container geometry
- `InternalCombo` type — Resolved combo with `depth`, `childComboIds`, `collapsed`, `open`; no tree-structured grouping exists
- `resolveComboTree()` — Builds hierarchy with cycle detection and depth computation; no existing tree builder in codebase
- `getComboForNode()` / `getComboAncestors()` — Combo-specific lookup utilities; no equivalents exist

## Backwards Compatibility

None required. This adds new types, state fields, and optional props without modifying any existing APIs or behavior.
