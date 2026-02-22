## ADDED Requirements

### Requirement: combo-definition-type
Consumer-provided combo definitions describe groups of nodes that should be visually and logically grouped together in the graph. A `ComboDefinition` includes a unique ID, label, member node IDs, optional parent combo for nesting, shape, arrangement strategy, tightness, and custom data.

#### Scenario: consumer provides combo definitions
- **WHEN** the consumer passes an array of `ComboDefinition` objects via the `combos` prop on `GraphCanvas`
- **THEN** each definition is stored in the Zustand store as `comboDefinitions` and available to the layout and rendering pipeline

#### Scenario: combo definition with nested parent
- **WHEN** a `ComboDefinition` has a `parentComboId` referencing another combo's ID
- **THEN** the system recognizes it as a child combo and resolves nesting depth accordingly

#### Scenario: combo definition with arrangement options
- **WHEN** a `ComboDefinition` specifies `arrangement`, `arrangementDirection`, or `tightness`
- **THEN** these values are preserved and available for downstream layout engines to consume

### Requirement: combo-container-data-type
A computed `ComboContainerData` type represents the resolved geometry of a combo after layout. It includes center position, bounding box (reusing `CenterPositionVector`), shape, dimensions, and the list of member node IDs.

#### Scenario: combo container computed after layout
- **WHEN** the layout engine computes positions for nodes within a combo
- **THEN** a `ComboContainerData` is produced with the combo's center, bounding box, shape, and dimensions

#### Scenario: combo container uses existing CenterPositionVector
- **WHEN** computing the bounding box of a combo's member nodes
- **THEN** the system reuses the existing `CenterPositionVector` type from `utils/layout.ts`

### Requirement: internal-combo-type
An `InternalCombo` extends `ComboDefinition` with computed fields: `collapsed`, `open`, `depth` (nesting level), `childComboIds`, and optional `proxyNodeId` for collapsed representation.

#### Scenario: internal combo resolved from definitions
- **WHEN** `resolveComboTree` processes an array of `ComboDefinition` objects
- **THEN** it produces `InternalCombo` objects with `depth` set to 0 for top-level combos, incrementing for each nesting level

#### Scenario: collapsed combo has proxy node
- **WHEN** a combo is collapsed (its ID is in `collapsedComboIds`)
- **THEN** the `InternalCombo.proxyNodeId` field holds the ID of the synthetic node representing the collapsed group

### Requirement: store-combo-state
The Zustand store (`GraphState`) is extended with combo-specific state fields: `comboDefinitions`, `collapsedComboIds`, `openComboIds`, `comboContainers`, and corresponding setter functions.

#### Scenario: store initializes with empty combo state
- **WHEN** the graph store is created without any combo props
- **THEN** `comboDefinitions` defaults to `[]`, `collapsedComboIds` to `[]`, `openComboIds` to `[]`, and `comboContainers` to an empty `Map`

#### Scenario: store updates combo definitions
- **WHEN** `setComboDefinitions` is called with a new array
- **THEN** the `comboDefinitions` state is replaced with the new array and subscribers are notified

#### Scenario: store updates collapsed combo IDs
- **WHEN** `setCollapsedComboIds` is called with an array of combo IDs
- **THEN** the `collapsedComboIds` state is updated and downstream systems can determine which combos render as collapsed

### Requirement: graph-canvas-combo-props
`GraphCanvas` and `GraphScene` accept new optional props: `combos` (array of `ComboDefinition`), `collapsedComboIds` (array of strings), `onComboClick` (callback), and `onComboDoubleClick` (callback). These props are threaded from `GraphCanvas` through `GraphScene` to the internal hooks and store.

#### Scenario: combo props passed to GraphCanvas
- **WHEN** the consumer renders `<GraphCanvas combos={[...]} collapsedComboIds={[...]} />`
- **THEN** the combo definitions and collapsed IDs are propagated to the store and available to the rendering pipeline

#### Scenario: combo click callbacks invoked
- **WHEN** a user clicks or double-clicks on a combo container element
- **THEN** the corresponding `onComboClick` or `onComboDoubleClick` callback is invoked with the combo's definition

### Requirement: combo-tree-resolution
A `resolveComboTree` utility function builds a combo hierarchy from flat `ComboDefinition[]` input. It validates against cycles, computes nesting depth, and resolves `childComboIds` for each combo.

#### Scenario: flat combos resolved to tree
- **WHEN** `resolveComboTree` receives an array of combos with no `parentComboId` values
- **THEN** all returned `InternalCombo` objects have `depth: 0` and empty `childComboIds`

#### Scenario: nested combos resolved with correct depth
- **WHEN** combo B has `parentComboId: 'A'` and combo C has `parentComboId: 'B'`
- **THEN** combo A has `depth: 0`, combo B has `depth: 1`, combo C has `depth: 2`, and combo A's `childComboIds` includes B's ID

#### Scenario: cycle detection throws error
- **WHEN** combo A references B as parent and B references A as parent
- **THEN** `resolveComboTree` throws an error indicating a cycle was detected

### Requirement: combo-node-lookup
A `getComboForNode` utility returns the `ComboDefinition` containing a given node ID, or `undefined` if the node is not in any combo.

#### Scenario: node found in combo
- **WHEN** `getComboForNode('node-1', combos)` is called and combo X includes `'node-1'` in `memberNodeIds`
- **THEN** the function returns combo X's definition

#### Scenario: node not in any combo
- **WHEN** `getComboForNode('orphan', combos)` is called and no combo includes `'orphan'`
- **THEN** the function returns `undefined`

### Requirement: combo-ancestor-lookup
A `getComboAncestors` utility walks the `parentComboId` chain and returns an ordered array of ancestor combo IDs from immediate parent to root.

#### Scenario: combo with ancestors
- **WHEN** combo C has parent B which has parent A (root)
- **THEN** `getComboAncestors('C', combos)` returns `['B', 'A']`

#### Scenario: top-level combo has no ancestors
- **WHEN** combo A has no `parentComboId`
- **THEN** `getComboAncestors('A', combos)` returns `[]`

### Requirement: closed-combo-graph-transform
When one or more combos are collapsed, the graph data is transformed before entering the layout pipeline. Member nodes of collapsed combos are removed and replaced with synthetic proxy nodes. All edges incident to member nodes are remapped to point to the corresponding proxy node.

