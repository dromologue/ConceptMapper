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
 * it has any deeper descendant.
 *
 * NOTE: this set alone does NOT hide deeper nodes — the bidirectional cascade
 * in `computeCollapseState` won't propagate through tree-shaped graphs. Use
 * `hiddenNodesForLevel` for the actual hiding.
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

/**
 * The set of node ids whose depth exceeds `level`. Pure depth filter — does
 * NOT honour manual +/- overrides. Use `computeVisibility` for the full
 * model. Kept for tests that only exercise stepper behaviour.
 */
export function hiddenNodesForLevel(level: number, info: HierarchyInfo): Set<string> {
  if (level >= info.maxDepth) return new Set();
  const result = new Set<string>();
  for (const [id, d] of info.depths) {
    if (d > level) result.add(id);
  }
  return result;
}

export interface VisibilityResult {
  /** Nodes to hide from the canvas. */
  hidden: Set<string>;
  /** Nodes that have child subtrees currently hidden — these render a "+" glyph. */
  showsPlus: Set<string>;
  /** Nodes whose child subtrees are currently visible — these render a "−" glyph. */
  showsMinus: Set<string>;
}

/**
 * Unified visibility for REQ-088. BFS from every root; at each node decide
 * whether to walk into its directed children:
 *
 *   reveal(N) = !userCollapsed(N) && (userExpanded(N) || depth(N) < expandLevel)
 *
 * Manual +/- on a node ALWAYS wins over the stepper. Unreachable / cycle
 * nodes (depth fallback = 0) are treated as roots so they stay visible at
 * every level.
 */
export function computeVisibility(
  info: HierarchyInfo,
  edges: GraphEdge[],
  expandLevel: number,
  userCollapsed: Set<string>,
  userExpanded: Set<string>,
): VisibilityResult {
  const outEdges = new Map<string, string[]>();
  for (const id of info.depths.keys()) outEdges.set(id, []);
  for (const e of edges) {
    if (info.depths.has(e.from) && info.depths.has(e.to)) {
      outEdges.get(e.from)!.push(e.to);
    }
  }

  const visible = new Set<string>();
  const queue: string[] = [];

  // Seed with roots AND any depth-0 fallback nodes (cycles / disconnected hubs).
  for (const r of info.roots) {
    if (!visible.has(r)) { visible.add(r); queue.push(r); }
  }
  for (const [id, d] of info.depths) {
    if (d === 0 && !visible.has(id)) { visible.add(id); queue.push(id); }
  }

  const showsPlus = new Set<string>();
  const showsMinus = new Set<string>();

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const depth = info.depths.get(cur) ?? 0;
    const children = outEdges.get(cur) ?? [];

    const reveal =
      !userCollapsed.has(cur) &&
      (userExpanded.has(cur) || depth < expandLevel);

    if (children.length > 0) {
      if (reveal) showsMinus.add(cur);
      else showsPlus.add(cur);
    }

    if (reveal) {
      for (const child of children) {
        if (!visible.has(child)) {
          visible.add(child);
          queue.push(child);
        }
      }
    }
  }

  const hidden = new Set<string>();
  for (const id of info.depths.keys()) {
    if (!visible.has(id)) hidden.add(id);
  }
  return { hidden, showsPlus, showsMinus };
}
