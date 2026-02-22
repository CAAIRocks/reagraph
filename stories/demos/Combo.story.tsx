import React, { useEffect, useMemo, useState } from 'react';

import { darkTheme, GraphCanvas, lightTheme } from '../../src';
import { concentricSubLayout } from '../../src/layout/subLayouts/concentric';
import { gridSubLayout } from '../../src/layout/subLayouts/grid';
import { lensSubLayout } from '../../src/layout/subLayouts/lens';
import { sequentialSubLayout } from '../../src/layout/subLayouts/sequential';
import type { SubLayoutFn } from '../../src/layout/subLayouts/types';
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
        onNodeDoubleClick={node => {
          if (node.data?.comboId) {
            toggle(node.data.comboId);
          }
        }}
        onComboDoubleClick={combo => {
          toggle(combo.id);
        }}
      />
    </div>
  );
};

// --- Sub-layout demo helpers ---

const subLayoutNodeIds = Array.from({ length: 12 }, (_, i) => `sub-${i + 1}`);
const subLayoutEdges: GraphEdge[] = subLayoutNodeIds.slice(1).map((id, i) => ({
  id: `sub-e-${i}`,
  source: subLayoutNodeIds[i],
  target: id
}));

const controlStyle: React.CSSProperties = {
  zIndex: 9,
  position: 'absolute',
  top: 15,
  right: 15,
  background: 'rgba(0, 0, 0, .5)',
  padding: 10,
  color: 'white'
};

function useSubLayoutNodes(
  fn: SubLayoutFn,
  opts: { tightness: number; direction?: 'right' | 'down' | 'left' | 'up' }
): GraphNode[] {
  return useMemo(() => {
    const { positions } = fn({
      nodeIds: subLayoutNodeIds,
      tightness: opts.tightness,
      direction: opts.direction
    });
    return subLayoutNodeIds.map(id => {
      const pos = positions.get(id) ?? { x: 0, y: 0 };
      return { id, label: id, fx: pos.x, fy: pos.y };
    });
  }, [fn, opts.tightness, opts.direction]);
}

// --- Sub-layout stories ---

export const SubLayoutConcentric = () => {
  const [tightness, setTightness] = useState(5);
  const nodes = useSubLayoutNodes(concentricSubLayout, { tightness });

  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <div style={controlStyle}>
        <h3>Concentric Sub-Layout</h3>
        <label>
          Tightness: {tightness}
          <input
            type="range"
            min={1}
            max={10}
            value={tightness}
            onChange={e => setTightness(Number(e.target.value))}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
      <GraphCanvas nodes={nodes} edges={subLayoutEdges} layoutType="custom" />
    </div>
  );
};

export const SubLayoutGrid = () => {
  const [tightness, setTightness] = useState(5);
  const nodes = useSubLayoutNodes(gridSubLayout, { tightness });

  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <div style={controlStyle}>
        <h3>Grid Sub-Layout</h3>
        <label>
          Tightness: {tightness}
          <input
            type="range"
            min={1}
            max={10}
            value={tightness}
            onChange={e => setTightness(Number(e.target.value))}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
      <GraphCanvas nodes={nodes} edges={subLayoutEdges} layoutType="custom" />
    </div>
  );
};

const sequentialNodeIds = subLayoutNodeIds.slice(0, 8);
const sequentialEdges = subLayoutEdges.slice(0, 7);

export const SubLayoutSequential = () => {
  const [tightness, setTightness] = useState(5);
  const [direction, setDirection] = useState<'right' | 'down' | 'left' | 'up'>(
    'right'
  );

  const nodes = useMemo(() => {
    const { positions } = sequentialSubLayout({
      nodeIds: sequentialNodeIds,
      tightness,
      direction
    });
    return sequentialNodeIds.map(id => {
      const pos = positions.get(id) ?? { x: 0, y: 0 };
      return { id, label: id, fx: pos.x, fy: pos.y };
    });
  }, [tightness, direction]);

  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <div style={controlStyle}>
        <h3>Sequential Sub-Layout</h3>
        <label>
          Tightness: {tightness}
          <input
            type="range"
            min={1}
            max={10}
            value={tightness}
            onChange={e => setTightness(Number(e.target.value))}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        <div style={{ marginTop: 8 }}>
          {(['right', 'down', 'left', 'up'] as const).map(d => (
            <label key={d} style={{ display: 'block' }}>
              <input
                type="radio"
                name="direction"
                value={d}
                checked={direction === d}
                onChange={() => setDirection(d)}
              />{' '}
              {d}
            </label>
          ))}
        </div>
      </div>
      <GraphCanvas nodes={nodes} edges={sequentialEdges} layoutType="custom" />
    </div>
  );
};

