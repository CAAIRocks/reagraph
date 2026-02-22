import type { SubLayoutFn, SubLayoutOutput } from './types';
import { computeBoundingBox, computeSpacing } from './types';

const BASE_SPACING = 30;

export const gridSubLayout: SubLayoutFn = ({
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

  const cellSpacing = computeSpacing(BASE_SPACING, tightness);
  const cols = Math.ceil(Math.sqrt(nodeIds.length));
  const rows = Math.ceil(nodeIds.length / cols);

  for (let i = 0; i < nodeIds.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(nodeIds[i], {
      x: col * cellSpacing - ((cols - 1) * cellSpacing) / 2,
      y: row * cellSpacing - ((rows - 1) * cellSpacing) / 2
    });
  }

  return { positions, boundingBox: computeBoundingBox(positions) };
};
