import type { SubLayoutFn, SubLayoutOutput } from './types';
import { computeBoundingBox, computeSpacing } from './types';

const BASE_SPACING = 40;

export const concentricSubLayout: SubLayoutFn = ({
  nodeIds,
  tightness = 5
}): SubLayoutOutput => {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodeIds.length === 0) {
    return { positions, boundingBox: { width: 0, height: 0 } };
  }

  if (nodeIds.length === 1) {
    positions.set(nodeIds[0], { x: 0, y: 0 });
    return { positions, boundingBox: { width: 0, height: 0 } };
  }

  const ringSpacing = computeSpacing(BASE_SPACING, tightness);
  const baseRadius = ringSpacing;
  const minNodeSpacing = ringSpacing * 0.8;

  let placed = 0;
  let ring = 0;

  while (placed < nodeIds.length) {
    const radius = baseRadius + ring * ringSpacing;
    const capacity = Math.max(
      1,
      Math.floor((2 * Math.PI * radius) / minNodeSpacing)
    );
    const count = Math.min(capacity, nodeIds.length - placed);

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      positions.set(nodeIds[placed], {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      });
      placed++;
    }

    ring++;
  }

  return { positions, boundingBox: computeBoundingBox(positions) };
};
