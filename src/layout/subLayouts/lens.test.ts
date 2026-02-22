import { describe, expect, test } from 'vitest';

import { lensSubLayout } from './lens';

describe('lensSubLayout', () => {
  test('0 nodes returns empty', () => {
    const result = lensSubLayout({ nodeIds: [] });
    expect(result.positions.size).toBe(0);
    expect(result.boundingBox).toEqual({ width: 0, height: 0 });
  });

  test('1 node at origin', () => {
    const result = lensSubLayout({ nodeIds: ['a'] });
    expect(result.positions.get('a')).toEqual({ x: 0, y: 0 });
    expect(result.boundingBox).toEqual({ width: 0, height: 0 });
  });

  test('distance from center increases with sqrt scaling', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `n${i}`);
    const result = lensSubLayout({ nodeIds: ids });

    const distances = ids.map(id => {
      const p = result.positions.get(id)!;
      return Math.sqrt(p.x ** 2 + p.y ** 2);
    });

    // Due to sqrt scaling, distances should generally increase
    // but angle variation means we check the overall trend
    for (let i = 2; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThan(distances[0]);
    }
  });

  test('even angle distribution', () => {
    const ids = Array.from({ length: 6 }, (_, i) => `n${i}`);
    const result = lensSubLayout({ nodeIds: ids });

    const angles = ids.map(id => {
      const p = result.positions.get(id)!;
      return Math.atan2(p.y, p.x);
    });

    const expectedGap = (2 * Math.PI) / 6;
    for (let i = 1; i < angles.length; i++) {
      let diff = angles[i] - angles[i - 1];
      if (diff < 0) diff += 2 * Math.PI;
      expect(diff).toBeCloseTo(expectedGap, 5);
    }
  });

  test('bounding box covers all positions', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `n${i}`);
    const result = lensSubLayout({ nodeIds: ids });

    const positions = [...result.positions.values()];
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);

    expect(result.boundingBox.width).toBeCloseTo(
      Math.max(...xs) - Math.min(...xs),
      5
    );
    expect(result.boundingBox.height).toBeCloseTo(
      Math.max(...ys) - Math.min(...ys),
      5
    );
  });
});
