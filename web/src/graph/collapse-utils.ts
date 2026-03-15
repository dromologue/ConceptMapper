import type { GraphEdge } from "../types/graph-ir";

export interface CollapseState {
  hasChildren: Set<string>;
  hiddenByCollapse: Set<string>;
}

/**
 * Compute collapse state for all nodes given the current edges and collapsed set.
 *
 * For collapse purposes, every edge defines a one-way parent→child relationship
 * using the edge's `from` as parent and `to` as child, regardless of the `directed` flag.
 * This means collapsing a node hides the nodes it points TO, never the nodes that point to IT.
 *
 * hasChildren: nodes that have at least one outgoing edge (from side).
 * hiddenByCollapse: nodes whose ALL parents (from-side connections) are collapsed or hidden.
 */
export function computeCollapseState(
  edges: GraphEdge[],
  collapsed: Set<string>,
): CollapseState {
  // Build adjacency: from → to (parent → child) for ALL edges
  const childrenOf = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!childrenOf.has(edge.from)) childrenOf.set(edge.from, new Set());
    childrenOf.get(edge.from)!.add(edge.to);
  }

  // hasChildren: nodes with at least one child
  const hasChildren = new Set<string>();
  for (const [nodeId, children] of childrenOf) {
    if (children.size > 0) hasChildren.add(nodeId);
  }

  const hiddenByCollapse = new Set<string>();
  if (collapsed.size === 0) return { hasChildren, hiddenByCollapse };

  // Build reverse adjacency: child → set of parents (from-side)
  const parentsOf = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!parentsOf.has(edge.to)) parentsOf.set(edge.to, new Set());
    parentsOf.get(edge.to)!.add(edge.from);
  }

  // A node is hidden if ALL its parents are either collapsed or hidden.
  // Iterate until stable to handle cascading collapse (A→B→C).
  let changed = true;
  while (changed) {
    changed = false;
    for (const [nodeId, parents] of parentsOf) {
      if (collapsed.has(nodeId)) continue;       // collapsed nodes stay visible (with +)
      if (hiddenByCollapse.has(nodeId)) continue; // already hidden

      const allParentsCollapsedOrHidden = [...parents].every(
        (p) => collapsed.has(p) || hiddenByCollapse.has(p),
      );
      if (allParentsCollapsedOrHidden) {
        hiddenByCollapse.add(nodeId);
        changed = true;
      }
    }
  }

  return { hasChildren, hiddenByCollapse };
}
