import { describe, expect, test } from 'vitest';

import { concentricSubLayout } from './concentric';

describe('concentricSubLayout', () => {
  test('0 nodes returns empty', () => {
    const result = concentricSubLayout({ nodeIds: [] });
    expect(result.positions.size).toBe(0);
    expect(result.boundingBox).toEqual({ width: 0, height: 0 });
  });

  test('1 node placed at origin', () => {
    const result = concentricSubLayout({ nodeIds: ['a'] });
    expect(result.positions.get('a')).toEqual({ x: 0, y: 0 });
    expect(result.boundingBox).toEqual({ width: 0, height: 0 });
  });

  test('3 nodes placed on single ring', () => {
    const result = concentricSubLayout({ nodeIds: ['a', 'b', 'c'] });
    expect(result.positions.size).toBe(3);

    for (const pos of result.positions.values()) {
      const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
      expect(dist).toBeGreaterThan(0);
    }

    expect(result.boundingBox.width).toBeGreaterThan(0);
    expect(result.boundingBox.height).toBeGreaterThan(0);
  });

  test('20 nodes form multiple rings', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `n${i}`);
    const result = concentricSubLayout({ nodeIds: ids });
    expect(result.positions.size).toBe(20);

    const distances = new Set<number>();
    for (const pos of result.positions.values()) {
      distances.add(Math.round(Math.sqrt(pos.x ** 2 + pos.y ** 2)));
    }
    expect(distances.size).toBeGreaterThan(1);
  });

  test('all returned IDs match input', () => {
    const ids = ['x', 'y', 'z'];
    const result = concentricSubLayout({ nodeIds: ids });
    expect([...result.positions.keys()].sort()).toEqual(['x', 'y', 'z']);
  });
});
