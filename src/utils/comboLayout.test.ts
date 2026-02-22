import { describe, expect, test, vi } from 'vitest';

import type { ComboDefinition, GraphEdge, GraphNode } from '../types';
import {
  computeContainerFromWorldPositions,
  computeOpenComboSubLayouts,
  resolveComboPositions
} from './comboLayout';

const mkNode = (id: string): GraphNode => ({ id, label: id });
const mkEdge = (id: string, source: string, target: string): GraphEdge => ({
  id,
  source,
  target
});

describe('computeOpenComboSubLayouts', () => {
  test('no-op when openComboIds is empty', () => {
    const nodes = [mkNode('a'), mkNode('b')];
    const edges = [mkEdge('e1', 'a', 'b')];
    const result = computeOpenComboSubLayouts({
      nodes,
      edges,
      comboDefinitions: [],
      openComboIds: [],
      layoutType: 'forceDirected2d'
    });
    expect(result.outerNodes).toBe(nodes);
    expect(result.outerEdges).toBe(edges);
    expect(result.subLayoutResults.size).toBe(0);
    expect(result.effectiveOpenComboIds).toEqual([]);
  });

  test('creates body node with correct ID and radius from bounding box', () => {
    const members = ['m1', 'm2', 'm3', 'm4', 'm5'].map(mkNode);
    const external = [mkNode('x1')];
    const nodes = [...members, ...external];
    const edges = [mkEdge('e1', 'x1', 'm1')];

    const combo: ComboDefinition = {
      id: 'combo-a',
      label: 'Combo A',
      memberNodeIds: ['m1', 'm2', 'm3', 'm4', 'm5'],
      arrangement: 'concentric'
    };

    const result = computeOpenComboSubLayouts({
      nodes,
      edges,
      comboDefinitions: [combo],
      openComboIds: ['combo-a'],
      layoutType: 'forceDirected2d'
    });

    expect(result.subLayoutResults.has('combo-a')).toBe(true);
    const subResult = result.subLayoutResults.get('combo-a')!;
    expect(subResult.bodyNode.id).toBe('combo-body-combo-a');
    expect(subResult.bodyNode.data.isComboBody).toBe(true);
    expect(subResult.bodyNode.data.comboId).toBe('combo-a');
    expect(subResult.bodyNode.data.memberCount).toBe(5);
    expect(subResult.bodyNode.size).toBeGreaterThan(0);

    // Body node should be in outer nodes
    expect(result.outerNodes.some(n => n.id === 'combo-body-combo-a')).toBe(
      true
    );
    // Members should not be in outer nodes
    expect(result.outerNodes.some(n => n.id === 'm1')).toBe(false);
    // External node should be in outer nodes
    expect(result.outerNodes.some(n => n.id === 'x1')).toBe(true);
  });

  test('body node radius = max(bb.width, bb.height)/2 + padding', () => {
    const nodes = [mkNode('m1'), mkNode('m2')];
    const combo: ComboDefinition = {
      id: 'c1',
      label: 'C1',
      memberNodeIds: ['m1', 'm2'],
      arrangement: 'sequential'
    };

    const result = computeOpenComboSubLayouts({
      nodes,
      edges: [],
      comboDefinitions: [combo],
      openComboIds: ['c1'],
      layoutType: 'forceDirected2d',
      bodyNodePadding: 20
    });

    const sub = result.subLayoutResults.get('c1')!;
    const expectedRadius = Math.min(
      Math.max(sub.boundingBox.width, sub.boundingBox.height) / 2 + 20,
      500
    );
    expect(sub.bodyNode.size).toBeCloseTo(expectedRadius, 5);
  });

  test('edge from external to combo member creates shadow edge to body node', () => {
    const nodes = [mkNode('m1'), mkNode('m2'), mkNode('x1')];
    const edges = [mkEdge('e1', 'x1', 'm1')];
    const combo: ComboDefinition = {
      id: 'c1',
      label: 'C1',
      memberNodeIds: ['m1', 'm2']
    };

    const result = computeOpenComboSubLayouts({
      nodes,
      edges,
      comboDefinitions: [combo],
      openComboIds: ['c1'],
      layoutType: 'forceDirected2d'
    });

    // Shadow edge exists from x1 to combo-body-c1
    const shadowEdge = result.outerEdges.find(
      e =>
        (e.source === 'x1' && e.target === 'combo-body-c1') ||
        (e.source === 'combo-body-c1' && e.target === 'x1')
    );
    expect(shadowEdge).toBeDefined();
    expect(shadowEdge!.data?.isShadow).toBe(true);

    // Original edge preserved in renderEdges
    expect(result.renderEdges.some(e => e.id === 'e1')).toBe(true);
  });

  test('intra-combo edges excluded from outerEdges but in renderEdges', () => {
    const nodes = [mkNode('m1'), mkNode('m2'), mkNode('x1')];
    const edges = [mkEdge('e-intra', 'm1', 'm2'), mkEdge('e-ext', 'x1', 'm1')];
    const combo: ComboDefinition = {
      id: 'c1',
      label: 'C1',
      memberNodeIds: ['m1', 'm2']
    };

    const result = computeOpenComboSubLayouts({
      nodes,
      edges,
      comboDefinitions: [combo],
      openComboIds: ['c1'],
      layoutType: 'forceDirected2d'
    });

    // Intra-combo edge not in outer edges
    const intraInOuter = result.outerEdges.find(
      e =>
        (e.source === 'm1' && e.target === 'm2') ||
        (e.source === 'm2' && e.target === 'm1')
    );
    expect(intraInOuter).toBeUndefined();

    // But present in renderEdges
    expect(result.renderEdges.some(e => e.id === 'e-intra')).toBe(true);
  });

  test('cross-combo edge creates shadow between body nodes', () => {
    const nodes = [mkNode('a1'), mkNode('b1'), mkNode('x1')];
    const edges = [mkEdge('e1', 'a1', 'b1')];
    const combos: ComboDefinition[] = [
      { id: 'ca', label: 'A', memberNodeIds: ['a1'] },
      { id: 'cb', label: 'B', memberNodeIds: ['b1'] }
    ];

    const result = computeOpenComboSubLayouts({
      nodes,
      edges,
      comboDefinitions: combos,
      openComboIds: ['ca', 'cb'],
      layoutType: 'forceDirected2d'
    });

    const shadow = result.outerEdges.find(
      e =>
        (e.source === 'combo-body-ca' && e.target === 'combo-body-cb') ||
        (e.source === 'combo-body-cb' && e.target === 'combo-body-ca')
    );
    expect(shadow).toBeDefined();
  });

  test('shadow edges deduplicated by body-pair key with count', () => {
    const nodes = [mkNode('a1'), mkNode('a2'), mkNode('b1'), mkNode('b2')];
    const edges = [
      mkEdge('e1', 'a1', 'b1'),
      mkEdge('e2', 'a1', 'b2'),
      mkEdge('e3', 'a2', 'b1')
    ];
    const combos: ComboDefinition[] = [
      { id: 'ca', label: 'A', memberNodeIds: ['a1', 'a2'] },
      { id: 'cb', label: 'B', memberNodeIds: ['b1', 'b2'] }
    ];

    const result = computeOpenComboSubLayouts({
      nodes,
      edges,
      comboDefinitions: combos,
      openComboIds: ['ca', 'cb'],
      layoutType: 'forceDirected2d'
    });

    const shadows = result.outerEdges.filter(
      e =>
        (e.source.startsWith('combo-body-') ||
          e.target.startsWith('combo-body-')) &&
        e.data?.isShadow
    );
    expect(shadows.length).toBe(1);
    expect(shadows[0].data.count).toBe(3);
  });

  test('layout type restriction: non-force layouts fall back to closed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nodes = [mkNode('m1'), mkNode('m2')];
    const combo: ComboDefinition = {
      id: 'c1',
      label: 'C1',
      memberNodeIds: ['m1', 'm2']
    };

    const result = computeOpenComboSubLayouts({
      nodes,
      edges: [],
      comboDefinitions: [combo],
      openComboIds: ['c1'],
      layoutType: 'hierarchicalTd'
    });

    expect(result.effectiveOpenComboIds).toEqual([]);
    expect(result.fallbackClosedComboIds).toEqual(['c1']);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('resolveComboPositions', () => {
  test('composes body position with local offset for world position', () => {
    const subLayoutResults = new Map([
      [
        'c1',
        {
          comboId: 'c1',
          positions: new Map([
            ['m1', { x: 10, y: 20 }],
            ['m2', { x: -5, y: 15 }]
          ]),
          boundingBox: { width: 15, height: 5 },
          bodyNode: { id: 'combo-body-c1', label: 'C1', size: 30 } as any
        }
      ]
    ]);

    const outerLayoutPositions = new Map([
      ['combo-body-c1', { x: 100, y: 50, z: 1 }],
      ['x1', { x: 200, y: 300, z: 1 }]
    ]);

    const result = resolveComboPositions({
      outerLayoutPositions,
      subLayoutResults,
      nonMemberNodes: [{ id: 'x1', label: 'X1' }],
      renderEdges: [],
      comboDefinitions: [
        { id: 'c1', label: 'C1', memberNodeIds: ['m1', 'm2'] }
      ],
      openComboIds: ['c1']
    });

    const m1 = result.resolvedNodes.find(n => n.id === 'm1');
    const m2 = result.resolvedNodes.find(n => n.id === 'm2');
    expect(m1).toBeDefined();
    expect(m1!.fx).toBe(110);
    expect(m1!.fy).toBe(70);
    expect(m2!.fx).toBe(95);
    expect(m2!.fy).toBe(65);

    // Non-member node preserved
    expect(result.resolvedNodes.some(n => n.id === 'x1')).toBe(true);

    // No body node in resolved nodes
    expect(result.resolvedNodes.some(n => n.id === 'combo-body-c1')).toBe(
      false
    );
  });

  test('generates correct container data', () => {
    const subLayoutResults = new Map([
      [
        'c1',
        {
          comboId: 'c1',
          positions: new Map([
            ['m1', { x: -10, y: -10 }],
            ['m2', { x: 10, y: -10 }],
            ['m3', { x: -10, y: 10 }],
            ['m4', { x: 10, y: 10 }]
          ]),
          boundingBox: { width: 20, height: 20 },
          bodyNode: { id: 'combo-body-c1', label: 'C1', size: 30 } as any
        }
      ]
    ]);

    const outerLayoutPositions = new Map([
      ['combo-body-c1', { x: 0, y: 0, z: 1 }]
    ]);

    const result = resolveComboPositions({
      outerLayoutPositions,
      subLayoutResults,
      nonMemberNodes: [],
      renderEdges: [],
      comboDefinitions: [
        {
          id: 'c1',
          label: 'C1',
          memberNodeIds: ['m1', 'm2', 'm3', 'm4'],
          shape: 'circle'
        }
      ],
      openComboIds: ['c1'],
      bodyNodePadding: 20
    });

    const container = result.comboContainers.get('c1');
    expect(container).toBeDefined();
    expect(container!.comboId).toBe('c1');
    expect(container!.center.x).toBeCloseTo(0, 5);
    expect(container!.center.y).toBeCloseTo(0, 5);
    expect(container!.shape).toBe('circle');
    expect(container!.memberNodeIds).toHaveLength(4);
    expect(container!.boundingBox.width).toBeGreaterThan(0);
    expect(container!.boundingBox.height).toBeGreaterThan(0);
  });
});

describe('computeContainerFromWorldPositions', () => {
  test('computes correct bounds and center from member positions', () => {
    const memberPositions = new Map([
      ['m1', { x: 0, y: 0, z: 1 }],
      ['m2', { x: 100, y: 0, z: 1 }],
      ['m3', { x: 0, y: 100, z: 1 }],
      ['m4', { x: 100, y: 100, z: 1 }]
    ]);

    const container = computeContainerFromWorldPositions({
      comboId: 'c1',
      comboDefinition: {
        id: 'c1',
        label: 'C1',
        memberNodeIds: ['m1', 'm2', 'm3', 'm4'],
        shape: 'rectangle'
      },
      memberPositions,
      padding: 10
    });

    expect(container.center.x).toBe(50);
    expect(container.center.y).toBe(50);
    expect(container.boundingBox.width).toBe(120); // 100 + 2*10
    expect(container.boundingBox.height).toBe(120);
    expect(container.shape).toBe('rectangle');
    expect(container.width).toBe(120);
    expect(container.height).toBe(120);
  });

  test('handles empty member positions', () => {
    const container = computeContainerFromWorldPositions({
      comboId: 'empty',
      comboDefinition: {
        id: 'empty',
        label: 'Empty',
        memberNodeIds: []
      },
      memberPositions: new Map(),
      padding: 20
    });

    expect(container.center.x).toBe(0);
    expect(container.center.y).toBe(0);
    expect(container.memberNodeIds).toHaveLength(0);
  });
});
