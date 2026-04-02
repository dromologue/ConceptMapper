/**
 * Layout preset algorithms for flow (directed/hierarchical) and radial (centrality) layouts.
 */

/**
 * Compute topological depth for each node based on directed edges.
 * Uses modified Kahn's algorithm with longest-path semantics.
 * Sources (in-degree 0 in directed subgraph) get depth 0; sinks get the highest depth.
 * Nodes in cycles or with no directed edges get maxDepth + 1.
 */
export function computeFlowDepths(
  nodes: { id: string }[],
  edges: { from: string; to: string }[],
  edgeDirected: Map<string, boolean>,
): Map<string, number> {
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    if (!edgeDirected.get(e.from + "→" + e.to)) continue;
    children.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  // Modified Kahn's: longest-path (max depth per node)
  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
      depth.set(n.id, 0);
    }
  }

  let i = 0;
  while (i < queue.length) {
    const curr = queue[i++];
    const d = depth.get(curr)!;
    for (const child of children.get(curr) ?? []) {
      const prev = depth.get(child);
      if (prev === undefined || d + 1 > prev) {
        depth.set(child, d + 1);
      }
      inDegree.set(child, (inDegree.get(child) ?? 0) - 1);
      if (inDegree.get(child) === 0) {
        queue.push(child);
      }
    }
  }

  // Nodes in cycles or unreached get maxDepth + 1
  const maxDepth = Math.max(0, ...depth.values());
  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, maxDepth + 1);
  }

  return depth;
}

/**
 * Compute target positions for radial layout based on degree centrality.
 * Highest-degree nodes at center, lowest at periphery.
 * Nodes at the same degree are spread evenly around a ring with golden-angle offset.
 */
export function computeRadialTargets(
  nodes: { id: string }[],
  edges: { from: string; to: string }[],
  centerX: number,
  centerY: number,
  maxRadius: number,
): Map<string, { x: number; y: number }> {
  // Compute degree
  const deg = new Map<string, number>();
  for (const n of nodes) deg.set(n.id, 0);
  for (const e of edges) {
    deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
    deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
  }

  const maxDeg = Math.max(1, ...deg.values());

  // Group by degree tier
  const tiers = new Map<number, string[]>();
  for (const n of nodes) {
    const d = deg.get(n.id) ?? 0;
    if (!tiers.has(d)) tiers.set(d, []);
    tiers.get(d)!.push(n.id);
  }

  const targets = new Map<string, { x: number; y: number }>();
  const GOLDEN_ANGLE = 137.508 * Math.PI / 180;

  for (const [d, ids] of tiers) {
    // Ring radius: inversely proportional to degree
    const ring = maxRadius * (1 - d / maxDeg);
    const angleStep = (2 * Math.PI) / Math.max(ids.length, 1);
    const ringOffset = d * GOLDEN_ANGLE; // golden angle offset per tier
    for (let i = 0; i < ids.length; i++) {
      const angle = ringOffset + i * angleStep;
      targets.set(ids[i], {
        x: centerX + ring * Math.cos(angle),
        y: centerY + ring * Math.sin(angle),
      });
    }
  }

  return targets;
}
