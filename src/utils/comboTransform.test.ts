import { describe, expect, test } from 'vitest';

import type { DragReferences } from '../store';
import type {
  ComboDefinition,
  GraphEdge,
  GraphNode,
  InternalGraphNode
} from '../types';
import { computeCentroid, transformCollapsedCombos } from './comboTransform';

function makeNode(id: string): GraphNode {
  return { id };
}

function makeInternalNode(id: string, x = 0, y = 0, z = 0): InternalGraphNode {
  return {
    id,
    position: { x, y, z, id, data: {}, links: [], index: 0, vx: 0, vy: 0 }
  } as InternalGraphNode;
}

function makeEdge(id: string, source: string, target: string): GraphEdge {
  return { id, source, target } as GraphEdge;
}

const nodes: GraphNode[] = [
  makeNode('n1'),
  makeNode('n2'),
  makeNode('n3'),
  makeNode('n4'),
  makeNode('n5')
];

const internalNodes: InternalGraphNode[] = [
  makeInternalNode('n1', 10, 0, 0),
  makeInternalNode('n2', 0, 10, 0),
  makeInternalNode('n3', 0, 0, 10),
  makeInternalNode('n4', 20, 20, 20),
  makeInternalNode('n5', 30, 30, 30)
];

const comboA: ComboDefinition = {
  id: 'A',
  label: 'Combo A',
  memberNodeIds: ['n1', 'n2', 'n3']
};

const comboB: ComboDefinition = {
  id: 'B',
  label: 'Combo B',
  memberNodeIds: ['n4', 'n5']
};

