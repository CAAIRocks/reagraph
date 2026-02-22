import { a, useSpring } from '@react-spring/three';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { Color } from 'three';
import { DoubleSide, EdgesGeometry, PlaneGeometry } from 'three';

import type { Theme } from '../../themes';
import { animationConfig } from '../../utils';

export interface RectangleContainerProps {
  width: number;
  height: number;
  padding: number;
  normalizedFill: Color;
  normalizedStroke: Color;
  opacity: number;
  animated: boolean;
  theme: Theme;
}

export const RectangleContainer: FC<RectangleContainerProps> = ({
  width,
  height,
  padding,
  normalizedFill,
  normalizedStroke,
  opacity,
  animated,
  theme
}) => {
  const { opacity: springOpacity } = useSpring({
    from: { opacity: 0 },
    to: { opacity },
    config: {
      ...animationConfig,
      duration: animated ? undefined : 0
    }
  });

  const paddedWidth = width + padding * 2;
  const paddedHeight = height + padding * 2;

  const edgesGeometry = useMemo(() => {
    const plane = new PlaneGeometry(paddedWidth, paddedHeight);
    return new EdgesGeometry(plane);
  }, [paddedWidth, paddedHeight]);

  return (
    <>
      <mesh>
        <planeGeometry attach="geometry" args={[paddedWidth, paddedHeight]} />
        <a.meshBasicMaterial
          attach="material"
          color={normalizedFill}
          transparent={true}
          depthTest={false}
          opacity={theme.combo?.fill ? springOpacity : 0}
          side={DoubleSide}
          fog={true}
        />
      </mesh>
      <lineSegments geometry={edgesGeometry}>
        <a.lineBasicMaterial
          attach="material"
          color={normalizedStroke}
          transparent={true}
          depthTest={false}
          opacity={springOpacity}
        />
      </lineSegments>
    </>
  );
};