export const SubLayoutLens = () => {
  const [tightness, setTightness] = useState(5);
  const nodes = useSubLayoutNodes(lensSubLayout, { tightness });

  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <div style={controlStyle}>
        <h3>Lens Sub-Layout</h3>
        <label>
          Tightness: {tightness}
          <input
            type="range"
            min={1}
            max={10}
            value={tightness}
            onChange={e => setTightness(Number(e.target.value))}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
      <GraphCanvas nodes={nodes} edges={subLayoutEdges} layoutType="custom" />
    </div>
  );
};

// --- Open combo stories ---

const openComboNodes: GraphNode[] = [
  { id: 'oc-1', label: 'Member 1' },
  { id: 'oc-2', label: 'Member 2' },
  { id: 'oc-3', label: 'Member 3' },
  { id: 'oc-4', label: 'Member 4' },
  { id: 'oc-5', label: 'Member 5' },
  { id: 'oc-6', label: 'Member 6' },
  { id: 'ext-1', label: 'External 1' },
  { id: 'ext-2', label: 'External 2' },
  { id: 'ext-3', label: 'External 3' }
];

const openComboEdges: GraphEdge[] = [
  { id: 'oe-1', source: 'oc-1', target: 'oc-2' },
  { id: 'oe-2', source: 'oc-2', target: 'oc-3' },
  { id: 'oe-3', source: 'oc-3', target: 'oc-4' },
  { id: 'oe-4', source: 'oc-4', target: 'oc-5' },
  { id: 'oe-5', source: 'oc-5', target: 'oc-6' },
  { id: 'oe-6', source: 'oc-1', target: 'ext-1' },
  { id: 'oe-7', source: 'oc-3', target: 'ext-2' },
  { id: 'oe-8', source: 'oc-6', target: 'ext-3' },
  { id: 'oe-9', source: 'ext-1', target: 'ext-2' },
  { id: 'oe-10', source: 'ext-2', target: 'ext-3' }
];

const openComboDef: ComboDefinition[] = [
  {
    id: 'open-group',
    label: 'Open Group',
    memberNodeIds: ['oc-1', 'oc-2', 'oc-3', 'oc-4', 'oc-5', 'oc-6'],
    shape: 'circle',
    arrangement: 'concentric',
    tightness: 5
  }
];

export const OpenCombo = () => (
  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
    <GraphCanvas
      nodes={openComboNodes}
      edges={openComboEdges}
      combos={openComboDef}
      openComboIds={['open-group']}
      layoutType="forceDirected2d"
    />
  </div>
);

export const MixedCombos = () => (
  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
    <GraphCanvas
      nodes={comboNodes}
      edges={comboEdges}
      combos={combos}
      openComboIds={['group-a']}
      collapsedComboIds={['group-b']}
      layoutType="forceDirected2d"
    />
  </div>
);

export const OpenComboForceLayout = () => {
  const [openIds, setOpenIds] = useState<string[]>(['group-a']);
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  const toggleCombo = (id: string) => {
    if (openIds.includes(id)) {
      setOpenIds(prev => prev.filter(c => c !== id));
      setCollapsedIds(prev => [...prev, id]);
    } else if (collapsedIds.includes(id)) {
      setCollapsedIds(prev => prev.filter(c => c !== id));
    } else {
      setOpenIds(prev => [...prev, id]);
      setCollapsedIds(prev => prev.filter(c => c !== id));
    }
  };

  const getState = (id: string) => {
    if (openIds.includes(id)) return 'open';
    if (collapsedIds.includes(id)) return 'collapsed';
    return 'normal';
  };

  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <div style={controlStyle}>
        <h3>Open Combo Controls</h3>
        {combos.map(combo => (
          <button
            key={combo.id}
            style={{ display: 'block', width: '100%', marginBottom: 4 }}
            onClick={() => toggleCombo(combo.id)}
          >
            {combo.label}: {getState(combo.id)} (click to cycle)
          </button>
        ))}
      </div>
      <GraphCanvas
        nodes={comboNodes}
        edges={comboEdges}
        combos={combos}
        openComboIds={openIds}
        collapsedComboIds={collapsedIds}
        layoutType="forceDirected2d"
      />
    </div>
  );
};
