import React, { useEffect, useState } from 'react';

import { darkTheme, GraphCanvas, lightTheme } from '../../src';
import type { GraphNode } from '../../src/types';
import type { ComboDefinition } from '../../src/types';

export default {
  title: 'Demos/Combo',
  component: GraphCanvas
};

const simpleNodes = [
  { id: 'n-1', label: 'Node 1' },
  { id: 'n-2', label: 'Node 2' },
  { id: 'n-3', label: 'Node 3' },
  { id: 'n-4', label: 'Node 4' },
  { id: 'n-5', label: 'Node 5' },
  { id: 'n-6', label: 'Node 6' }
];

const simpleEdges = [
  { id: 'e-1', source: 'n-1', target: 'n-2' },
  { id: 'e-2', source: 'n-2', target: 'n-3' },
  { id: 'e-3', source: 'n-4', target: 'n-5' },
  { id: 'e-4', source: 'n-5', target: 'n-6' }
];

const circleCombos: ComboDefinition[] = [
  {
    id: 'combo-a',
    label: 'Group A',
    memberNodeIds: ['n-1', 'n-2', 'n-3'],
    shape: 'circle'
  },
  {
    id: 'combo-b',
    label: 'Group B',
    memberNodeIds: ['n-4', 'n-5', 'n-6'],
    shape: 'circle'
  }
];

const rectangleCombos: ComboDefinition[] = [
  {
    id: 'combo-a',
    label: 'Group A',
    memberNodeIds: ['n-1', 'n-2', 'n-3'],
    shape: 'rectangle'
  },
  {
    id: 'combo-b',
    label: 'Group B',
    memberNodeIds: ['n-4', 'n-5', 'n-6'],
    shape: 'rectangle'
  }
];

export const ContainerCircle = () => (
  <GraphCanvas
    nodes={simpleNodes}
    edges={simpleEdges}
    combos={circleCombos}
    onComboClick={combo => console.log('combo click', combo)}
    onComboDoubleClick={combo => console.log('combo double click', combo)}
  />
);

export const ContainerRectangle = () => (
  <GraphCanvas
    nodes={simpleNodes}
    edges={simpleEdges}
    combos={rectangleCombos}
    onComboClick={combo => console.log('combo click', combo)}
  />
);

export const ContainerAnimated = () => {
  const [nodes, setNodes] = useState<GraphNode[]>(simpleNodes);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev =>
        prev.map(node => ({
          ...node,
          fx: (Math.random() - 0.5) * 200,
          fy: (Math.random() - 0.5) * 200
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GraphCanvas
      nodes={nodes}
      edges={simpleEdges}
      combos={circleCombos}
      animated
    />
  );
};

export const ContainerThemed = () => (
  <GraphCanvas
    nodes={simpleNodes}
    edges={simpleEdges}
    combos={circleCombos}
    theme={{
      ...lightTheme,
      combo: {
        stroke: '#6366f1',
        fill: '#eef2ff',
        opacity: 1,
        selectedOpacity: 1,
        inactiveOpacity: 0.1,
        label: { stroke: '#fff', color: '#4f46e5' }
      }
    }}
  />
);

export const ContainerDarkTheme = () => (
  <GraphCanvas
    nodes={simpleNodes}
    edges={simpleEdges}
    combos={rectangleCombos}
    theme={darkTheme}
  />
);
