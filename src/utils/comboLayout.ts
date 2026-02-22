import { concentricSubLayout } from '../layout/subLayouts/concentric';
import { gridSubLayout } from '../layout/subLayouts/grid';
import { lensSubLayout } from '../layout/subLayouts/lens';
import { sequentialSubLayout } from '../layout/subLayouts/sequential';
import type { SubLayoutFn } from '../layout/subLayouts/types';
import type { LayoutTypes } from '../layout/types';
import type {
  ComboContainerData,
  ComboDefinition,
  GraphEdge,
  GraphNode
} from '../types';
import type { CenterPositionVector } from './layout';

const FORCE_LAYOUT_TYPES: LayoutTypes[] = [
  'forceDirected2d',
  'forceDirected3d',
  'forceatlas2'
];

const DEFAULT_SUB_LAYOUT_MAP: Record<string, SubLayoutFn> = {
  concentric: concentricSubLayout,
  grid: gridSubLayout,
  sequential: sequentialSubLayout,
  lens: lensSubLayout
};

const DEFAULT_BODY_NODE_PADDING = 20;
const MAX_BODY_NODE_RADIUS = 500;

export interface SubLayoutResult {
  comboId: string;
  positions: Map<string, { x: number; y: number }>;
  boundingBox: { width: number; height: number };
  bodyNode: GraphNode;
}

export interface ComboSubLayoutOutput {
  outerNodes: GraphNode[];
  outerEdges: GraphEdge[];
  renderEdges: GraphEdge[];
  subLayoutResults: Map<string, SubLayoutResult>;
  effectiveOpenComboIds: string[];
  fallbackClosedComboIds: string[];
}

export interface ComboSubLayoutInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  comboDefinitions: ComboDefinition[];
  openComboIds: string[];
  layoutType?: LayoutTypes;
  bodyNodePadding?: number;
}

export function computeOpenComboSubLayouts(
  input: ComboSubLayoutInput
): ComboSubLayoutOutput {
  const {
    nodes,
    edges,
    comboDefinitions,
    openComboIds,
    layoutType,
    bodyNodePadding = DEFAULT_BODY_NODE_PADDING
  } = input;

  if (openComboIds.length === 0 || comboDefinitions.length === 0) {
    return {
      outerNodes: nodes,
      outerEdges: edges,
      renderEdges: edges,
      subLayoutResults: new Map(),
      effectiveOpenComboIds: [],
      fallbackClosedComboIds: []
    };
  }

  // Filter open combo IDs to only force-directed layouts
  const effectiveOpenComboIds: string[] = [];
  const fallbackClosedComboIds: string[] = [];

  for (const id of openComboIds) {
    if (!layoutType || FORCE_LAYOUT_TYPES.includes(layoutType)) {
      effectiveOpenComboIds.push(id);
    } else {
      console.warn(
        `[reagraph] Open combo "${id}" is not supported with layout type "${layoutType}". Treating as closed.`
      );
      fallbackClosedComboIds.push(id);
    }
  }

  if (effectiveOpenComboIds.length === 0) {
    return {
      outerNodes: nodes,
      outerEdges: edges,
      renderEdges: edges,
      subLayoutResults: new Map(),
      effectiveOpenComboIds: [],
      fallbackClosedComboIds
    };
  }

  // Build lookups
  const comboDefMap = new Map<string, ComboDefinition>();
  for (const combo of comboDefinitions) {
    comboDefMap.set(combo.id, combo);
  }

  const openComboSet = new Set(effectiveOpenComboIds);
  const memberToCombo = new Map<string, string>();
  const comboMembers = new Map<string, string[]>();

  for (const comboId of effectiveOpenComboIds) {
    const combo = comboDefMap.get(comboId);
    if (!combo) continue;
    const memberIds: string[] = [];
    for (const nodeId of combo.memberNodeIds) {
      // Only map nodes that actually exist in input
      if (nodes.some(n => n.id === nodeId)) {
        memberToCombo.set(nodeId, comboId);
        memberIds.push(nodeId);
      }
    }
    comboMembers.set(comboId, memberIds);
  }

  // Phase 1: Run sub-layouts for each open combo
  const subLayoutResults = new Map<string, SubLayoutResult>();

  for (const comboId of effectiveOpenComboIds) {
    const combo = comboDefMap.get(comboId);
    if (!combo) continue;

    const memberIds = comboMembers.get(comboId) ?? [];
    if (memberIds.length === 0) continue;

    const subLayoutFn =
      DEFAULT_SUB_LAYOUT_MAP[combo.arrangement ?? 'concentric'] ??
      concentricSubLayout;

    const result = subLayoutFn({
      nodeIds: memberIds,
      tightness: combo.tightness,
      direction: combo.arrangementDirection
    });

    const rawRadius =
      Math.max(result.boundingBox.width, result.boundingBox.height) / 2 +
      bodyNodePadding;
    const bodyRadius = Math.min(rawRadius, MAX_BODY_NODE_RADIUS);

    const bodyNode: GraphNode = {
      id: `combo-body-${comboId}`,
      label: combo.label ?? comboId,
      size: bodyRadius,
      data: {
        isComboBody: true,
        comboId,
        memberCount: memberIds.length,
        memberNodeIds: [...memberIds]
      }
    };

    subLayoutResults.set(comboId, {
      comboId,
      positions: result.positions,
      boundingBox: result.boundingBox,
      bodyNode
    });
  }

  // Build outer nodes: non-member nodes + body nodes
  const outerNodes: GraphNode[] = [];
  for (const node of nodes) {
    if (!memberToCombo.has(node.id)) {
      outerNodes.push(node);
    }
  }
  for (const result of subLayoutResults.values()) {
    outerNodes.push(result.bodyNode);
  }

  // Build shadow edges for outer layout + render edges
  const renderEdges: GraphEdge[] = [...edges];
  const shadowEdgeMap = new Map<string, GraphEdge>();

  for (const edge of edges) {
    const sourceCombo = memberToCombo.get(edge.source);
    const targetCombo = memberToCombo.get(edge.target);

    // Both in same open combo → intra-combo, skip from outer
    if (
      sourceCombo &&
      targetCombo &&
      sourceCombo === targetCombo &&
      openComboSet.has(sourceCombo)
    ) {
      continue;
    }

    const newSource = sourceCombo ? `combo-body-${sourceCombo}` : edge.source;
    const newTarget = targetCombo ? `combo-body-${targetCombo}` : edge.target;

    // Deduplicate by body-pair key
    const sortedKey = [newSource, newTarget].sort().join('-');
    const existing = shadowEdgeMap.get(sortedKey);

    if (existing) {
      // Increment count for force weight
      existing.data = {
        ...existing.data,
        count: (existing.data?.count ?? 1) + 1
      };
    } else {
      shadowEdgeMap.set(sortedKey, {
        id: `shadow-${edge.id}`,
        source: newSource,
        target: newTarget,
        data: {
          isShadow: true,
          originalEdgeId: edge.id,
          count: 1
        }
      });
    }
  }

  const outerEdges = Array.from(shadowEdgeMap.values());
  // Also include edges between non-member nodes as-is
  for (const edge of edges) {
    const sourceCombo = memberToCombo.get(edge.source);
    const targetCombo = memberToCombo.get(edge.target);
    if (!sourceCombo && !targetCombo) {
      // Neither endpoint in an open combo — pass through directly
      // But check it's not already covered by a shadow edge
      if (!outerEdges.some(e => e.id === edge.id)) {
        outerEdges.push(edge);
      }
    }
  }

  return {
    outerNodes,
    outerEdges,
    renderEdges,
    subLayoutResults,
    effectiveOpenComboIds,
    fallbackClosedComboIds
  };
}