#### Scenario: collapsed combo produces proxy node
- **WHEN** a combo with ID `comboId` is in `collapsedComboIds` and has N member nodes
- **THEN** all N member nodes are removed from the node array and a single proxy node with ID `combo-proxy-${comboId}` is injected, carrying the combo's label, member count, member node IDs, and a size scaled logarithmically from the member count

#### Scenario: no combos collapsed
- **WHEN** `collapsedComboIds` is empty
- **THEN** the transform returns the input nodes and edges unchanged

### Requirement: proxy-node-injection
Proxy nodes are synthetic `InternalGraphNode` objects that represent a collapsed combo in the graph. They carry metadata enabling downstream renderers and interactions to identify them as combo proxies.

#### Scenario: proxy node has combo metadata
- **WHEN** a proxy node is created for a collapsed combo
- **THEN** the proxy node's `data` includes `isCombo: true`, `comboId`, `memberCount`, `memberNodeIds`, and `originalCombo` (the full `ComboDefinition`)

#### Scenario: proxy node size scales with member count
- **WHEN** a combo with `memberCount` members is collapsed
- **THEN** the proxy node's size is `7 + Math.log2(memberCount) * 3`

### Requirement: edge-rerouting-for-collapsed-combos
Edges connected to member nodes of a collapsed combo are remapped to point to the combo's proxy node instead. This preserves the graph's connectivity structure across the collapse boundary.

#### Scenario: edge from member to external node
- **WHEN** an edge has its source in a collapsed combo and its target outside any collapsed combo
- **THEN** the edge's source is remapped to the combo's proxy node ID; target is unchanged

#### Scenario: edge from external node to member
- **WHEN** an edge has its target in a collapsed combo and its source outside any collapsed combo
- **THEN** the edge's target is remapped to the combo's proxy node ID; source is unchanged

#### Scenario: edge between two different collapsed combos
- **WHEN** an edge has source in combo A and target in combo B (both collapsed)
- **THEN** the edge is remapped to `combo-proxy-A` → `combo-proxy-B`

### Requirement: intra-combo-edge-elimination
Edges where both endpoints belong to the same collapsed combo are dropped from the output, as they have no visual representation when the combo is collapsed.

#### Scenario: edge between two nodes in same combo
- **WHEN** both `edge.source` and `edge.target` are member nodes of the same collapsed combo
- **THEN** the edge is removed from the output edge array

#### Scenario: self-loop after remapping
- **WHEN** edge remapping causes both source and target to resolve to the same proxy node
- **THEN** the edge is removed from the output edge array

### Requirement: parallel-edge-aggregation-for-combos
After edge remapping, multiple original edges may map to the same proxy-to-proxy or proxy-to-node pair. These parallel edges are deduplicated into a single aggregated edge carrying count metadata.

#### Scenario: multiple edges aggregate to single edge
- **WHEN** N original edges are remapped to the same `source-target` pair
- **THEN** a single aggregated edge is produced with `data.count: N`, `data.originalEdges` containing the N original edges, `data.isAggregated: true`, label `"N edges"`, and size scaled by count

#### Scenario: single edge after remap not aggregated
- **WHEN** only one original edge maps to a given `source-target` pair
- **THEN** the edge passes through with its original properties (no aggregation metadata added)

### Requirement: proxy-node-position-seeding
Proxy nodes receive an initial position hint to enable stable layout transitions. The position is determined by priority: previously dragged position, centroid of member node positions, or undefined (layout engine decides).

#### Scenario: proxy position from drag state
- **WHEN** `dragReferences` contains an entry for `combo-proxy-${comboId}`
- **THEN** the proxy node uses the dragged position

#### Scenario: proxy position from member centroid
- **WHEN** no drag reference exists but member nodes have positions
- **THEN** the proxy node position is the average of all member node positions

#### Scenario: proxy position undefined
- **WHEN** no drag reference exists and no member nodes have positions
- **THEN** the proxy node position is left undefined for the layout engine to determine

### Requirement: combo-container-circle-shape
The ComboContainer component renders a circle boundary around open combo member nodes using `ringGeometry`. The circle consists of a translucent fill disk and a stroke border ring, positioned at z=-1 (behind nodes). The outer radius is computed as `max(boundingBox.width, boundingBox.height) / 2 + padding`.

#### Scenario: circle container rendered for open combo
- **WHEN** a combo has `shape: 'circle'` and its `ComboContainerData` is present in the store's `comboContainers` map
- **THEN** a circle boundary is rendered at the combo's center position with outer radius derived from the bounding box dimensions plus padding

#### Scenario: circle container uses ring geometry for fill and stroke
- **WHEN** the circle container renders
- **THEN** it creates two meshes: a fill mesh using `ringGeometry` with `args={[outerRadius, 0, 128]}` and a stroke mesh using `ringGeometry` with `args={[outerRadius, innerRadius + padding, 128]}`, both with `DoubleSide`, `transparent: true`, `depthTest: false`

### Requirement: combo-container-rectangle-shape
The ComboContainer component renders a rectangle boundary around open combo member nodes using `planeGeometry` for fill and `edgesGeometry`/`lineSegments` for the border. The rectangle dimensions are derived from the bounding box width and height plus padding.

#### Scenario: rectangle container rendered for open combo
- **WHEN** a combo has `shape: 'rectangle'` and its `ComboContainerData` is present in the store's `comboContainers` map
- **THEN** a rectangle boundary is rendered at the combo's center position with dimensions `[width + padding*2, height + padding*2]`

#### Scenario: rectangle container uses plane geometry for fill and edges for border
- **WHEN** the rectangle container renders
- **THEN** it creates a fill mesh using `planeGeometry` and a border using `EdgesGeometry` from the plane rendered via `lineSegments`, both using combo theme colors

### Requirement: combo-container-dynamic-sizing
The ComboContainer dynamically resizes when its member nodes move. Position and size changes are animated using `@react-spring/three` `useSpring` with the shared `animationConfig`. Animation can be disabled via the `animated` prop.

#### Scenario: container animates position change
- **WHEN** a combo's center position changes (e.g., due to node dragging or layout recalculation)
- **THEN** the container smoothly animates to the new position using react-spring