describe('transformCollapsedCombos', () => {
  test('no-op when collapsedComboIds is empty', () => {
    const edges = [makeEdge('e1', 'n1', 'n4')];
    const result = transformCollapsedCombos({
      nodes,
      edges,
      comboDefinitions: [comboA],
      collapsedComboIds: []
    });
    expect(result.transformedNodes).toBe(nodes);
    expect(result.transformedEdges).toBe(edges);
  });

  test('no-op when comboDefinitions is empty', () => {
    const edges = [makeEdge('e1', 'n1', 'n4')];
    const result = transformCollapsedCombos({
      nodes,
      edges,
      comboDefinitions: [],
      collapsedComboIds: ['A']
    });
    expect(result.transformedNodes).toBe(nodes);
    expect(result.transformedEdges).toBe(edges);
  });

  test('basic collapse: proxy injection', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A']
    });

    expect(result.transformedNodes).toHaveLength(3); // proxy + n4 + n5
    const proxy = result.transformedNodes.find(n => n.id === 'combo-proxy-A')!;
    expect(proxy).toBeDefined();
    expect(proxy.label).toBe('Combo A');
    expect(proxy.data.isCombo).toBe(true);
    expect(proxy.data.comboId).toBe('A');
    expect(proxy.data.memberCount).toBe(3);
    expect(proxy.data.memberNodeIds).toEqual(['n1', 'n2', 'n3']);

    const remainingIds = result.transformedNodes
      .map(n => n.id)
      .filter(id => id !== 'combo-proxy-A');
    expect(remainingIds).toContain('n4');
    expect(remainingIds).toContain('n5');
  });

  test('edge remapping: member to outside', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [makeEdge('e1', 'n1', 'n4')],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A']
    });

    expect(result.transformedEdges).toHaveLength(1);
    expect(result.transformedEdges[0].source).toBe('combo-proxy-A');
    expect(result.transformedEdges[0].target).toBe('n4');
  });

  test('edge remapping: outside to member', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [makeEdge('e1', 'n4', 'n2')],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A']
    });

    expect(result.transformedEdges).toHaveLength(1);
    expect(result.transformedEdges[0].source).toBe('n4');
    expect(result.transformedEdges[0].target).toBe('combo-proxy-A');
  });

  test('intra-combo edge elimination', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [makeEdge('e1', 'n1', 'n2')],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A']
    });

    expect(result.transformedEdges).toHaveLength(0);
  });

  test('self-loop after remap is dropped', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n1', 'n3')
      ],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A']
    });

    expect(result.transformedEdges).toHaveLength(0);
  });

  test('parallel edge aggregation', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [makeEdge('e1', 'n1', 'n4'), makeEdge('e2', 'n2', 'n4')],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A']
    });

    expect(result.transformedEdges).toHaveLength(1);
    const agg = result.transformedEdges[0];
    expect(agg.source).toBe('combo-proxy-A');
    expect(agg.target).toBe('n4');
    expect(agg.data.count).toBe(2);
    expect(agg.data.isAggregated).toBe(true);
    expect(agg.label).toBe('2 edges');
    expect(agg.data.originalEdges).toHaveLength(2);
  });

  test('multiple simultaneous combos', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [makeEdge('e1', 'n1', 'n4')],
      comboDefinitions: [comboA, comboB],
      collapsedComboIds: ['A', 'B']
    });

    expect(result.transformedNodes).toHaveLength(2); // two proxies
    expect(result.transformedNodes.map(n => n.id).sort()).toEqual([
      'combo-proxy-A',
      'combo-proxy-B'
    ]);

    expect(result.transformedEdges).toHaveLength(1);
    expect(result.transformedEdges[0].source).toBe('combo-proxy-A');
    expect(result.transformedEdges[0].target).toBe('combo-proxy-B');
  });

  test('edge between two different combos', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [makeEdge('e1', 'n2', 'n5')],
      comboDefinitions: [comboA, comboB],
      collapsedComboIds: ['A', 'B']
    });

    expect(result.transformedEdges).toHaveLength(1);
    expect(result.transformedEdges[0].source).toBe('combo-proxy-A');
    expect(result.transformedEdges[0].target).toBe('combo-proxy-B');
  });

  test('node not in any combo passes through', () => {
    const result = transformCollapsedCombos({
      nodes,
      edges: [],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A']
    });

    const n4 = result.transformedNodes.find(n => n.id === 'n4');
    expect(n4).toBeDefined();
    expect(n4).toBe(nodes[3]);
  });

  test('proxy node size formula', () => {
    const fourMemberCombo: ComboDefinition = {
      id: 'C',
      label: 'C',
      memberNodeIds: ['n1', 'n2', 'n3', 'n4']
    };
    const result = transformCollapsedCombos({
      nodes,
      edges: [],
      comboDefinitions: [fourMemberCombo],
      collapsedComboIds: ['C']
    });

    const proxy = result.transformedNodes.find(n => n.id === 'combo-proxy-C')!;
    expect(proxy.size).toBe(7 + Math.log2(4) * 3); // 13
  });

  test('position seeding from drag references for members', () => {
    const dragRefs: DragReferences = {
      n1: makeInternalNode('n1', 10, 0, 0),
      n2: makeInternalNode('n2', 0, 10, 0),
      n3: makeInternalNode('n3', 0, 0, 10)
    };

    const result = transformCollapsedCombos({
      nodes,
      edges: [],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A'],
      dragReferences: dragRefs
    });

    const proxy = result.transformedNodes.find(n => n.id === 'combo-proxy-A')!;
    expect(proxy.fx).toBeCloseTo(10 / 3);
    expect(proxy.fy).toBeCloseTo(10 / 3);
    expect(proxy.fz).toBeCloseTo(10 / 3);
  });

  test('position seeding from proxy drag reference', () => {
    const dragRefs: DragReferences = {
      'combo-proxy-A': makeInternalNode('combo-proxy-A', 99, 99, 99)
    };

    const result = transformCollapsedCombos({
      nodes,
      edges: [],
      comboDefinitions: [comboA],
      collapsedComboIds: ['A'],
      dragReferences: dragRefs
    });

    const proxy = result.transformedNodes.find(n => n.id === 'combo-proxy-A')!;
    expect(proxy.fx).toBe(99);
    expect(proxy.fy).toBe(99);
    expect(proxy.fz).toBe(99);
  });

  test('proxy fill from combo data', () => {
    const colorCombo: ComboDefinition = {
      id: 'D',
      label: 'D',
      memberNodeIds: ['n1'],
      data: { fill: '#ff0000' }
    };
    const result = transformCollapsedCombos({
      nodes,
      edges: [],
      comboDefinitions: [colorCombo],
      collapsedComboIds: ['D']
    });

    const proxy = result.transformedNodes.find(n => n.id === 'combo-proxy-D')!;
    expect(proxy.fill).toBe('#ff0000');
  });
});

describe('computeCentroid', () => {
  test('returns centroid of member positions from internal nodes', () => {
    const result = computeCentroid(['n1', 'n2', 'n3'], internalNodes);
    expect(result).toBeDefined();
    expect(result!.x).toBeCloseTo(10 / 3);
    expect(result!.y).toBeCloseTo(10 / 3);
    expect(result!.z).toBeCloseTo(10 / 3);
  });

  test('returns centroid from drag references', () => {
    const dragRefs: DragReferences = {
      n1: makeInternalNode('n1', 10, 0, 0),
      n2: makeInternalNode('n2', 0, 10, 0)
    };
    const result = computeCentroid(['n1', 'n2'], nodes, dragRefs);
    expect(result).toBeDefined();
    expect(result!.x).toBe(5);
    expect(result!.y).toBe(5);
    expect(result!.z).toBe(0);
  });

  test('returns undefined when no members found', () => {
    expect(computeCentroid(['unknown'], nodes)).toBeUndefined();
  });

  test('handles single internal node member', () => {
    const result = computeCentroid(['n4'], internalNodes);
    expect(result).toEqual({ x: 20, y: 20, z: 20 });
  });
});
