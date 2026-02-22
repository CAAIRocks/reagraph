import { describe, expect, test } from 'vitest';

import { gridSubLayout } from './grid';

describe('gridSubLayout', () => {
  test('0 nodes returns empty', () => {
    const result = gridSubLayout({ nodeIds: [] });
    expect(result.positions.size).toBe(0);
    expect(result.boundingBox).toEqual({ width: 0, height: 0 });
  });

  test('1 node at origin', () => {
    const result = gridSubLayout({ nodeIds: ['a'] });
    expect(result.positions.get('a')).toEqual({ x: 0, y: 0 });
    expect(result.boundingBox).toEqual({ width: 0, height: 0 });
  });

  test('4 nodes in 2x2 grid centered at origin', () => {
    const result = gridSubLayout({ nodeIds: ['a', 'b', 'c', 'd'] });
    expect(result.positions.size).toBe(4);

    const positions = [...result.positions.values()];
    const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const avgY = positions.reduce((s, p) => s + p.y, 0) / positions.length;
    expect(avgX).toBeCloseTo(0, 5);
    expect(avgY).toBeCloseTo(0, 5);
  });

  test('7 nodes: non-square grid', () => {
    const ids = Array.from({ length: 7 }, (_, i) => `n${i}`);
    const result = gridSubLayout({ nodeIds: ids });
    expect(result.positions.size).toBe(7);
    expect(result.boundingBox.width).toBeGreaterThan(0);
    expect(result.boundingBox.height).toBeGreaterThan(0);
  });

  test('centering: min/max average near zero', () => {
    const ids = Array.from({ length: 9 }, (_, i) => `n${i}`);
    const result = gridSubLayout({ nodeIds: ids });
    const positions = [...result.positions.values()];
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(centerX).toBeCloseTo(0, 5);
    expect(centerY).toBeCloseTo(0, 5);
  });
});
