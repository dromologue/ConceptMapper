import type { GraphEdge } from "../types/graph-ir";

export interface CollapseState {
  hasChildren: Set<string>;
  hiddenByCollapse: Set<string>;
}

/**
 * Compute collapse state for all nodes given the current edges and collapsed set.
 *
 * Only DIRECTED edges define parent→child relationships for collapse.
 * Undirected edges (rivalry, alliance) do NOT create collapse relationships.
 *
 * hasChildren: nodes that have at least one outgoing directed edge.
 * hiddenByCollapse: nodes whose ALL directed parents are collapsed or hidden.
 */
export function computeCollapseState(
  edges: GraphEdge[],
  collapsed: Set<string>,
): CollapseState {
  // Build directed-only adjacency: parent → children
  const childrenOf = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!edge.directed) continue; // only directed edges define collapse hierarchy
    if (!childrenOf.has(edge.from)) childrenOf.set(edge.from, new Set());
    childrenOf.get(edge.from)!.add(edge.to);
  }

  // hasChildren: nodes with at least one directed child
  const hasChildren = new Set<string>();
  for (const [nodeId, children] of childrenOf) {
    if (children.size > 0) hasChildren.add(nodeId);
  }

  const hiddenByCollapse = new Set<string>();
  if (collapsed.size === 0) return { hasChildren, hiddenByCollapse };

  // Build reverse directed adjacency: child → set of directed parents
  const parentsOf = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!edge.directed) continue;
    if (!parentsOf.has(edge.to)) parentsOf.set(edge.to, new Set());
    parentsOf.get(edge.to)!.add(edge.from);
  }

  // A node is hidden if ALL its directed parents are either collapsed or hidden.
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
