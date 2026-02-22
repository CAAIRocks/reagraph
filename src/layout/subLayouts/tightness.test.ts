import { describe, expect, test } from 'vitest';

import { concentricSubLayout } from './concentric';
import { gridSubLayout } from './grid';
import { lensSubLayout } from './lens';
import { sequentialSubLayout } from './sequential';
import { computeSpacing } from './types';

describe('computeSpacing', () => {
  test('tightness=5 returns 1x base', () => {
    expect(computeSpacing(30, 5)).toBeCloseTo(36, 5);
  });

  test('tightness=1 returns 2x base', () => {
    expect(computeSpacing(30, 1)).toBeCloseTo(60, 5);
  });

  test('tightness=10 returns 0.2x base', () => {
    expect(computeSpacing(30, 10)).toBeCloseTo(6, 5);
  });
});

function getBoundingArea(bb: { width: number; height: number }): number {
  return Math.max(bb.width, 1) * Math.max(bb.height, 1);
}

const ids = Array.from({ length: 10 }, (_, i) => `n${i}`);

describe('tightness across algorithms', () => {
  const algorithms = [
    { name: 'concentric', fn: concentricSubLayout },
    { name: 'grid', fn: gridSubLayout },
    { name: 'sequential', fn: sequentialSubLayout },
    { name: 'lens', fn: lensSubLayout }
  ] as const;

  for (const { name, fn } of algorithms) {
    test(`${name}: tightness=1 is wider than tightness=5`, () => {
      const loose = fn({ nodeIds: ids, tightness: 1 });
      const normal = fn({ nodeIds: ids, tightness: 5 });
      expect(getBoundingArea(loose.boundingBox)).toBeGreaterThan(
        getBoundingArea(normal.boundingBox)
      );
    });

    test(`${name}: tightness=10 is tighter than tightness=5`, () => {
      const normal = fn({ nodeIds: ids, tightness: 5 });
      const tight = fn({ nodeIds: ids, tightness: 10 });
      expect(getBoundingArea(tight.boundingBox)).toBeLessThan(
        getBoundingArea(normal.boundingBox)
      );
    });
  }
});

describe('edge cases across all algorithms', () => {
  const algorithms = [
    concentricSubLayout,
    gridSubLayout,
    sequentialSubLayout,
    lensSubLayout
  ];

  for (const fn of algorithms) {
    test(`${fn.name}: 0 nodes → empty positions and zero bounding box`, () => {
      const result = fn({ nodeIds: [] });
      expect(result.positions.size).toBe(0);
      expect(result.boundingBox).toEqual({ width: 0, height: 0 });
    });

    test(`${fn.name}: 1 node → at (0,0) with zero bounding box`, () => {
      const result = fn({ nodeIds: ['solo'] });
      expect(result.positions.get('solo')).toEqual({ x: 0, y: 0 });
      expect(result.boundingBox).toEqual({ width: 0, height: 0 });
    });
  }
});
