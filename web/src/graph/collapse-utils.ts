import type { GraphEdge } from "../types/graph-ir";

export interface CollapseState {
  hasChildren: Set<string>;
  hiddenByCollapse: Set<string>;
}

/**
 * Compute collapse state for all nodes given the current edges and collapsed set.
 *
 * For collapse, ALL edges are treated as bidirectional connections.
 * A collapsed node hides any neighbor whose ONLY connections are to
 * collapsed/hidden nodes. This is independent of edge direction.
 *
 * hasChildren: nodes that have at least one edge connection.
 * hiddenByCollapse: nodes whose ALL neighbors are collapsed or hidden.
 */
export function computeCollapseState(
  edges: GraphEdge[],
  collapsed: Set<string>,
): CollapseState {
  // Build bidirectional adjacency: for each node, all connected neighbors
  const neighborsOf = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!neighborsOf.has(edge.from)) neighborsOf.set(edge.from, new Set());
    if (!neighborsOf.has(edge.to)) neighborsOf.set(edge.to, new Set());
    neighborsOf.get(edge.from)!.add(edge.to);
    neighborsOf.get(edge.to)!.add(edge.from);
  }

  // hasChildren: nodes with at least one neighbor
  const hasChildren = new Set<string>();
  for (const [nodeId, neighbors] of neighborsOf) {
    if (neighbors.size > 0) hasChildren.add(nodeId);
  }

  const hiddenByCollapse = new Set<string>();
  if (collapsed.size === 0) return { hasChildren, hiddenByCollapse };

  // A node is hidden if ALL its neighbors are either collapsed or hidden.
  // Iterate until stable to handle cascading collapse.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [nodeId, neighbors] of neighborsOf) {
      if (collapsed.has(nodeId)) continue;       // collapsed nodes stay visible (with +/-)
      if (hiddenByCollapse.has(nodeId)) continue; // already hidden

      const allNeighborsCollapsedOrHidden = [...neighbors].every(
        (n) => collapsed.has(n) || hiddenByCollapse.has(n),
      );
      if (allNeighborsCollapsedOrHidden) {
        hiddenByCollapse.add(nodeId);
        changed = true;
      }
    }
  }

  return { hasChildren, hiddenByCollapse };
}
