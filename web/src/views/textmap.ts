// Pure projection logic for the textmap (outline) view. Kept separate from the
// React component so it can be unit-tested. The graph is a directed/undirected
// graph with cycles; the textmap is a tree projection of it.

import type { GraphIR, GraphNode, GraphEdge, EdgeTypeConfig, NodeTypeConfig } from "../types/graph-ir";

export type ConnectionDirection = "out" | "in" | "undirected";

export interface Connection {
  /** The node on the other end of the edge. */
  node: GraphNode;
  /** The edge linking the two nodes. */
  edge: GraphEdge;
  /** Direction relative to the node whose connections these are. */
  direction: ConnectionDirection;
}

export interface ConnectionGroup {
  /** Stable key: `${direction}:${edge_type}`. */
  key: string;
  edgeType: string;
  /** Human label including a direction arrow (e.g. "originates →", "← applies"). */
  label: string;
  direction: ConnectionDirection;
  connections: Connection[];
}

/** Index nodes by id for O(1) lookup. */
export function indexNodes(nodes: GraphNode[]): Map<string, GraphNode> {
  const m = new Map<string, GraphNode>();
  for (const n of nodes) m.set(n.id, n);
  return m;
}

/**
 * All connections of a node, as { connected node, edge, direction }.
 * For a directed edge a→b: from a's view it is "out" to b; from b's view "in"
 * from a. Undirected edges are "undirected" from either side. Edges pointing at
 * missing nodes are skipped.
 */
export function connectionsOf(
  nodeId: string,
  edges: GraphEdge[],
  byId: Map<string, GraphNode>,
): Connection[] {
  const out: Connection[] = [];
  for (const e of edges) {
    if (e.from === nodeId) {
      const other = byId.get(e.to);
      if (other) out.push({ node: other, edge: e, direction: e.directed ? "out" : "undirected" });
    } else if (e.to === nodeId) {
      const other = byId.get(e.from);
      if (other) out.push({ node: other, edge: e, direction: e.directed ? "in" : "undirected" });
    }
  }
  return out;
}

/** Group a node's connections by direction + edge type, with friendly labels. */
export function groupConnections(
  conns: Connection[],
  edgeTypeConfigs?: EdgeTypeConfig[],
): ConnectionGroup[] {
  const labelFor = (id: string) => edgeTypeConfigs?.find((c) => c.id === id)?.label ?? id;
  const groups = new Map<string, ConnectionGroup>();
  for (const c of conns) {
    const key = `${c.direction}:${c.edge.edge_type}`;
    let g = groups.get(key);
    if (!g) {
      const base = labelFor(c.edge.edge_type);
      const label =
        c.direction === "out" ? `${base} →` : c.direction === "in" ? `← ${base}` : base;
      g = { key, edgeType: c.edge.edge_type, label, direction: c.direction, connections: [] };
      groups.set(key, g);
    }
    g.connections.push(c);
  }
  // Stable order: outgoing, then undirected, then incoming; then by label.
  const order: Record<ConnectionDirection, number> = { out: 0, undirected: 1, in: 2 };
  for (const g of groups.values()) {
    g.connections.sort((a, b) => a.node.name.localeCompare(b.node.name));
  }
  return [...groups.values()].sort(
    (a, b) => order[a.direction] - order[b.direction] || a.label.localeCompare(b.label),
  );
}

/**
 * Root nodes for the outline: nodes with no incoming directed edge. If there
 * are none (fully cyclic, or a purely undirected graph), every node is a root.
 * Returned sorted by name.
 */
export function findRoots(graph: GraphIR): GraphNode[] {
  const hasIncoming = new Set<string>();
  for (const e of graph.edges) {
    if (e.directed) hasIncoming.add(e.to);
  }
  const roots = graph.nodes.filter((n) => !hasIncoming.has(n.id));
  const result = roots.length > 0 ? roots : graph.nodes;
  return [...result].sort((a, b) => a.name.localeCompare(b.name));
}

export type RevisitKind = "none" | "ancestor" | "cross";

/**
 * Classify a target relative to the current ancestor path and the set of nodes
 * already rendered elsewhere in the tree.
 * - "ancestor": target is on the path from the root to here → expanding it would
 *   form a loop; render it as a leaf with a back-link instead.
 * - "cross": target appears elsewhere in the tree (not an ancestor) → safe to
 *   expand, but mark it so the user knows it recurs.
 * - "none": first appearance.
 */
export function revisitKind(
  targetId: string,
  ancestorPath: ReadonlySet<string>,
  rendered: ReadonlySet<string>,
): RevisitKind {
  if (ancestorPath.has(targetId)) return "ancestor";
  if (rendered.has(targetId)) return "cross";
  return "none";
}

/** Backstop recursion depth for pathological graphs. */
export const MAX_TEXTMAP_DEPTH = 50;

export interface NodeTypeGroup {
  typeId: string;
  label: string;
  icon: string;
  nodes: GraphNode[];
}

/**
 * Group all nodes by node_type, ordered by the template's nodeTypeConfigs.
 * Types not in the template come last (sorted by id). Nodes within each
 * group are sorted alphabetically by name.
 */
export function groupByNodeType(
  nodes: GraphNode[],
  nodeTypeConfigs?: NodeTypeConfig[],
): NodeTypeGroup[] {
  const byType = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const bucket = byType.get(n.node_type);
    if (bucket) bucket.push(n);
    else byType.set(n.node_type, [n]);
  }
  for (const arr of byType.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  const result: NodeTypeGroup[] = [];

  if (nodeTypeConfigs) {
    for (const cfg of nodeTypeConfigs) {
      const groupNodes = byType.get(cfg.id);
      if (groupNodes && groupNodes.length > 0) {
        result.push({
          typeId: cfg.id,
          label: cfg.label,
          icon: cfg.icon ?? cfg.label[0] ?? "•",
          nodes: groupNodes,
        });
        byType.delete(cfg.id);
      }
    }
  }

  // Types not in the template (shouldn't normally occur; sorted for stability).
  for (const [id, groupNodes] of [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    result.push({ typeId: id, label: id, icon: id[0] ?? "•", nodes: groupNodes });
  }

  return result;
}
