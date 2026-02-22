import { a, useSpring } from '@react-spring/three';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { Color, DoubleSide } from 'three';

import { useStore } from '../../store';
import type { NodeRendererProps } from '../../types';
import { animationConfig } from '../../utils/animation';
import { Ring } from '../Ring';

export const Sphere: FC<NodeRendererProps> = ({
  color,
  id,
  size,
  selected,
  opacity = 1,
  animated
}) => {
  // Check animation direction for combo proxy nodes.
  // On collapse: proxy appears instantly (container shrink-out is the transition).
  // On expand: member nodes animate from proxy position (handled by Node.tsx).
  const collapseHint = useStore(state => {
    const hint = state.comboAnimationHints.get(id);
    return hint?.direction === 'collapse' && id.startsWith('combo-proxy-')
      ? hint
      : null;
  });

  const { scale, nodeOpacity } = useSpring({
    from: {
      scale: collapseHint ? [size, size, size] : [0.00001, 0.00001, 0.00001],
      nodeOpacity: collapseHint ? opacity : 0
    },
    to: {
      scale: [size, size, size],
      nodeOpacity: opacity
    },
    config: {
      ...animationConfig,
      duration: animated && !collapseHint ? undefined : 0
    }
  });
  const normalizedColor = useMemo(() => new Color(color), [color]);
  const theme = useStore(state => state.theme);

  return (
    <>
      <a.mesh userData={{ id, type: 'node' }} scale={scale as any}>
        <sphereGeometry attach="geometry" args={[1, 25, 25]} />
        <a.meshPhongMaterial
          attach="material"
          side={DoubleSide}
          transparent={true}
          fog={true}
          opacity={nodeOpacity}
          color={normalizedColor}
          emissive={normalizedColor}
          emissiveIntensity={0.7}
        />
      </a.mesh>
      <Ring
        opacity={selected ? 0.5 : 0}
        size={size}
        animated={animated}
        color={selected ? theme.ring.activeFill : theme.ring.fill}
      />
    </>
  );
};