export interface PositionResolutionInput {
  outerLayoutPositions: Map<string, { x: number; y: number; z: number }>;
  subLayoutResults: Map<string, SubLayoutResult>;
  nonMemberNodes: GraphNode[];
  renderEdges: GraphEdge[];
  comboDefinitions: ComboDefinition[];
  openComboIds: string[];
  bodyNodePadding?: number;
}

export interface PositionResolutionOutput {
  resolvedNodes: GraphNode[];
  resolvedEdges: GraphEdge[];
  comboContainers: Map<string, ComboContainerData>;
}

export function resolveComboPositions(
  input: PositionResolutionInput
): PositionResolutionOutput {
  const {
    outerLayoutPositions,
    subLayoutResults,
    nonMemberNodes,
    renderEdges,
    comboDefinitions,
    openComboIds,
    bodyNodePadding = DEFAULT_BODY_NODE_PADDING
  } = input;

  const comboDefMap = new Map<string, ComboDefinition>();
  for (const combo of comboDefinitions) {
    comboDefMap.set(combo.id, combo);
  }

  const resolvedNodes: GraphNode[] = [...nonMemberNodes];
  const comboContainers = new Map<string, ComboContainerData>();

  for (const comboId of openComboIds) {
    const bodyNodeId = `combo-body-${comboId}`;
    const bodyPos = outerLayoutPositions.get(bodyNodeId);
    const subLayout = subLayoutResults.get(comboId);
    const combo = comboDefMap.get(comboId);

    if (!bodyPos || !subLayout || !combo) continue;

    const memberWorldPositions = new Map<
      string,
      { x: number; y: number; z: number }
    >();

    for (const [memberId, localPos] of subLayout.positions) {
      const worldPos = {
        x: bodyPos.x + localPos.x,
        y: bodyPos.y + localPos.y,
        z: 1
      };

      resolvedNodes.push({
        id: memberId,
        fx: worldPos.x,
        fy: worldPos.y,
        fz: worldPos.z
      } as GraphNode);

      memberWorldPositions.set(memberId, worldPos);
    }

    const containerData = computeContainerFromWorldPositions({
      comboId,
      comboDefinition: combo,
      memberPositions: memberWorldPositions,
      padding: bodyNodePadding
    });

    comboContainers.set(comboId, containerData);
  }

  return {
    resolvedNodes,
    resolvedEdges: renderEdges,
    comboContainers
  };
}

export function computeContainerFromWorldPositions(input: {
  comboId: string;
  comboDefinition: ComboDefinition;
  memberPositions: Map<string, { x: number; y: number; z: number }>;
  padding: number;
}): ComboContainerData {
  const { comboId, comboDefinition, memberPositions, padding } = input;
  const positions = Array.from(memberPositions.values());

  if (positions.length === 0) {
    return {
      comboId,
      center: { x: 0, y: 0, z: -1 },
      boundingBox: {
        x: 0,
        y: 0,
        z: -1,
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        minZ: -1,
        maxZ: -1,
        width: 0,
        height: 0
      } as CenterPositionVector,
      shape: comboDefinition.shape ?? 'circle',
      memberNodeIds: []
    };
  }

  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: -1
  };

  const shape = comboDefinition.shape ?? 'circle';
  const radius =
    shape === 'circle' ? Math.max(width, height) / 2 + padding : undefined;

  return {
    comboId,
    center,
    boundingBox: {
      x: center.x,
      y: center.y,
      z: -1,
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      minZ: -1,
      maxZ: -1,
      width,
      height
    } as CenterPositionVector,
    shape,
    radius,
    width: shape === 'rectangle' ? width : undefined,
    height: shape === 'rectangle' ? height : undefined,
    memberNodeIds: Array.from(memberPositions.keys())
  };
}