#### Scenario: container animates size change
- **WHEN** a combo's bounding box dimensions change (e.g., nodes spread apart)
- **THEN** the container smoothly animates to the new size

#### Scenario: animation disabled
- **WHEN** the `animated` prop is `false`
- **THEN** position and size changes are applied instantly (spring duration set to 0)

### Requirement: combo-container-theme-support
The Theme type is extended with an optional `combo` section that controls fill color, stroke color, opacity levels (normal, selected, inactive), and label styling. Both light and dark themes provide default combo values. The combo theme structure mirrors the existing `cluster` theme section.

#### Scenario: combo theme section in light theme
- **WHEN** the light theme is active and no custom combo theme is provided
- **THEN** default combo theme values are used: `stroke: '#D8E6EA'`, `opacity: 1`, `selectedOpacity: 1`, `inactiveOpacity: 0.1`, `label: { stroke: '#fff', color: '#2A6475' }`

#### Scenario: combo theme section in dark theme
- **WHEN** the dark theme is active and no custom combo theme is provided
- **THEN** default combo theme values are used: `stroke: '#474B56'`, `opacity: 1`, `selectedOpacity: 1`, `inactiveOpacity: 0.1`, `label: { stroke: '#1E2026', color: '#ACBAC7' }`

#### Scenario: custom combo theme overrides defaults
- **WHEN** the consumer provides a custom `theme.combo` object
- **THEN** the custom values override the defaults and the container renders with the custom colors and opacity

### Requirement: combo-container-interaction-events
The ComboContainer exposes interaction event callbacks: `onClick`, `onDoubleClick`, `onPointerOver`, `onPointerOut`. It uses `useHoverIntent` for hover detection (matching Cluster pattern), `useCursor` for cursor changes, and sets `userData: { id: comboId, type: 'combo' }` on the outer group for hit testing.

#### Scenario: combo container click event
- **WHEN** a user clicks on a combo container and it is not disabled
- **THEN** the `onClick` callback is invoked with the combo ID and the Three.js mouse event

#### Scenario: combo container double-click event
- **WHEN** a user double-clicks on a combo container and it is not disabled
- **THEN** the `onDoubleClick` callback is invoked with the combo ID and the Three.js mouse event

#### Scenario: combo container hover events
- **WHEN** a user hovers over a combo container with intent (not accidental)
- **THEN** the `onPointerOver` callback is invoked, and when the pointer leaves, `onPointerOut` is invoked

#### Scenario: combo container disabled
- **WHEN** the `disabled` prop is `true`
- **THEN** no click, double-click, or hover callbacks are invoked

#### Scenario: combo container hit testing
- **WHEN** a raycaster intersects the combo container mesh
- **THEN** the intersection's `userData` contains `{ id: comboId, type: 'combo' }` for identification

### Requirement: two-phase-layout-pipeline
The graph layout pipeline runs in two phases when open combos are present. Phase 1 computes sub-layouts for each open combo's interior (member nodes positioned locally relative to combo center). Phase 2 runs the outer layout on regular nodes, proxy nodes (closed combos), and virtual body nodes (open combos), then resolves final world positions by composing body positions with local member offsets.

#### Scenario: two-phase pipeline activates for open combos
- **WHEN** `openComboIds` is non-empty and at least one open combo has member nodes
- **THEN** the layout pipeline runs Phase 1 (sub-layouts) followed by Phase 2 (outer layout + position resolution) instead of a single layout pass

#### Scenario: single-phase pipeline when no open combos
- **WHEN** `openComboIds` is empty (all combos collapsed or no combos defined)
- **THEN** the layout pipeline runs the standard single-pass layout unchanged

### Requirement: virtual-body-nodes-for-open-combos
For each open combo, a virtual "body" node is created that represents the combo's footprint in the outer layout. The body node has a radius derived from the sub-layout bounding box, participates in force simulation (including collision), but is never rendered.

#### Scenario: body node created from sub-layout bounding box
- **WHEN** Phase 1 completes sub-layout for an open combo with bounding box dimensions `width` × `height`
- **THEN** a body node with ID `combo-body-${comboId}` is created with `radius = max(width, height) / 2 + padding`

#### Scenario: body node participates in outer layout forces
- **WHEN** the outer layout is force-directed
- **THEN** the body node participates in forceCollide (using its radius) and force-link (via shadow edges), pushing other nodes away proportionally to combo size

#### Scenario: body node is not rendered
- **WHEN** the final node list is assembled for React rendering
- **THEN** body nodes (ID prefix `combo-body-`) are filtered out before passing to the scene graph

#### Scenario: body node floats freely in outer layout
- **WHEN** the outer force simulation runs
- **THEN** body nodes do NOT have `fx`/`fy` constraints — they move freely under force influence

### Requirement: position-resolution-from-body-to-members
After the outer layout converges, each open combo's member nodes receive world positions computed by adding their local sub-layout position to the body node's final world position.

#### Scenario: member world position computed from body + local offset
- **WHEN** body node for combo C settles at position `(bx, by)` and member M has local sub-layout position `(lx, ly)`
- **THEN** member M's final world position is `(bx + lx, by + ly, z)` where z is the scene z-depth

#### Scenario: container geometry computed from resolved world positions
- **WHEN** all member world positions for an open combo are resolved
- **THEN** a `ComboContainerData` is computed from those world positions (center, bounding box, shape, dimensions) and stored in `comboContainers`

### Requirement: edge-shadow-splitting-for-layout
Edges connected to members of open combos are split into render edges (original, connecting to member world positions) and shadow edges (connecting to body nodes for force layout purposes). Shadow edges exist only during the outer layout phase and are discarded before rendering.

#### Scenario: external-to-member edge produces shadow
- **WHEN** an edge connects an external node to a member of an open combo
- **THEN** the original edge is preserved for rendering AND a shadow edge is created from the external node to the body node for the outer layout

#### Scenario: intra-combo edges excluded from outer layout
- **WHEN** an edge connects two members of the same open combo
- **THEN** the edge is rendered normally but does NOT produce a shadow edge and is NOT included in the outer layout graph

