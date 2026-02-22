import { describe, expect, test } from 'vitest';

import type { ComboDefinition } from '../types';
import { getComboAncestors, getComboForNode, resolveComboTree } from './combo';

const combos: ComboDefinition[] = [
  { id: 'a', label: 'Combo A', memberNodeIds: ['n1', 'n2'] },
  { id: 'b', label: 'Combo B', memberNodeIds: ['n3'] },
  {
    id: 'c',
    label: 'Combo C',
    memberNodeIds: ['n4', 'n5'],
    parentComboId: 'a'
  },
  { id: 'd', label: 'Combo D', memberNodeIds: ['n6'], parentComboId: 'c' }
];

describe('resolveComboTree', () => {
  test('flat combos - all depth 0, empty childComboIds', () => {
    const flat: ComboDefinition[] = [
      { id: 'x', label: 'X', memberNodeIds: ['n1'] },
      { id: 'y', label: 'Y', memberNodeIds: ['n2'] }
    ];
    const result = resolveComboTree(flat);
    expect(result).toHaveLength(2);
    expect(result[0].depth).toBe(0);
    expect(result[0].childComboIds).toEqual([]);
    expect(result[1].depth).toBe(0);
    expect(result[1].childComboIds).toEqual([]);
  });

  test('nested combos - correct depth and childComboIds', () => {
    const result = resolveComboTree(combos);
    const map = new Map(result.map(c => [c.id, c]));

    expect(map.get('a')!.depth).toBe(0);
    expect(map.get('a')!.childComboIds).toEqual(['c']);

    expect(map.get('b')!.depth).toBe(0);
    expect(map.get('b')!.childComboIds).toEqual([]);

    expect(map.get('c')!.depth).toBe(1);
    expect(map.get('c')!.childComboIds).toEqual(['d']);

    expect(map.get('d')!.depth).toBe(2);
    expect(map.get('d')!.childComboIds).toEqual([]);

    for (const combo of result) {
      expect(combo.collapsed).toBe(false);
      expect(combo.open).toBe(true);
      expect(combo.proxyNodeId).toBeUndefined();
    }
  });

  test('cycle detection - throws error', () => {
    const cyclic: ComboDefinition[] = [
      { id: 'x', label: 'X', memberNodeIds: [], parentComboId: 'y' },
      { id: 'y', label: 'Y', memberNodeIds: [], parentComboId: 'x' }
    ];
    expect(() => resolveComboTree(cyclic)).toThrow(
      /Cycle detected in combo hierarchy/
    );
  });

  test('empty input - returns empty array', () => {
    expect(resolveComboTree([])).toEqual([]);
  });
});

describe('getComboForNode', () => {
  test('returns correct combo for node', () => {
    expect(getComboForNode('n4', combos)?.id).toBe('c');
    expect(getComboForNode('n1', combos)?.id).toBe('a');
  });

  test('returns undefined for unknown node', () => {
    expect(getComboForNode('unknown', combos)).toBeUndefined();
  });
});

describe('getComboAncestors', () => {
  test('returns ordered ancestor chain', () => {
    expect(getComboAncestors('d', combos)).toEqual(['c', 'a']);
    expect(getComboAncestors('c', combos)).toEqual(['a']);
  });

  test('returns empty array for top-level combo', () => {
    expect(getComboAncestors('a', combos)).toEqual([]);
    expect(getComboAncestors('b', combos)).toEqual([]);
  });
});
