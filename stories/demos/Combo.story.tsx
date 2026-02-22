import React, { useEffect, useState } from 'react';

import { darkTheme, GraphCanvas, lightTheme } from '../../src';
import type { ComboDefinition, GraphEdge, GraphNode } from '../../src/types';

export default {
  title: 'Demos/Combo',
  component: GraphCanvas
};

// --- Container stories data ---

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

// --- Closed combo stories data ---

const comboNodes: GraphNode[] = [
  { id: 'a1', label: 'A-1' },
  { id: 'a2', label: 'A-2' },
  { id: 'a3', label: 'A-3' },
  { id: 'a4', label: 'A-4' },
  { id: 'b1', label: 'B-1' },
  { id: 'b2', label: 'B-2' },
  { id: 'b3', label: 'B-3' },
  { id: 'c1', label: 'C-1' },
  { id: 'c2', label: 'C-2' },
  { id: 'c3', label: 'C-3' },
  { id: 'c4', label: 'C-4' },
  { id: 'c5', label: 'C-5' },
  { id: 'x1', label: 'External-1' },
  { id: 'x2', label: 'External-2' },
  { id: 'x3', label: 'External-3' }
];

const comboEdges: GraphEdge[] = [
  { id: 'e1', source: 'a1', target: 'a2' },
  { id: 'e2', source: 'a2', target: 'a3' },
  { id: 'e3', source: 'a1', target: 'b1' },
  { id: 'e4', source: 'a3', target: 'b2' },
  { id: 'e5', source: 'b1', target: 'b2' },
  { id: 'e6', source: 'b2', target: 'c1' },
  { id: 'e7', source: 'b3', target: 'c2' },
  { id: 'e8', source: 'c1', target: 'c3' },
  { id: 'e9', source: 'c3', target: 'c5' },
  { id: 'e10', source: 'a4', target: 'x1' },
  { id: 'e11', source: 'x1', target: 'x2' },
  { id: 'e12', source: 'x2', target: 'c4' },
  { id: 'e13', source: 'x3', target: 'b3' },
  { id: 'e14', source: 'x3', target: 'a1' }
];

const combos: ComboDefinition[] = [
  {
    id: 'group-a',
    label: 'Group A',
    memberNodeIds: ['a1', 'a2', 'a3', 'a4'],
    data: { fill: '#4169E1' }
  },
  {
    id: 'group-b',
    label: 'Group B',
    memberNodeIds: ['b1', 'b2', 'b3'],
    data: { fill: '#DC143C' }
  },
  {
    id: 'group-c',
    label: 'Group C',
    memberNodeIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
    data: { fill: '#228B22' }
  }
];

export const ClosedCombo = () => {
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const toggle = (id: string) => {
    setCollapsed(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <div
        style={{
          zIndex: 9,
          position: 'absolute',
          top: 15,
          right: 15,
          background: 'rgba(0, 0, 0, .5)',
          padding: 10,
          color: 'white'
        }}
      >
        <h3>Combo Controls</h3>
        {combos.map(combo => (
          <button
            key={combo.id}
            style={{ display: 'block', width: '100%', marginBottom: 4 }}
            onClick={() => toggle(combo.id)}
          >
            {collapsed.includes(combo.id) ? 'Expand' : 'Collapse'} {combo.label}
          </button>
        ))}
        <button
          style={{ display: 'block', width: '100%', marginTop: 8 }}
          onClick={() =>
            setCollapsed(
              collapsed.length === combos.length ? [] : combos.map(c => c.id)
            )
          }
        >
          {collapsed.length === combos.length ? 'Expand All' : 'Collapse All'}
        </button>
      </div>
      <GraphCanvas
        nodes={comboNodes}
        edges={comboEdges}
        combos={combos}
        collapsedComboIds={collapsed}
      />
    </div>
  );
};