#### Scenario: cross-combo edges produce body-to-body shadows
- **WHEN** an edge connects members of two different open combos
- **THEN** the original edge is preserved for rendering AND a shadow edge is created from body node A to body node B for the outer layout

#### Scenario: shadow edges discarded after layout
- **WHEN** the outer layout completes and position resolution is done
- **THEN** shadow edges are removed from the edge set; only original edges remain for rendering

### Requirement: combo-container-rendering-in-graph-scene
GraphScene reads `comboContainers` from the store and renders a `ComboContainer` component for each open combo. Container data is populated by the two-phase layout pipeline after position resolution.

#### Scenario: GraphScene renders combo containers
- **WHEN** `comboContainers` store map contains entries
- **THEN** GraphScene renders a `ComboContainer` for each entry, passing center, bounding box, shape, and theme data

#### Scenario: combo containers absent when no open combos
- **WHEN** `comboContainers` store map is empty (no open combos or combos not defined)
- **THEN** no `ComboContainer` components are rendered

### Requirement: layout-type-restriction-for-open-combos
Open combos are initially supported only with force-directed layout types. Other layout types (hierarchical, circular, tree) treat open combos as closed (collapsed) until future support is added.

#### Scenario: open combo with force-directed layout
- **WHEN** the layout type is `forceDirected2d` or `forceDirected3d` and a combo is in `openComboIds`
- **THEN** the two-phase pipeline runs with full body node and sub-layout support

#### Scenario: open combo with non-force layout falls back to closed
- **WHEN** the layout type is hierarchical, tree, circular, or concentric and a combo is in `openComboIds`
- **THEN** the combo is treated as collapsed (proxy node injected) and a console warning is emitted

### Requirement: concentric-sub-layout-algorithm
A concentric sub-layout algorithm arranges member nodes of an open combo in concentric rings around center (0,0). Nodes fill inner rings first, with ring capacity determined by circumference. The algorithm is a pure function with no React/Three.js dependencies, accepting node IDs and tightness, returning local coordinates and a bounding box.

#### Scenario: concentric layout places nodes in rings
- **WHEN** `concentricSubLayout` is called with N node IDs and default tightness
- **THEN** nodes are placed in concentric rings starting from the innermost ring, with each ring filled to capacity before advancing to the next

#### Scenario: concentric layout single node
- **WHEN** `concentricSubLayout` is called with 1 node ID
- **THEN** the node is placed at position (0, 0) with a zero-dimension bounding box

#### Scenario: concentric layout empty input
- **WHEN** `concentricSubLayout` is called with 0 node IDs
- **THEN** an empty positions map is returned with a zero-dimension bounding box

#### Scenario: concentric layout respects tightness
- **WHEN** `concentricSubLayout` is called with tightness=10 vs tightness=1
- **THEN** tightness=10 produces ring spacing approximately 5x smaller than tightness=1

### Requirement: grid-sub-layout-algorithm
A grid sub-layout algorithm arranges member nodes of an open combo in a regular grid pattern centered at (0,0). Grid dimensions are auto-calculated as `cols = ceil(sqrt(n))`, `rows = ceil(n/cols)`. The algorithm is a pure function returning local coordinates and a bounding box.

#### Scenario: grid layout places nodes in rows and columns
- **WHEN** `gridSubLayout` is called with N node IDs and default tightness
- **THEN** nodes are placed in a grid with `ceil(sqrt(N))` columns, centered at (0,0)

#### Scenario: grid layout handles non-square counts
- **WHEN** `gridSubLayout` is called with 7 node IDs
- **THEN** nodes are placed in a 3×3 grid with 2 empty cells, centered at (0,0)

#### Scenario: grid layout single node
- **WHEN** `gridSubLayout` is called with 1 node ID
- **THEN** the node is placed at position (0, 0)

#### Scenario: grid layout respects tightness
- **WHEN** `gridSubLayout` is called with tightness=10 vs tightness=1
- **THEN** tightness=10 produces cell spacing approximately 5x smaller than tightness=1

### Requirement: sequential-sub-layout-algorithm
A sequential sub-layout algorithm arranges member nodes in a line along one of four directions (right, down, left, up), centered at (0,0). Even spacing is controlled by the tightness parameter. The algorithm is a pure function returning local coordinates and a bounding box.

#### Scenario: sequential layout right direction
- **WHEN** `sequentialSubLayout` is called with direction `'right'`
- **THEN** nodes are placed along the positive x-axis, evenly spaced, centered at (0,0)

#### Scenario: sequential layout down direction
- **WHEN** `sequentialSubLayout` is called with direction `'down'`
- **THEN** nodes are placed along the positive y-axis, evenly spaced, centered at (0,0)

#### Scenario: sequential layout left direction
- **WHEN** `sequentialSubLayout` is called with direction `'left'`
- **THEN** nodes are placed along the negative x-axis, evenly spaced, centered at (0,0)

#### Scenario: sequential layout up direction
- **WHEN** `sequentialSubLayout` is called with direction `'up'`
- **THEN** nodes are placed along the negative y-axis, evenly spaced, centered at (0,0)

#### Scenario: sequential layout default direction
- **WHEN** `sequentialSubLayout` is called without a `direction` parameter
- **THEN** the default direction is `'right'`

#### Scenario: sequential layout single node
- **WHEN** `sequentialSubLayout` is called with 1 node ID
- **THEN** the node is placed at position (0, 0)

#### Scenario: sequential layout respects tightness
- **WHEN** `sequentialSubLayout` is called with tightness=10 vs tightness=1
- **THEN** tightness=10 produces node spacing approximately 5x smaller than tightness=1

### Requirement: lens-sub-layout-algorithm
A lens sub-layout algorithm arranges member nodes in a radial spread from center outward, with nodes distributed at even angles and distance from center increasing with index (square-root scaling for even area distribution). The algorithm is a pure function returning local coordinates and a bounding box.

#### Scenario: lens layout radial spread
- **WHEN** `lensSubLayout` is called with N node IDs
- **THEN** nodes are placed at evenly distributed angles with increasing distance from center

#### Scenario: lens layout single node
- **WHEN** `lensSubLayout` is called with 1 node ID
- **THEN** the node is placed at position (0, 0)

