// SPEC: REQ-088 — Collapse/Expand to Level.
// Compute hierarchy depth for each node by BFS along directed edges from
// every node that has no incoming directed edge ("root"). Nodes not reached
// from any root (cycles, disconnected hubs) get depth 0 so they stay visible
// at every level.
import type { GraphNode, GraphEdge } from "../types/graph-ir";

export interface HierarchyInfo {
  /** depth(nodeId) — shortest directed-path distance from any root. */
  depths: Map<string, number>;
  /** Highest depth value seen (0 if no edges). */
  maxDepth: number;
  /** Root nodes (no incoming directed edge). */
  roots: string[];
}

export function computeHierarchy(nodes: GraphNode[], edges: GraphEdge[]): HierarchyInfo {
  const all = new Set(nodes.map((n) => n.id));
  const incoming = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  for (const id of all) {
    incoming.set(id, 0);
    outEdges.set(id, []);
  }
  for (const e of edges) {
    if (!all.has(e.from) || !all.has(e.to)) continue;
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
    outEdges.get(e.from)!.push(e.to);
  }

  const roots = [...all].filter((id) => (incoming.get(id) ?? 0) === 0).sort();

  // BFS from all roots simultaneously
  const depths = new Map<string, number>();
  const queue: string[] = [];
  for (const r of roots) {
    depths.set(r, 0);
    queue.push(r);
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = depths.get(cur)!;
    for (const next of outEdges.get(cur) ?? []) {
      if (!depths.has(next)) {
        depths.set(next, d + 1);
        queue.push(next);
      }
    }
  }

  // Unreached nodes (cycles or disconnected) → depth 0 so they remain visible at every level
  for (const id of all) {
    if (!depths.has(id)) depths.set(id, 0);
  }

  let maxDepth = 0;
  for (const d of depths.values()) if (d > maxDepth) maxDepth = d;

  return { depths, maxDepth, roots };
}

/**
 * Given a target visible level N, return the set of nodes to mark as "collapsed".
 * A node is collapsed (visible with a +/- indicator) if its depth equals N AND
 * it has any deeper descendant. The existing collapse-utils cascade then hides
 * everything below.
 *
 * Level 0: roots are collapsed → only roots visible.
 * Level >= maxDepth: empty set → everything visible.
 */
export function collapsedNodesForLevel(
  level: number,
  info: HierarchyInfo,
  edges: GraphEdge[],
): Set<string> {
  if (level >= info.maxDepth) return new Set();
  const hasOutgoing = new Set<string>();
  for (const e of edges) hasOutgoing.add(e.from);
  const result = new Set<string>();
  for (const [id, d] of info.depths) {
    if (d === level && hasOutgoing.has(id)) result.add(id);
  }
  return result;
}
