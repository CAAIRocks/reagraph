import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PerspectiveCamera } from 'three';

import { getVisibleEntities } from './collapse';
import type { LayoutOverrides, LayoutStrategy, LayoutTypes } from './layout';
import { layoutProvider } from './layout';
import { tick } from './layout/layoutUtils';
import type { SizingType } from './sizing';
import type { DragReferences } from './store';
import { useStore } from './store';
import type { GraphEdge, GraphNode, InternalGraphNode } from './types';
import { calculateClusters } from './utils/cluster';
import {
  computeOpenComboSubLayouts,
  resolveComboPositions
} from './utils/comboLayout';
import { transformCollapsedCombos } from './utils/comboTransform';
import { buildGraph, transformGraph } from './utils/graph';
import type { LabelVisibilityType } from './utils/visibility';
import { calcLabelVisibility } from './utils/visibility';

export interface GraphInputs {
  nodes: GraphNode[];
  edges: GraphEdge[];
  collapsedNodeIds?: string[];
  layoutType?: LayoutTypes;
  sizingType?: SizingType;
  labelType?: LabelVisibilityType;
  sizingAttribute?: string;
  selections?: string[];
  actives?: string[];
  clusterAttribute?: string;
  defaultNodeSize?: number;
  minNodeSize?: number;
  maxNodeSize?: number;
  constrainDragging?: boolean;
  layoutOverrides?: LayoutOverrides;
}