#### Scenario: lens layout even angle distribution
- **WHEN** `lensSubLayout` is called with N node IDs (N > 1)
- **THEN** the angular separation between consecutive nodes is `2π / N`

#### Scenario: lens layout respects tightness
- **WHEN** `lensSubLayout` is called with tightness=10 vs tightness=1
- **THEN** tightness=10 produces radial spacing approximately 5x smaller than tightness=1

### Requirement: sub-layout-tightness-parameter
All sub-layout algorithms accept a `tightness` parameter (1-10, default 5) that controls spacing. The tightness-to-spacing formula is `spacing = baseSpacing * (11 - tightness) / 5`, where `baseSpacing` is algorithm-specific. Tightness=1 produces very loose spacing (2x base), tightness=5 produces default spacing (1x base), tightness=10 produces very tight spacing (0.2x base).

#### Scenario: tightness default value
- **WHEN** a sub-layout algorithm is called without a `tightness` parameter
- **THEN** the default tightness of 5 is used, resulting in 1x base spacing

#### Scenario: tightness scales spacing proportionally
- **WHEN** a sub-layout algorithm is called with varying tightness values
- **THEN** the spacing changes proportionally according to `spacing = baseSpacing * (11 - tightness) / 5`

### Requirement: close-to-open-combo-transition-animation
When a collapsed combo is opened, the transition from proxy node to expanded container with visible members is animated. Members appear at the proxy's last position and spring outward to their sub-layout world positions. The container boundary animates from the proxy's size to the final bounding box. The proxy node crossfades out as members fade in.

#### Scenario: members animate from proxy position to sub-layout positions
- **WHEN** a combo transitions from closed to open
- **THEN** all member nodes are initially positioned at the proxy node's last known position and animate via `@react-spring/three` springs to their computed sub-layout world positions, creating a "burst outward" visual effect

#### Scenario: container boundary animates from small to final size
- **WHEN** a combo transitions from closed to open
- **THEN** the `ComboContainer` boundary appears at the proxy's approximate size and animates (spring) to the final bounding box dimensions computed by the sub-layout

#### Scenario: proxy crossfades out during open transition
- **WHEN** a combo transitions from closed to open
- **THEN** the proxy node's opacity animates to 0 and the proxy is removed from the scene after the crossfade completes, while member nodes simultaneously animate their opacity from 0 to their target opacity

#### Scenario: outer layout re-runs after open transition
- **WHEN** a combo finishes opening (members reach final positions)
- **THEN** the outer layout re-runs with the body node replacing the proxy, causing neighboring nodes to shift outward to accommodate the expanded combo

### Requirement: open-to-close-combo-transition-animation
When an open combo is collapsed, the transition from expanded container with visible members to a single proxy node is animated. Members animate inward toward the combo centroid. The container boundary shrinks. After animation completes, members are removed and replaced with a proxy node at the centroid.

#### Scenario: members animate toward combo centroid
- **WHEN** a combo transitions from open to closed
- **THEN** all member nodes animate from their current world positions toward the combo's centroid position using `@react-spring/three` springs

#### Scenario: container boundary shrinks during close transition
- **WHEN** a combo transitions from open to closed
- **THEN** the `ComboContainer` boundary animates from its current size to a small size (approximating a single node) at the centroid

#### Scenario: proxy appears after close animation completes
- **WHEN** the close animation springs reach their rest state (via `onRest` callback)
- **THEN** member nodes and the body node are removed from the scene, a proxy node is inserted at the combo centroid, and the proxy fades in

#### Scenario: outer layout re-runs after close transition
- **WHEN** a combo finishes closing (proxy node inserted)
- **THEN** the outer layout re-runs with the proxy node replacing the body node, causing neighboring nodes to potentially shift inward

### Requirement: combo-transition-position-seeding
Position seeding determines the initial positions of nodes during combo transitions. When opening, members start at the proxy's last position. When closing, the proxy appears at the member centroid. This creates visually coherent transitions where elements appear to emerge from or collapse into a single point.

#### Scenario: open transition seeds members at proxy position
- **WHEN** a combo transitions from closed to open
- **THEN** the position seed for each member node is the proxy node's last known position (from store drag references or last layout position), and members animate from this seed to their sub-layout world positions

#### Scenario: close transition seeds proxy at member centroid
- **WHEN** a combo transitions from open to closed
- **THEN** the proxy node's initial position is the centroid of all member node positions at the moment the close transition begins

#### Scenario: position seed from drag state takes priority
- **WHEN** a combo transitions and the proxy node has a dragged position in `dragReferences`
- **THEN** the drag position is used as the seed, overriding the layout-computed position

#### Scenario: position seed undefined falls back to layout
- **WHEN** a combo transitions from closed to open and neither drag state nor member positions are available
- **THEN** position seeding is skipped and the layout engine determines initial positions

### Requirement: combo-container-size-animation
The `ComboContainer` component animates its size (radius for circles, width/height for rectangles) when the bounding box changes during combo transitions. The size spring uses the shared `animationConfig` and respects the `animated` prop.

#### Scenario: container size animates during open transition
- **WHEN** a combo opens and the container's bounding box transitions from small (proxy-sized) to the full sub-layout extent
- **THEN** the container's rendered dimensions animate smoothly via `@react-spring/three` `useSpring`

#### Scenario: container size animates during close transition
- **WHEN** a combo closes and the container's bounding box transitions from full extent to small (centroid-sized)
- **THEN** the container's rendered dimensions animate smoothly until the container is removed

#### Scenario: container size animation disabled
- **WHEN** the `animated` prop is `false`
- **THEN** container size changes are applied instantly (spring duration set to 0)

#### Scenario: container size animation respects animationConfig
- **WHEN** the container animates its size
- **THEN** the spring configuration uses the shared `animationConfig` from `src/utils/animation.ts` (`{ mass: 5, tension: 170, friction: 26 }`)

### Requirement: combo-transition-animation-disabled
When the `animated` prop is `false` or the graph exceeds the auto-disable threshold (nodes + edges > 400), all combo transition animations are skipped. Transitions happen instantly: nodes appear/disappear at their final positions without intermediate animation.

#### Scenario: animation disabled via prop
- **WHEN** the `animated` prop is `false` and a combo transition occurs
- **THEN** members appear/disappear at their final positions immediately, the container snaps to its final size, and the proxy node appears/disappears without crossfade

