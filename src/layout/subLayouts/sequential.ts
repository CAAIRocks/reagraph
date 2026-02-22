import type { SubLayoutFn, SubLayoutOutput } from './types';
import { computeBoundingBox, computeSpacing } from './types';

const BASE_SPACING = 30;

export const sequentialSubLayout: SubLayoutFn = ({
  nodeIds,
  tightness = 5,
  direction = 'right'
}): SubLayoutOutput => {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodeIds.length === 0) {
    return { positions, boundingBox: { width: 0, height: 0 } };
  }

  if (nodeIds.length === 1) {
    positions.set(nodeIds[0], { x: 0, y: 0 });
    return { positions, boundingBox: { width: 0, height: 0 } };
  }

  const nodeSpacing = computeSpacing(BASE_SPACING, tightness);
  const totalLength = (nodeIds.length - 1) * nodeSpacing;

  for (let i = 0; i < nodeIds.length; i++) {
    const offset = i * nodeSpacing - totalLength / 2;

    switch (direction) {
      case 'right':
        positions.set(nodeIds[i], { x: offset, y: 0 });
        break;
      case 'left':
        positions.set(nodeIds[i], { x: -offset, y: 0 });
        break;
      case 'down':
        positions.set(nodeIds[i], { x: 0, y: offset });
        break;
      case 'up':
        positions.set(nodeIds[i], { x: 0, y: -offset });
        break;
    }
  }

  return { positions, boundingBox: computeBoundingBox(positions) };
};
