import { a, useSpring } from '@react-spring/three';
import { useCursor } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import type { Vector3 } from 'three';
import { Color } from 'three';

import { useCameraControls } from '../CameraControls/useCameraControls';
import { useStore } from '../store';
import type { ComboContainerData } from '../types';
import { animationConfig } from '../utils';
import { useDrag } from '../utils/useDrag';
import { useHoverIntent } from '../utils/useHoverIntent';
import { CircleContainer } from './containers/CircleContainer';
import { RectangleContainer } from './containers/RectangleContainer';
import { Label } from './Label';

export interface ComboContainerProps {
  comboId: string;
  shape: 'circle' | 'rectangle';
  center: { x: number; y: number; z: number };
  boundingBox: ComboContainerData['boundingBox'];
  radius?: number;
  width?: number;
  height?: number;
  padding?: number;
  label?: string;
  animated?: boolean;
  disabled?: boolean;
  labelFontUrl?: string;
  draggable?: boolean;
  onClick?: (comboId: string, event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (comboId: string, event: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (comboId: string, event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (comboId: string, event: ThreeEvent<PointerEvent>) => void;
  onDragged?: (comboId: string) => void;
  exiting?: boolean;
  onExitComplete?: (comboId: string) => void;
}

export const ComboContainer: FC<ComboContainerProps> = ({
  comboId,
  shape,
  center,
  boundingBox,
  radius,
  width,
  height,
  padding = 40,
  label,
  animated = true,
  disabled,
  labelFontUrl,
  draggable = false,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
  onDragged,
  exiting = false,
  onExitComplete
}) => {
  const theme = useStore(state => state.theme);
  const [active, setActive] = useState<boolean>(false);
  const centerPosition = useStore(state => state.centerPosition);
  const draggingIds = useStore(state => state.draggingIds);
  const isDraggingCurrent = draggingIds.includes(comboId);
  const isDragging = draggingIds.length > 0;
  const cameraControls = useCameraControls();
  const hoveredNodeId = useStore(state => state.hoveredNodeId);

  const isActive = useStore(state => state.actives?.includes(comboId));

  const isSelected = useStore(state => state.selections?.includes(comboId));

  const hasSelections = useStore(state => state.selections?.length > 0);

  const opacity = hasSelections
    ? isSelected || active || isActive
      ? (theme.combo?.selectedOpacity ?? 1)
      : (theme.combo?.inactiveOpacity ?? 0.1)
    : (theme.combo?.opacity ?? 1);

  const computedRadius = useMemo(() => {
    if (shape === 'circle') {
      return (
        radius ?? Math.max(boundingBox.width, boundingBox.height) / 2 + padding
      );
    }
    return 0;
  }, [shape, radius, boundingBox.width, boundingBox.height, padding]);

  const computedWidth = useMemo(() => {
    if (shape === 'rectangle') {
      return width ?? boundingBox.width;
    }
    return 0;
  }, [shape, width, boundingBox.width]);

  const computedHeight = useMemo(() => {
    if (shape === 'rectangle') {
      return height ?? boundingBox.height;
    }
    return 0;
  }, [shape, height, boundingBox.height]);

  const innerRadius = useMemo(() => {
    if (shape === 'circle') {
      const rad = Math.max(boundingBox.width, boundingBox.height) / 2;
      return rad;
    }
    return 0;
  }, [shape, boundingBox.width, boundingBox.height]);

  const labelOffset = useMemo(() => {
    if (shape === 'circle') {
      return computedRadius;
    }
    return computedHeight / 2 + padding;
  }, [shape, computedRadius, computedHeight, padding]);

  const labelPosition: [number, number, number] = useMemo(() => {
    const defaultPosition: [number, number, number] = [0, -labelOffset, 2];
    const themeOffset = theme.combo?.label?.offset;
    if (themeOffset) {
      return [
        defaultPosition[0] - themeOffset[0],
        defaultPosition[1] - themeOffset[1],
        defaultPosition[2] - themeOffset[2]
      ];
    }
    return defaultPosition;
  }, [labelOffset, theme.combo?.label?.offset]);

  // Direction-aware entrance/exit:
  // - Entrance (expand or initial): appear instantly at correct position.
  // - Collapse exit: quick fade-out with slight shrink. We fade early because
  //   the proxy node's final position is determined by re-layout and won't
  //   align perfectly with the container center.
  const { containerPosition, containerScale, containerOpacity } = useSpring({
    from: {
      containerPosition: [center.x, center.y, -1] as [number, number, number],
      containerScale: [1, 1, 1] as [number, number, number],
      containerOpacity: 1
    },
    to: {
      containerPosition: [center.x, center.y, -1] as [number, number, number],
      containerScale: exiting
        ? ([0.5, 0.5, 0.5] as [number, number, number])
        : ([1, 1, 1] as [number, number, number]),
      containerOpacity: exiting ? 0 : 1
    },
    config: {
      ...animationConfig,
      duration: exiting && animated ? 200 : 0
    },
    onRest: () => {
      if (exiting) {
        onExitComplete?.(comboId);
      }
    }
  });

  const normalizedStroke = useMemo(
    () => new Color(theme.combo?.stroke),
    [theme.combo?.stroke]
  );

  const normalizedFill = useMemo(
    () => new Color(theme.combo?.fill),
    [theme.combo?.fill]
  );

  const addDraggingId = useStore(state => state.addDraggingId);
  const removeDraggingId = useStore(state => state.removeDraggingId);
  const setComboContainerPosition = useStore(
    state => state.setComboContainerPosition
  );

  const bind = useDrag({
    draggable: draggable && !hoveredNodeId,
    position: { x: center.x, y: center.y, z: -1 } as any,
    set: (pos: Vector3) => setComboContainerPosition(comboId, pos as any),
    onDragStart: () => {
      addDraggingId(comboId);
      setActive(true);
    },
    onDragEnd: () => {
      removeDraggingId(comboId);
      setActive(false);
      onDragged?.(comboId);
    }
  });

  useCursor(active && !isDragging && onClick !== undefined, 'pointer');
  useCursor(
    active && draggable && !isDraggingCurrent && onClick === undefined,
    'grab'
  );
  useCursor(isDraggingCurrent, 'grabbing');

  const { pointerOver, pointerOut } = useHoverIntent({
    disabled,
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      setActive(true);
      cameraControls.freeze();
      onPointerOver?.(comboId, event);
    },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => {
      setActive(false);
      cameraControls.unFreeze();
      onPointerOut?.(comboId, event);
    }
  });

  const container = useMemo(
    () =>
      theme.combo && (
        <a.group
          userData={{ id: comboId, type: 'combo' }}
          position={containerPosition as any}
          scale={containerScale as any}
          onPointerOver={pointerOver}
          onPointerOut={pointerOut}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            if (!disabled && !isDraggingCurrent) {
              onClick?.(comboId, event);
            }
          }}
          onDoubleClick={(event: ThreeEvent<MouseEvent>) => {
            if (!disabled) {
              onDoubleClick?.(comboId, event);
            }
          }}
          {...(bind() as any)}
        >
          {shape === 'circle' ? (
            <CircleContainer
              outerRadius={computedRadius}
              innerRadius={innerRadius}
              padding={padding}
              normalizedFill={normalizedFill}
              normalizedStroke={normalizedStroke}
              opacity={opacity}
              animated={animated}
              theme={theme}
            />
          ) : (
            <RectangleContainer
              width={computedWidth}
              height={computedHeight}
              padding={padding}
              normalizedFill={normalizedFill}
              normalizedStroke={normalizedStroke}
              opacity={opacity}
              animated={animated}
              theme={theme}
            />
          )}
          {label && theme.combo?.label && (
            <a.group position={labelPosition}>
              <Label
                text={label}
                opacity={opacity}
                fontUrl={labelFontUrl}
                stroke={theme.combo.label.stroke}
                active={false}
                color={theme.combo.label.color}
                fontSize={theme.combo.label.fontSize ?? 12}
              />
            </a.group>
          )}
        </a.group>
      ),
    [
      theme,
      comboId,
      containerPosition,
      containerScale,
      pointerOver,
      pointerOut,
      shape,
      computedRadius,
      innerRadius,
      padding,
      normalizedFill,
      normalizedStroke,
      opacity,
      animated,
      computedWidth,
      computedHeight,
      label,
      labelPosition,
      labelFontUrl,
      disabled,
      onClick,
      onDoubleClick,
      bind,
      isDraggingCurrent
    ]
  );

  return container;
};
