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

/** Fixed spacing between depth levels in flow layout (in force-space units) */
const FLOW_DEPTH_GAP = 200;
/** Horizontal spacing between nodes at the same depth */
const FLOW_NODE_GAP = 120;

/**
 * Compute full X+Y target positions for flow layout.
 * Uses fixed generous spacing (not constrained to canvas) — fitToView handles zoom.
 * - Y is driven by topological depth with fixed gaps
 * - X is driven by connected component lanes, with same-depth nodes ordered by parent position
 */
export function computeFlowPositions(
  nodes: { id: string }[],
  edges: { from: string; to: string }[],
  edgeDirected: Map<string, boolean>,
  depths: Map<string, number>,
): Map<string, { x: number; y: number }> {
  // Build parent map (directed parents) for ordering
  const parents = new Map<string, string[]>();
  for (const n of nodes) parents.set(n.id, []);
  for (const e of edges) {
    if (edgeDirected.get(e.from + "→" + e.to)) {
      parents.get(e.to)?.push(e.from);
    }
  }

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
  components.sort((a, b) => b.length - a.length);

  const positions = new Map<string, { x: number; y: number }>();

  // Track the max width of each component for horizontal stacking
  let compXOffset = 0;
  const COMP_GAP = 250; // gap between components

  for (const comp of components) {
    // Group by depth
    const byDepth = new Map<number, string[]>();
    for (const id of comp) {
      const d = depths.get(id) ?? 0;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(id);
    }

    // First pass: assign initial X within component (centered at 0)
    const xPos = new Map<string, number>();
    for (const ids of byDepth.values()) {
      const count = ids.length;
      const totalWidth = (count - 1) * FLOW_NODE_GAP;
      for (let j = 0; j < count; j++) {
        xPos.set(ids[j], -totalWidth / 2 + j * FLOW_NODE_GAP);
      }
    }

    // Second pass: reorder same-depth nodes by average parent X position
    const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b);
    for (const d of sortedDepths) {
      const ids = byDepth.get(d)!;
      if (ids.length <= 1) continue;
      ids.sort((a, b) => {
        const pa = parents.get(a) ?? [];
        const pb = parents.get(b) ?? [];
        const avgA = pa.length > 0 ? pa.reduce((s, p) => s + (xPos.get(p) ?? 0), 0) / pa.length : 0;
        const avgB = pb.length > 0 ? pb.reduce((s, p) => s + (xPos.get(p) ?? 0), 0) / pb.length : 0;
        return avgA - avgB;
      });
      const count = ids.length;
      const totalWidth = (count - 1) * FLOW_NODE_GAP;
      for (let j = 0; j < count; j++) {
        xPos.set(ids[j], -totalWidth / 2 + j * FLOW_NODE_GAP);
      }
    }

    // Find component width
    let minX = Infinity, maxX = -Infinity;
    for (const id of comp) {
      const x = xPos.get(id) ?? 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    const compWidth = maxX - minX;
    const compCenter = compXOffset + compWidth / 2;

    // Assign final positions
    for (const id of comp) {
      const d = depths.get(id) ?? 0;
      positions.set(id, {
        x: compCenter + (xPos.get(id) ?? 0),
        y: d * FLOW_DEPTH_GAP,
      });
    }

    compXOffset += compWidth + COMP_GAP;
  }

  return positions;
}

/**
 * Compute target positions for radial layout based on degree centrality.
 * Uses fixed spacing (not constrained to canvas) — fitToView handles zoom.
 * Highest-degree nodes at center, lowest at periphery.
 */
export function computeRadialTargets(
  nodes: { id: string }[],
  edges: { from: string; to: string }[],
  centerX: number,
  centerY: number,
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
  // Fixed ring spacing — generous, fitToView zooms to fit
  const RING_GAP = 150;
  const maxRadius = RING_GAP * maxDeg;

  for (const [d, ids] of tiers) {
    // Ring radius: inversely proportional to degree
    const ring = maxRadius * (1 - d / maxDeg);
    const angleStep = (2 * Math.PI) / Math.max(ids.length, 1);
    const ringOffset = d * GOLDEN_ANGLE;
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
