import { describe, expect, test } from 'vitest';

import { sequentialSubLayout } from './sequential';

describe('sequentialSubLayout', () => {
  test('0 nodes returns empty', () => {
    const result = sequentialSubLayout({ nodeIds: [] });
    expect(result.positions.size).toBe(0);
    expect(result.boundingBox).toEqual({ width: 0, height: 0 });
  });

  test('1 node at origin', () => {
    const result = sequentialSubLayout({ nodeIds: ['a'] });
    expect(result.positions.get('a')).toEqual({ x: 0, y: 0 });
  });

  test('right direction: y=0, x increasing', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const result = sequentialSubLayout({ nodeIds: ids, direction: 'right' });
    const positions = ids.map(id => result.positions.get(id)!);

    for (const p of positions) {
      expect(p.y).toBe(0);
    }
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].x).toBeGreaterThan(positions[i - 1].x);
    }
  });

  test('left direction: y=0, x decreasing', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const result = sequentialSubLayout({ nodeIds: ids, direction: 'left' });
    const positions = ids.map(id => result.positions.get(id)!);

    for (const p of positions) {
      expect(p.y).toBe(0);
    }
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].x).toBeLessThan(positions[i - 1].x);
    }
  });

  test('down direction: x=0, y increasing', () => {
    const ids = ['a', 'b', 'c'];
    const result = sequentialSubLayout({ nodeIds: ids, direction: 'down' });
    const positions = ids.map(id => result.positions.get(id)!);

    for (const p of positions) {
      expect(p.x).toBe(0);
    }
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].y).toBeGreaterThan(positions[i - 1].y);
    }
  });

  test('up direction: x=0, y decreasing', () => {
    const ids = ['a', 'b', 'c'];
    const result = sequentialSubLayout({ nodeIds: ids, direction: 'up' });
    const positions = ids.map(id => result.positions.get(id)!);

    for (const p of positions) {
      expect(p.x).toBe(0);
    }
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].y).toBeLessThan(positions[i - 1].y);
    }
  });

  test('centered: first and last equidistant from origin', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const result = sequentialSubLayout({ nodeIds: ids, direction: 'right' });
    const first = result.positions.get('a')!;
    const last = result.positions.get('e')!;
    expect(Math.abs(first.x) - Math.abs(last.x)).toBeCloseTo(0, 5);
  });
});
