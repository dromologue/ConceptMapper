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
 * Compute X-lane positions for flow layout by finding connected components
 * in the full graph (directed + undirected) and assigning each component
 * a horizontal lane. Within each component, nodes at the same depth are
 * spread evenly across the lane width.
 */
export function computeFlowXPositions(
  nodes: { id: string }[],
  edges: { from: string; to: string }[],
  depths: Map<string, number>,
  vw: number,
): Map<string, number> {
  // Build undirected adjacency for component detection
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  }

  // Find connected components via BFS
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const n of nodes) {
    if (visited.has(n.id)) continue;
    const comp: string[] = [];
    const q = [n.id];
    visited.add(n.id);
    let j = 0;
    while (j < q.length) {
      const cur = q[j++];
      comp.push(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
      }
    }
    components.push(comp);
  }

  // Sort components by size (largest first) for better use of space
  components.sort((a, b) => b.length - a.length);

  const xPos = new Map<string, number>();
  const numComps = components.length;
  const margin = 0.08; // 8% margin on each side
  const usableWidth = vw * (1 - 2 * margin);

  for (let ci = 0; ci < numComps; ci++) {
    const comp = components[ci];
    // Lane center for this component
    const laneCenter = vw * margin + usableWidth * (ci + 0.5) / Math.max(numComps, 1);
    const laneWidth = usableWidth / Math.max(numComps, 1);

    // Group nodes by depth within this component
    const byDepth = new Map<number, string[]>();
    for (const id of comp) {
      const d = depths.get(id) ?? 0;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(id);
    }

    // Spread nodes at same depth across lane width
    for (const ids of byDepth.values()) {
      const count = ids.length;
      for (let j = 0; j < count; j++) {
        const offset = count === 1 ? 0 : (j / (count - 1) - 0.5) * laneWidth * 0.8;
        xPos.set(ids[j], laneCenter + offset);
      }
    }
  }

  return xPos;
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