#### Scenario: animation auto-disabled for large graphs
- **WHEN** the total node + edge count exceeds 400 and a combo transition occurs
- **THEN** the transition behaves as if `animated` is `false`

#### Scenario: animation disabled uses duration zero
- **WHEN** animation is disabled and springs are configured for the transition
- **THEN** all spring configurations use `duration: 0` following the existing pattern `config: { ...animationConfig, duration: animated ? undefined : 0 }`

### Requirement: nested-combo-resolution-order
When multiple combos are nested (via `parentComboId`), the closed combo transform and sub-layout engine must process combos in depth-first order (deepest first for bottom-up operations, shallowest first for top-down operations). `resolveComboTree()` from 100-combo-data-model provides depth ordering.

#### Scenario: depth-first closed transform for nested combos
- **WHEN** combo C (depth 2) is inside combo B (depth 1) which is inside combo A (depth 0), and all three are collapsed
- **THEN** `transformCollapsedCombos()` processes C first (replacing C's members with `combo-proxy-C`), then B (replacing B's members + `combo-proxy-C` with `combo-proxy-B`), then A (replacing A's members + `combo-proxy-B` with `combo-proxy-A`)

#### Scenario: depth ordering produces correct proxy chain
- **WHEN** a 3-level nested combo hierarchy is fully collapsed
- **THEN** only the outermost proxy node appears in the final outer layout — inner proxies are consumed as members of their parent combo

#### Scenario: partial collapse preserves intermediate structure
- **WHEN** combo A is open, combo B (child of A) is collapsed, and combo C (child of B) is collapsed
- **THEN** B's proxy appears as a member of A's sub-layout; C's proxy is consumed inside B's proxy

### Requirement: nested-bottom-up-sub-layout
When nested combos are open, sub-layouts must be computed bottom-up: innermost open combos first, then their parents. The bounding box of an inner combo's sub-layout becomes the size of its body node within the parent combo's sub-layout.

#### Scenario: inner combo sub-layout runs before outer
- **WHEN** combo A (outer) and combo B (inner, child of A) are both open
- **THEN** `computeOpenComboSubLayouts()` runs B's sub-layout first, then A's sub-layout treats B's body node as a large member node

#### Scenario: inner body node participates in parent sub-layout
- **WHEN** combo B's sub-layout produces a bounding box of 200×100
- **THEN** a body node `combo-body-B` with radius derived from that bounding box is placed among A's member nodes during A's sub-layout computation

#### Scenario: deeply nested sub-layout cascades
- **WHEN** combos at depths 0, 1, and 2 are all open
- **THEN** depth-2 sub-layout runs first, depth-1 sub-layout includes depth-2 body node, depth-0 sub-layout includes depth-1 body node

### Requirement: nested-top-down-position-resolution
After the outer layout converges, world positions for nested combo members are resolved top-down: outermost body positions first, then computing inner body positions from parent offsets, then innermost member positions.

#### Scenario: top-down resolution for 2-level nesting
- **WHEN** outer body node settles at `(100, 50)`, inner combo has local position `(20, 10)` within outer, and inner member has local position `(5, 3)` within inner
- **THEN** inner body world position is `(120, 60)` and inner member world position is `(125, 63)`

#### Scenario: container data computed at each nesting level
- **WHEN** both outer and inner combos are open
- **THEN** `ComboContainerData` is produced for both combos with correct world-space center and bounding box

#### Scenario: resolution handles mixed open/closed nesting
- **WHEN** outer combo is open and inner combo is collapsed (proxy visible inside outer container)
- **THEN** the inner proxy node receives a world position from the outer combo's position resolution, and no inner container is rendered

### Requirement: layer-by-layer-orchestration-support
The library supports changing `openComboIds` and `collapsedComboIds` mid-animation and handles multiple combos transitioning simultaneously. This enables consumers to implement layer-by-layer open/close patterns where nested combos open or close sequentially with animation between each level.

#### Scenario: mid-animation state change
- **WHEN** a combo is animating from closed to open and `openComboIds` is updated to include a child combo
- **THEN** the layout pipeline re-runs with both combos open, and the child combo's sub-layout is computed in the new pipeline pass

#### Scenario: simultaneous combo transitions
- **WHEN** multiple combos at different nesting levels are transitioning between open and closed states
- **THEN** each pipeline pass produces a consistent snapshot — positions and containers are correct for the current set of `openComboIds`/`collapsedComboIds`

#### Scenario: sequential layer open pattern
- **WHEN** a consumer opens combos from outermost to innermost with `await waitForAnimation()` between each
- **THEN** each intermediate state renders correctly: first outer container with inner proxy, then both containers with nested members

### Requirement: nested-container-z-ordering
When nested combos are both open, their containers are rendered at different z-depths to ensure correct visual layering. Outer containers render behind inner containers, and both render behind nodes.

#### Scenario: outer container z-depth
- **WHEN** a combo at depth 0 is open
- **THEN** its container renders at `z = -1 - (depth * 0.5)` = `z = -1`

#### Scenario: inner container z-depth
- **WHEN** a combo at depth 1 is open inside an open depth-0 combo
- **THEN** the inner container renders at `z = -1 - (1 * 0.5)` = `z = -1.5`, between the outer container (`z = -1`) and further behind nodes (`z = 0`)

#### Scenario: deeply nested container z-ordering
- **WHEN** combos at depths 0, 1, and 2 are all open
- **THEN** containers render at z = -1, -1.5, and -2 respectively, maintaining correct visual layering

#### Scenario: nodes always render in front of all containers
- **WHEN** any number of nested containers are rendered
- **THEN** all nodes render at z = 0, which is in front of all container z-depths

### Requirement: combo-double-click-toggle
Users can double-click on a closed combo proxy node to open it, or double-click on an open combo container's background to close it. This provides intuitive toggle behavior for combo state.

#### Scenario: double-click closed combo proxy opens combo
- **WHEN** a user double-clicks on a closed combo proxy node
- **THEN** the `onComboDoubleClick` callback is invoked with the combo ID, enabling the consumer to move the combo from `collapsedComboIds` to `openComboIds`

#### Scenario: double-click open combo container background closes combo
- **WHEN** a user double-clicks on the background of an open combo container (not on a member node)
- **THEN** the `onComboDoubleClick` callback on the container is invoked with the combo ID, enabling the consumer to move the combo from `openComboIds` to `collapsedComboIds`

#### Scenario: double-click disabled
- **WHEN** the combo container or proxy node has `disabled: true`
- **THEN** the double-click handler does not fire

### Requirement: combo-context-menu
Right-clicking on a combo proxy node or container opens a context menu with combo-specific actions including collapse/expand. The context menu receives `ComboContextMenuProps` with combo metadata.

#### Scenario: right-click proxy node shows context menu
- **WHEN** a user right-clicks on a closed combo proxy node and `onComboContextMenu` is provided
- **THEN** the callback is invoked with `{ comboId, isOpen: false, memberCount, event }`

#### Scenario: right-click open container shows context menu
- **WHEN** a user right-clicks on an open combo container background and `onComboContextMenu` is provided
- **THEN** the callback is invoked with `{ comboId, isOpen: true, memberCount, event }`

#### Scenario: context menu disabled
- **WHEN** the `disabled` prop is `true`
- **THEN** the context menu callback does not fire

### Requirement: combo-selection-behavior
Clicking a combo (proxy or container) selects it. When a combo is selected, its ID is added to the selections array. Member nodes inside an open combo follow normal node selection behavior. Multi-select with Ctrl+click works across both proxies and regular nodes.

#### Scenario: clicking closed combo proxy selects it
- **WHEN** a user clicks on a closed combo proxy node
- **THEN** the combo proxy node ID is added to the `selections` array and the `onComboClick` callback is invoked

#### Scenario: clicking open combo container background selects combo
- **WHEN** a user clicks on the background of an open combo container (not on a member node)
- **THEN** the combo ID is added to the `selections` array and the `onComboClick` callback is invoked

#### Scenario: selecting combo highlights members via actives
- **WHEN** a combo is selected (its ID in `selections`)
- **THEN** all member nodes of that combo can be set as `actives` by the consumer via the callback

#### Scenario: ctrl-click adds to multi-selection
- **WHEN** a user Ctrl+clicks on a combo proxy while other nodes are already selected
- **THEN** the proxy is added to the existing `selections` array without clearing previous selections

#### Scenario: clicking member node inside open combo
- **WHEN** a user clicks on a member node inside an open combo
- **THEN** standard node selection behavior applies; the member node ID is added to `selections`

### Requirement: combo-drag-containment
When a node inside an open combo has `draggable=true`, dragging is constrained to the combo container boundary. Circle containers use circular clamping; rectangle containers use rectangular clamping.

#### Scenario: drag within circle container
- **WHEN** a user drags a member node inside an open combo with `shape: 'circle'`
- **THEN** the node position is clamped to remain within the circle boundary (using radial distance clamping)

#### Scenario: drag within rectangle container
- **WHEN** a user drags a member node inside an open combo with `shape: 'rectangle'`
- **THEN** the node position is clamped to remain within the rectangle boundary (using axis-aligned min/max clamping)

#### Scenario: drag without combo
- **WHEN** a node is not inside any open combo
- **THEN** drag behavior is unchanged from the existing implementation (no containment)

#### Scenario: drag to container edge clamps position
- **WHEN** a user drags a member node to the edge of the combo container
- **THEN** the node stops at the container boundary and does not leave

### Requirement: combo-programmatic-api
GraphCanvasRef is extended with methods for programmatic combo control: `openCombo`, `closeCombo`, `toggleCombo`, `openAllCombos`, `closeAllCombos`, `isComboOpen`, and `getComboMembers`.

#### Scenario: openCombo programmatically opens a combo
- **WHEN** `graphRef.current.openCombo('combo-1')` is called
- **THEN** `'combo-1'` is moved from `collapsedComboIds` to `openComboIds` in the store, triggering an open transition

#### Scenario: closeCombo programmatically closes a combo
- **WHEN** `graphRef.current.closeCombo('combo-1')` is called
- **THEN** `'combo-1'` is moved from `openComboIds` to `collapsedComboIds` in the store, triggering a close transition

#### Scenario: toggleCombo toggles the state
- **WHEN** `graphRef.current.toggleCombo('combo-1')` is called and combo-1 is currently open
- **THEN** combo-1 is closed (moved to `collapsedComboIds`)

#### Scenario: openAllCombos opens every combo
- **WHEN** `graphRef.current.openAllCombos()` is called
- **THEN** all combo IDs from `comboDefinitions` are added to `openComboIds` and removed from `collapsedComboIds`

#### Scenario: closeAllCombos closes every combo
- **WHEN** `graphRef.current.closeAllCombos()` is called
- **THEN** all combo IDs from `comboDefinitions` are added to `collapsedComboIds` and removed from `openComboIds`

#### Scenario: isComboOpen returns current state
- **WHEN** `graphRef.current.isComboOpen('combo-1')` is called
- **THEN** it returns `true` if `'combo-1'` is in `openComboIds`, `false` otherwise

#### Scenario: getComboMembers returns member nodes
- **WHEN** `graphRef.current.getComboMembers('combo-1')` is called
- **THEN** it returns the array of `InternalGraphNode` objects whose IDs are in the combo's `memberNodeIds`

### Requirement: combo-hover-intent
Hovering over a combo (proxy or container) triggers hover events using the existing `useHoverIntent` pattern. Hover over a closed proxy highlights it; hover over an open container background highlights the container.

#### Scenario: hover over closed combo proxy
- **WHEN** a user hovers over a closed combo proxy node with intent
- **THEN** the `onComboPointerOver` callback is invoked and the proxy can be highlighted via `actives`

#### Scenario: hover over open combo container
- **WHEN** a user hovers over an open combo container background with intent
- **THEN** the `onComboPointerOver` callback is invoked and the container can be highlighted

#### Scenario: pointer leaves combo
- **WHEN** the pointer leaves a combo proxy or container
- **THEN** the `onComboPointerOut` callback is invoked

#### Scenario: accidental hover does not trigger
- **WHEN** the pointer quickly passes over a combo without intent
- **THEN** no hover callbacks are invoked (useHoverIntent filters accidental hovers)

### Requirement: combo-event-props-on-graph-canvas
GraphCanvas and GraphScene accept new optional callback props for combo interactions: `onComboClick`, `onComboDoubleClick`, `onComboContextMenu`, `onComboPointerOver`, `onComboPointerOut`. These are threaded from GraphCanvas through GraphScene to ComboContainer and proxy node components.

#### Scenario: combo event props passed to GraphCanvas
- **WHEN** the consumer renders `<GraphCanvas onComboClick={...} onComboDoubleClick={...} onComboContextMenu={...} />`
- **THEN** the callbacks are propagated through GraphScene to the relevant combo components

#### Scenario: combo event props optional
- **WHEN** the consumer does not provide any combo event props
- **THEN** combo interactions still work (double-click, hover) but no external callbacks are invoked

#### Scenario: event props receive combo ID and event
- **WHEN** any combo event callback is invoked
- **THEN** it receives at minimum `(comboId: string, event: ThreeEvent<MouseEvent>)` as arguments

### Requirement: comprehensive-storybook-demo-coverage
The combo system provides a comprehensive set of Storybook demo stories in `stories/demos/Combo.story.tsx` demonstrating all combo features individually and in combination. Stories are organized into categories: basic usage (open/closed/mixed states, shapes), sub-layouts (all arrangement types plus tightness control), animation (open/close transitions), nesting (multi-level hierarchies), interactions (double-click, context menu, drag, selection, programmatic API), and showcase (real-world scenarios at scale).

#### Scenario: basic combo states demonstrated
- **WHEN** a developer navigates to the Demos/Combos section in Storybook
- **THEN** they find stories demonstrating all-closed combos with proxy nodes, all-open combos with containers, mixed open/closed state, circle shape, and rectangle shape

#### Scenario: sub-layout arrangements demonstrated
- **WHEN** a developer views the sub-layout stories
- **THEN** they find stories for concentric, grid, sequential (with direction controls), and lens arrangements, plus an interactive tightness slider showing real-time spacing changes

#### Scenario: animation transitions demonstrated
- **WHEN** a developer views the animation stories
- **THEN** they find stories with toggle buttons demonstrating smooth open/close transitions for single and multiple combos simultaneously

#### Scenario: nested combos demonstrated
- **WHEN** a developer views the nested stories
- **THEN** they find 2-level nesting, 3-level nesting, and partial-open nesting stories with layer-by-layer open controls

#### Scenario: interaction patterns demonstrated
- **WHEN** a developer views the interaction stories
- **THEN** they find stories demonstrating double-click toggle, context menu, drag containment, combo selection, and programmatic API access via `GraphCanvasRef`

#### Scenario: real-world showcase scenarios demonstrated
- **WHEN** a developer views the showcase stories
- **THEN** they find a network topology scenario (~50 nodes, nested offices/subnets), a social network scenario (person combos with post members), a data-driven combo creation scenario, and a large-scale performance scenario (200+ nodes, 20 combos, animated=false)

### Requirement: combo-unit-test-coverage
The combo system provides unit test suites covering all utility functions introduced in proposals 100–103. Tests validate happy paths, edge cases (empty inputs, single elements), error conditions (cycle detection), boundary conditions (3-level nesting), and algorithm correctness (sub-layout positions, transform outputs).

#### Scenario: combo tree resolution tests
- **WHEN** unit tests for `resolveComboTree` run
- **THEN** they validate: empty input returns empty, single combo at depth 0, multi-level nesting with correct depths, cycle detection throws error, childComboIds populated correctly

#### Scenario: combo node lookup tests
- **WHEN** unit tests for `getComboForNode` and `getComboAncestors` run
- **THEN** they validate: node found in combo returns correct combo, node not in any combo returns undefined, ancestor chain returns correct ordered array, top-level combo has empty ancestors

#### Scenario: closed combo transform tests
- **WHEN** unit tests for `transformCollapsedCombos` run
- **THEN** they validate: no collapsed combos returns unchanged data, proxy node injection, edge rerouting, intra-combo edge elimination, parallel edge aggregation with count metadata, empty combo edge case, self-loop elimination

#### Scenario: sub-layout algorithm tests
- **WHEN** unit tests for concentric, grid, sequential, and lens sub-layouts run
- **THEN** each validates: 0 nodes returns empty, 1 node at (0,0), correct placement patterns for N nodes, tightness scaling (loose > tight spacing), correct bounding box dimensions

#### Scenario: combo layout pipeline tests
- **WHEN** unit tests for `computeOpenComboSubLayouts` and `resolveComboPositions` run
- **THEN** they validate: no open combos returns empty, single open combo produces correct positions, nested combos compute bottom-up with correct world position composition

### Requirement: combo-test-data-fixtures
The combo system provides reusable typed test data fixtures in `stories/assets/comboDemo.ts` at four scale tiers: basic (15 nodes, 3 combos), nested (30 nodes, 6 combos in 2-level hierarchy), large (200+ nodes, 20 combos), and network topology (~50 nodes with nested office/subnet structure). Fixtures export `GraphNode[]`, `GraphEdge[]`, and `ComboDefinition[]` arrays for consumption by stories and tests.

#### Scenario: basic tier fixture available
- **WHEN** a story or test imports from `comboDemo.ts`
- **THEN** `basicComboNodes` (15 nodes), `basicComboEdges` (~20 edges), and `basicComboDefs` (3 flat combos) are available as typed exports

#### Scenario: nested tier fixture available
- **WHEN** a story or test imports nested data from `comboDemo.ts`
- **THEN** `nestedComboNodes` (30 nodes), `nestedComboEdges` (~40 edges), and `nestedComboDefs` (6 combos in 2-level hierarchy) are available

#### Scenario: large tier fixture available
- **WHEN** a story or test imports large-scale data from `comboDemo.ts`
- **THEN** `largeComboNodes` (200+ nodes), `largeComboEdges` (100+ edges), and `largeComboDefs` (20 combos) are available for performance testing

#### Scenario: network topology fixture available
- **WHEN** a story or test imports network data from `comboDemo.ts`
- **THEN** `networkNodes` (~50 device nodes), `networkEdges` (device connections), and `networkComboDefs` (3 offices with 2-3 subnets each, nested via parentComboId) are available
