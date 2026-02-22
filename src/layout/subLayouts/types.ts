export interface SubLayoutInput {
  /** Node IDs to arrange. Order may influence placement (e.g., concentric inner ring). */
  nodeIds: string[];
  /** Spacing tightness: 1 (very loose) to 10 (very tight). Default: 5. */
  tightness?: number;
  /** Direction for sequential layout only. Default: 'right'. */
  direction?: 'right' | 'down' | 'left' | 'up';
}

export interface SubLayoutOutput {
  /** Local coordinates for each node (center = 0,0). */
  positions: Map<string, { x: number; y: number }>;
  /** Bounding box of all placed positions. */
  boundingBox: { width: number; height: number };
}

/** A sub-layout algorithm: pure function from input to positioned output. */
export type SubLayoutFn = (input: SubLayoutInput) => SubLayoutOutput;

/**
 * Compute the bounding box of a set of positions.
 */
export function computeBoundingBox(
  positions: Map<string, { x: number; y: number }>
): { width: number; height: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const { x, y } of positions.values()) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return {
    width: positions.size > 0 ? maxX - minX : 0,
    height: positions.size > 0 ? maxY - minY : 0
  };
}

/**
 * Compute spacing from base spacing and tightness parameter.
 * tightness=5 → 1x base, tightness=1 → 2x base, tightness=10 → 0.2x base.
 */
export function computeSpacing(baseSpacing: number, tightness: number): number {
  return (baseSpacing * (11 - tightness)) / 5;
}
