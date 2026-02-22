import type { InternalGraphPosition } from '../types';
import { buildNodeEdges } from './layoutUtils';
import type { LayoutFactoryProps } from './types';

export function custom({ graph, drags, getNodePosition }: LayoutFactoryProps) {
  const { nodes, edges } = buildNodeEdges(graph);

  return {
    step() {
      return true;
    },
    getNodePosition(id: string): InternalGraphPosition {
      if (getNodePosition) {
        return getNodePosition(id, { graph, drags, nodes, edges });
      }

      // Fallback: use fixed positions (fx/fy/fz) from the node attributes
      const attrs = graph.getNodeAttributes(id);
      return {
        x: attrs.fx ?? attrs.x ?? 0,
        y: attrs.fy ?? attrs.y ?? 0,
        z: attrs.fz ?? attrs.z ?? 1
      } as InternalGraphPosition;
    }
  };
}
