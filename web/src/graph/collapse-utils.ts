import type { GraphEdge } from "../types/graph-ir";

export interface CollapseState {
  hasChildren: Set<string>;
  hiddenByCollapse: Set<string>;
}

/**
 * Compute collapse state for all nodes given the current edges and collapsed set.
 *
 * hasChildren: nodes that have ANY outgoing edges (not just directed).
 * For undirected edges, both endpoints are considered parents of each other.
 *
 * hiddenByCollapse: nodes whose ALL connections to non-collapsed nodes
 * pass through a collapsed node — i.e. they would be unreachable without
 * traversing a collapsed parent.
 */
export function computeCollapseState(
  edges: GraphEdge[],
  collapsed: Set<string>,
): CollapseState {
  // Build adjacency: for each node, which other nodes connect to it?
  // "parent" = the node on the other end of any edge
  const childrenOf = new Map<string, Set<string>>();

  for (const edge of edges) {
    // Directed: from → to (from is parent)
    // Undirected: both ends are mutual parents
    if (!childrenOf.has(edge.from)) childrenOf.set(edge.from, new Set());
    childrenOf.get(edge.from)!.add(edge.to);

    if (!edge.directed) {
      if (!childrenOf.has(edge.to)) childrenOf.set(edge.to, new Set());
      childrenOf.get(edge.to)!.add(edge.from);
    }
  }

  // hasChildren: any node that has at least one child via any edge
  const hasChildren = new Set<string>();
  for (const [nodeId, children] of childrenOf) {
    if (children.size > 0) hasChildren.add(nodeId);
  }

  // hiddenByCollapse: iteratively hide nodes reachable only through collapsed nodes
  const hiddenByCollapse = new Set<string>();
  if (collapsed.size === 0) return { hasChildren, hiddenByCollapse };

  // Build reverse adjacency: for each node, which nodes are its "parents"?
  const parentsOf = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!parentsOf.has(edge.to)) parentsOf.set(edge.to, new Set());
    parentsOf.get(edge.to)!.add(edge.from);

    if (!edge.directed) {
      if (!parentsOf.has(edge.from)) parentsOf.set(edge.from, new Set());
      parentsOf.get(edge.from)!.add(edge.to);
    }
  }

  // A node is hidden if ALL its parents are either collapsed or hidden.
  // We iterate until stable to handle cascading collapse (A→B→C).
  let changed = true;
  while (changed) {
    changed = false;
    for (const [nodeId, parents] of parentsOf) {
      if (collapsed.has(nodeId)) continue;       // collapsed nodes stay visible (with +)
      if (hiddenByCollapse.has(nodeId)) continue; // already hidden

      // Only consider nodes that have at least one collapsed or hidden parent
      const hasCollapsedParent = [...parents].some(
        (p) => collapsed.has(p) || hiddenByCollapse.has(p),
      );
      if (!hasCollapsedParent) continue;

      // Hide if ALL parents are collapsed or hidden
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