export const useGraph = ({
  layoutType,
  sizingType,
  labelType,
  sizingAttribute,
  clusterAttribute,
  selections,
  nodes,
  edges,
  actives,
  collapsedNodeIds,
  defaultNodeSize,
  maxNodeSize,
  minNodeSize,
  layoutOverrides,
  constrainDragging
}: GraphInputs) => {
  const graph = useStore(state => state.graph);
  const clusters = useStore(state => state.clusters);
  const storedNodes = useStore(state => state.nodes);
  const setClusters = useStore(state => state.setClusters);
  const stateCollapsedNodeIds = useStore(state => state.collapsedNodeIds);
  const stateComboDefinitions = useStore(state => state.comboDefinitions);
  const stateCollapsedComboIds = useStore(state => state.collapsedComboIds);
  const stateOpenComboIds = useStore(state => state.openComboIds);
  const setComboContainers = useStore(state => state.setComboContainers);
  const setEdges = useStore(state => state.setEdges);
  const stateNodes = useStore(state => state.nodes);
  const setNodes = useStore(state => state.setNodes);
  const setSelections = useStore(state => state.setSelections);
  const setActives = useStore(state => state.setActives);
  const drags = useStore(state => state.drags);
  const setDrags = useStore(state => state.setDrags);
  const setCollapsedNodeIds = useStore(state => state.setCollapsedNodeIds);
  const layoutMounted = useRef<boolean>(false);
  const layout = useRef<LayoutStrategy | null>(null);
  const camera = useThree(state => state.camera) as PerspectiveCamera;
  const dragRef = useRef<DragReferences>(drags);
  const clustersRef = useRef<any>([]);

  // When a new node is added, remove the dragged position of the cluster nodes to put new node in the right place
  useEffect(() => {
    if (!clusterAttribute) {
      return;
    }

    const existedNodesIds = storedNodes.map(n => n.id);
    const newNode = nodes.find(n => !existedNodesIds.includes(n.id));
    if (newNode) {
      const clusterName = newNode.data[clusterAttribute];
      const cluster = clusters.get(clusterName);
      const drags = { ...dragRef.current };

      cluster?.nodes?.forEach(node => (drags[node.id] = undefined));

      dragRef.current = drags;
      setDrags(drags);
    }
  }, [storedNodes, nodes, clusterAttribute, clusters, setDrags]);

  // Calculate the visible entities
  const { visibleEdges, visibleNodes } = useMemo(
    () =>
      getVisibleEntities({
        collapsedIds: stateCollapsedNodeIds,
        nodes,
        edges
      }),
    [stateCollapsedNodeIds, nodes, edges]
  );

  // Apply combo collapse transform — replaces member nodes with proxies
  // Merge fallback closed combo IDs (open combos unsupported by current layout)
  const comboSubLayoutRef = useRef<ReturnType<
    typeof computeOpenComboSubLayouts
  > | null>(null);

  const { transformedNodes: comboNodes, transformedEdges: comboEdges } =
    useMemo(() => {
      // First pass: compute open combo sub-layouts to determine fallbacks
      const subLayoutOutput = computeOpenComboSubLayouts({
        nodes: visibleNodes,
        edges: visibleEdges,
        comboDefinitions: stateComboDefinitions,
        openComboIds: stateOpenComboIds,
        layoutType,
        bodyNodePadding: 20
      });

      // Merge fallback combo IDs with explicitly collapsed ones
      const effectiveCollapsedComboIds = [
        ...stateCollapsedComboIds,
        ...subLayoutOutput.fallbackClosedComboIds
      ];

      // Run closed combo transform with the effective collapsed set
      const closedResult = transformCollapsedCombos({
        nodes: visibleNodes,
        edges: visibleEdges,
        comboDefinitions: stateComboDefinitions,
        collapsedComboIds: effectiveCollapsedComboIds,
        dragReferences: dragRef.current
      });

      // If there are effective open combos, re-run sub-layout on the closed-transform output
      if (subLayoutOutput.effectiveOpenComboIds.length > 0) {
        const finalSubLayout = computeOpenComboSubLayouts({
          nodes: closedResult.transformedNodes,
          edges: closedResult.transformedEdges,
          comboDefinitions: stateComboDefinitions,
          openComboIds: subLayoutOutput.effectiveOpenComboIds,
          layoutType,
          bodyNodePadding: 20
        });

        comboSubLayoutRef.current = finalSubLayout;

        return {
          transformedNodes: finalSubLayout.outerNodes,
          transformedEdges: finalSubLayout.outerEdges
        };
      }

      comboSubLayoutRef.current = null;
      return closedResult;
    }, [
      visibleNodes,
      visibleEdges,
      stateComboDefinitions,
      stateCollapsedComboIds,
      stateOpenComboIds,
      layoutType
    ]);

  // Store node positions inside drags state
  const updateDrags = useCallback(
    (nodes: InternalGraphNode[]) => {
      const drags = { ...dragRef.current };
      nodes.forEach(node => (drags[node.id] = node));
      dragRef.current = drags;
      setDrags(drags);
    },
    [setDrags]
  );

  const updateLayout = useCallback(
    async (curLayout?: any) => {
      // Cache the layout provider
      layout.current =
        curLayout ||
        layoutProvider({
          ...layoutOverrides,
          type: layoutType,
          graph,
          drags: dragRef.current,
          clusters: clustersRef?.current,
          clusterAttribute
        });

      // Run the layout
      await tick(layout.current);

      const subLayoutData = comboSubLayoutRef.current;

      // Two-phase pipeline: resolve combo positions after outer layout
      if (subLayoutData && subLayoutData.effectiveOpenComboIds.length > 0) {
        // Extract outer layout positions from the layout engine
        const outerLayoutPositions = new Map<
          string,
          { x: number; y: number; z: number }
        >();
        graph.forEachNode(id => {
          const pos = layout.current.getNodePosition(id);
          if (pos) {
            outerLayoutPositions.set(id, {
              x: pos.x || 0,
              y: pos.y || 0,
              z: pos.z || 1
            });
          }
        });

        // Collect non-member nodes (nodes currently in the outer graph)
        const nonMemberNodeIds = new Set<string>();
        graph.forEachNode(id => {
          if (!id.startsWith('combo-body-')) {
            nonMemberNodeIds.add(id);
          }
        });

        const nonMemberNodes = visibleNodes.filter(n =>
          nonMemberNodeIds.has(n.id)
        );

        const resolution = resolveComboPositions({
          outerLayoutPositions,
          subLayoutResults: subLayoutData.subLayoutResults,
          nonMemberNodes,
          renderEdges: subLayoutData.renderEdges,
          comboDefinitions: stateComboDefinitions,
          openComboIds: subLayoutData.effectiveOpenComboIds,
          bodyNodePadding: 20
        });

        // Rebuild graph with resolved nodes (including combo members) for transformGraph
        buildGraph(graph, resolution.resolvedNodes, resolution.resolvedEdges);

        // Create a layout strategy that returns resolved positions
        const resolvedPositionMap = new Map<
          string,
          { x: number; y: number; z: number }
        >();

        // Non-member nodes: use positions from outer layout
        for (const [id, pos] of outerLayoutPositions) {
          if (!id.startsWith('combo-body-')) {
            resolvedPositionMap.set(id, pos);
          }
        }

        // Member nodes: use fx/fy/fz from resolved nodes
        for (const node of resolution.resolvedNodes) {
          if (node.fx !== undefined && node.fy !== undefined) {
            resolvedPositionMap.set(node.id, {
              x: node.fx,
              y: node.fy,
              z: node.fz ?? 1
            });
          }
        }

        const resolvedLayout: typeof layout.current = {
          step: () => true,
          getNodePosition: (id: string) => {
            const pos = resolvedPositionMap.get(id);
            if (pos) {
              return pos as any;
            }
            return layout.current.getNodePosition(id);
          }
        };

        const result = transformGraph({
          graph,
          layout: resolvedLayout,
          sizingType,
          labelType,
          sizingAttribute,
          maxNodeSize,
          minNodeSize,
          defaultNodeSize,
          clusterAttribute
        });

        // Filter out body nodes from rendered node list
        const filteredNodes = result.nodes.filter(
          n => !n.id.startsWith('combo-body-')
        );

        // Filter out shadow edges from rendered edge list
        const filteredEdges = result.edges.filter(e => !e.data?.isShadow);

        setEdges(filteredEdges);
        setNodes(filteredNodes);
        setComboContainers(resolution.comboContainers);

        const newClusters = calculateClusters({
          nodes: filteredNodes,
          clusterAttribute
        });
        setClusters(newClusters);

        if (clusterAttribute) {
          updateDrags(filteredNodes);
        }
      } else {
        // Standard single-pass layout — no open combos
        const result = transformGraph({
          graph,
          layout: layout.current,
          sizingType,
          labelType,
          sizingAttribute,
          maxNodeSize,
          minNodeSize,
          defaultNodeSize,
          clusterAttribute
        });

        const newClusters = calculateClusters({
          nodes: result.nodes,
          clusterAttribute
        });

        if (constrainDragging) {
          newClusters.forEach(cluster => {
            const prevCluster = clustersRef.current.get(cluster.label);
            if (prevCluster?.nodes.length === cluster.nodes.length) {
              cluster.position =
                clustersRef.current?.get(cluster.label)?.position ??
                cluster.position;
            }
          });
        }

        setEdges(result.edges);
        setNodes(result.nodes);
        setClusters(newClusters);
        setComboContainers(new Map());

        if (clusterAttribute) {
          updateDrags(result.nodes);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      layoutOverrides,
      layoutType,
      clusterAttribute,
      sizingType,
      labelType,
      sizingAttribute,
      maxNodeSize,
      minNodeSize,
      defaultNodeSize,
      setEdges,
      setNodes,
      setClusters,
      setComboContainers,
      stateComboDefinitions,
      visibleNodes
    ]
  );

  // Transient updates
  useEffect(() => {
    dragRef.current = drags;
  }, [drags, clusterAttribute, updateLayout]);

  // Transient cluster state
  useEffect(() => {
    clustersRef.current = clusters;
  }, [clusters]);

  useEffect(() => {
    // When the camera position/zoom changes, update the label visibility
    const nodes = stateNodes.map(node => ({
      ...node,
      labelVisible: calcLabelVisibility({
        nodeCount: stateNodes?.length,
        labelType,
        camera,
        nodePosition: node?.position
      })('node', node?.size)
    }));

    // Determine if the label visibility has changed
    const isVisibilityUpdated = nodes.some(
      (node, i) => node.labelVisible !== stateNodes[i].labelVisible
    );

    // Update the nodes if the label visibility has changed
    if (isVisibilityUpdated) {
      setNodes(nodes);
    }
  }, [camera, camera.zoom, camera.position.z, setNodes, stateNodes, labelType]);

  useEffect(() => {
    // Let's set the store selections so its easier to access
    if (layoutMounted.current) {
      setSelections(selections);
    }
  }, [selections, setSelections]);

  useEffect(() => {
    // Let's set the store actives so its easier to access
    if (layoutMounted.current) {
      setActives(actives);
    }
  }, [actives, setActives]);

  // Create the nggraph graph object
  useEffect(() => {
    async function update() {
      layoutMounted.current = false;
      buildGraph(graph, comboNodes, comboEdges);
      await updateLayout();
      // rqf to prevent race condition
      requestAnimationFrame(() => (layoutMounted.current = true));
    }

    update();
    // eslint-disable-next-line
  }, [comboNodes, comboEdges]);

  useEffect(() => {
    // Let's set the store collapsedNodeIds so its easier to access
    if (layoutMounted.current) {
      setCollapsedNodeIds(collapsedNodeIds);
    }
  }, [collapsedNodeIds, setCollapsedNodeIds]);

  // Update layout on type changes
  useEffect(() => {
    if (layoutMounted.current) {
      // When a update is changed, discard all the previous drag positions
      // NOTE: This sets the transient and the state
      dragRef.current = {};
      setDrags({});

      // Recalculate the layout
      updateLayout();
    }
  }, [layoutType, updateLayout, setDrags]);

  // Update layout on size, label changes
  useEffect(() => {
    if (layoutMounted.current) {
      updateLayout(layout.current);
    }
  }, [sizingType, sizingAttribute, labelType, updateLayout]);

  return {
    updateLayout
  };
};
