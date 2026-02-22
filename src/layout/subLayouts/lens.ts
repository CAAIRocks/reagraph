import type { SubLayoutFn, SubLayoutOutput } from './types';
import { computeBoundingBox, computeSpacing } from './types';

const BASE_SPACING = 35;

export const lensSubLayout: SubLayoutFn = ({
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

  const radialIncrement = computeSpacing(BASE_SPACING, tightness);

  for (let i = 0; i < nodeIds.length; i++) {
    const angle = (2 * Math.PI * i) / nodeIds.length;
    const distance = radialIncrement * Math.sqrt(i + 1);
    positions.set(nodeIds[i], {
      x: distance * Math.cos(angle),
      y: distance * Math.sin(angle)
    });
  }

  return { positions, boundingBox: computeBoundingBox(positions) };
};
