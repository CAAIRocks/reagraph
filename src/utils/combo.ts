import type { ComboDefinition, InternalCombo } from '../types';

export function resolveComboTree(combos: ComboDefinition[]): InternalCombo[] {
  if (combos.length === 0) {
    return [];
  }

  const index = new Map<string, ComboDefinition>();
  for (const combo of combos) {
    index.set(combo.id, combo);
  }

  const childrenMap = new Map<string, string[]>();
  for (const combo of combos) {
    if (combo.parentComboId) {
      const siblings = childrenMap.get(combo.parentComboId) ?? [];
      siblings.push(combo.id);
      childrenMap.set(combo.parentComboId, siblings);
    }
  }

  // Cycle detection and depth computation
  const depthCache = new Map<string, number>();

  function computeDepth(comboId: string, visited: Set<string>): number {
    if (depthCache.has(comboId)) {
      return depthCache.get(comboId)!;
    }

    if (visited.has(comboId)) {
      throw new Error(`Cycle detected in combo hierarchy: ${comboId}`);
    }

    visited.add(comboId);

    const combo = index.get(comboId);
    if (!combo?.parentComboId) {
      depthCache.set(comboId, 0);
      return 0;
    }

    const depth = computeDepth(combo.parentComboId, visited) + 1;
    depthCache.set(comboId, depth);
    return depth;
  }

  for (const combo of combos) {
    computeDepth(combo.id, new Set());
  }

  return combos.map(combo => ({
    ...combo,
    collapsed: false,
    open: true,
    depth: depthCache.get(combo.id) ?? 0,
    childComboIds: childrenMap.get(combo.id) ?? [],
    proxyNodeId: undefined
  }));
}

export function getComboForNode(
  nodeId: string,
  combos: ComboDefinition[]
): ComboDefinition | undefined {
  return combos.find(combo => combo.memberNodeIds.includes(nodeId));
}

export function getComboAncestors(
  comboId: string,
  combos: ComboDefinition[]
): string[] {
  const index = new Map<string, ComboDefinition>();
  for (const combo of combos) {
    index.set(combo.id, combo);
  }

  const ancestors: string[] = [];
  let current = index.get(comboId);

  while (current?.parentComboId) {
    ancestors.push(current.parentComboId);
    current = index.get(current.parentComboId);
  }

  return ancestors;
}
