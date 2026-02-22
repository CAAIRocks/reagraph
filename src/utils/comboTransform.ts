import type { DragReferences } from '../store';
import type {
  ComboDefinition,
  GraphEdge,
  GraphNode,
  InternalGraphNode
} from '../types';

export interface ComboTransformInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  comboDefinitions: ComboDefinition[];
  collapsedComboIds: string[];
  dragReferences?: DragReferences;
}

export interface ComboTransformOutput {
  transformedNodes: GraphNode[];
  transformedEdges: GraphEdge[];
}

export function computeCentroid(
  memberNodeIds: string[],
  nodes: InternalGraphNode[] | GraphNode[],
  dragReferences?: DragReferences
): { x: number; y: number; z: number } | undefined {
  const positions: { x: number; y: number; z: number }[] = [];

  for (const id of memberNodeIds) {
    const dragNode = dragReferences?.[id];
    if (dragNode?.position) {
      positions.push({
        x: dragNode.position.x,
        y: dragNode.position.y,
        z: dragNode.position.z
      });
      continue;
    }
    const node = nodes.find(n => n.id === id) as InternalGraphNode | undefined;
    if (node?.position) {
      positions.push({
        x: node.position.x ?? 0,
        y: node.position.y ?? 0,
        z: node.position.z ?? 0
      });
    }
  }

  if (positions.length === 0) return undefined;

  const sum = positions.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: sum.x / positions.length,
    y: sum.y / positions.length,
    z: sum.z / positions.length
  };
}

export function transformCollapsedCombos(
  input: ComboTransformInput
): ComboTransformOutput {
  const { nodes, edges, comboDefinitions, collapsedComboIds, dragReferences } =
    input;

  if (collapsedComboIds.length === 0 || comboDefinitions.length === 0) {
    return { transformedNodes: nodes, transformedEdges: edges };
  }

  // Step 1: Build lookup structures
  const memberToCombo = new Map<string, string>();
  const collapsedComboSet = new Set(collapsedComboIds);
  const comboDefMap = new Map<string, ComboDefinition>();

  for (const combo of comboDefinitions) {
    comboDefMap.set(combo.id, combo);
    if (collapsedComboSet.has(combo.id)) {
      for (const nodeId of combo.memberNodeIds) {
        memberToCombo.set(nodeId, combo.id);
      }
    }
  }

  // Step 2: Filter nodes and inject proxies
  const transformedNodes: GraphNode[] = nodes.filter(
    n => !memberToCombo.has(n.id)
  );

  for (const comboId of collapsedComboIds) {
    const combo = comboDefMap.get(comboId);
    if (!combo) continue;

    const proxyNodeId = `combo-proxy-${comboId}`;
    const memberCount = combo.memberNodeIds.length;

    const dragNode = dragReferences?.[proxyNodeId];
    let fx: number | undefined;
    let fy: number | undefined;
    let fz: number | undefined;

    if (dragNode?.position) {
      fx = dragNode.position.x;
      fy = dragNode.position.y;
      fz = dragNode.position.z;
    } else {
      const centroid = computeCentroid(
        combo.memberNodeIds,
        nodes,
        dragReferences
      );
      if (centroid) {
        fx = centroid.x;
        fy = centroid.y;
        fz = centroid.z;
      }
    }

    const proxyNode: GraphNode = {
      id: proxyNodeId,
      label: combo.label,
      size: 7 + Math.log2(memberCount) * 3,
      fill: combo.data?.fill,
      fx,
      fy,
      fz,
      data: {
        isCombo: true,
        comboId,
        memberCount,
        memberNodeIds: [...combo.memberNodeIds],
        originalCombo: combo
      }
    };

    transformedNodes.push(proxyNode);
  }

  // Step 3: Remap edges
  const remappedEdges: GraphEdge[] = [];

  for (const edge of edges) {
    const newSource = memberToCombo.has(edge.source)
      ? `combo-proxy-${memberToCombo.get(edge.source)}`
      : edge.source;
    const newTarget = memberToCombo.has(edge.target)
      ? `combo-proxy-${memberToCombo.get(edge.target)}`
      : edge.target;

    if (newSource === newTarget) continue;

    remappedEdges.push({ ...edge, source: newSource, target: newTarget });
  }

  // Step 4: Deduplicate parallel edges
  const edgeGroups = new Map<string, GraphEdge[]>();

  for (const edge of remappedEdges) {
    const key = `${edge.source}->${edge.target}`;
    const group = edgeGroups.get(key);
    if (group) {
      group.push(edge);
    } else {
      edgeGroups.set(key, [edge]);
    }
  }

  const transformedEdges: GraphEdge[] = [];

  for (const [, group] of edgeGroups) {
    if (group.length === 1) {
      transformedEdges.push(group[0]);
    } else {
      const first = group[0];
      const baseSize = first.size ?? 1;
      transformedEdges.push({
        ...first,
        label: `${group.length} edges`,
        size: baseSize + group.length * baseSize * 0.5,
        data: {
          originalEdges: group,
          count: group.length,
          isAggregated: true
        }
      });
    }
  }

  return { transformedNodes, transformedEdges };
}
