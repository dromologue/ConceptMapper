/**
 * Network Analysis Engine
 * Pure computation functions operating on node/edge arrays.
 * No React dependencies — can be tested independently.
 */

interface AnalysisNode { id: string }
interface AnalysisEdge { from: string; to: string; directed: boolean; weight: number }

// --- Adjacency helpers ---

type AdjMap = Map<string, Map<string, number>>; // node → neighbor → weight

function buildAdjacency(nodes: AnalysisNode[], edges: AnalysisEdge[]): AdjMap {
  const adj: AdjMap = new Map();
  for (const n of nodes) adj.set(n.id, new Map());
  for (const e of edges) {
    adj.get(e.from)?.set(e.to, e.weight ?? 1);
    if (!e.directed) adj.get(e.to)?.set(e.from, e.weight ?? 1);
  }
  return adj;
}

function nodeIds(nodes: AnalysisNode[]): string[] {
  return nodes.map((n) => n.id);
}

// ============================================================
// NODE-LEVEL METRICS
// ============================================================

/** Degree centrality: fraction of possible connections each node has. */
export function degreeCentrality(nodes: AnalysisNode[], edges: AnalysisEdge[]): Map<string, number> {
  const adj = buildAdjacency(nodes, edges);
  const n = nodes.length;
  const maxDegree = n > 1 ? n - 1 : 1;
  const result = new Map<string, number>();
  for (const id of nodeIds(nodes)) {
    result.set(id, (adj.get(id)?.size ?? 0) / maxDegree);
  }
  return result;
}

/** Raw degree count (not normalized). */
export function degreeCount(nodes: AnalysisNode[], edges: AnalysisEdge[]): Map<string, number> {
  const adj = buildAdjacency(nodes, edges);
  const result = new Map<string, number>();
  for (const id of nodeIds(nodes)) {
    result.set(id, adj.get(id)?.size ?? 0);
  }
  return result;
}

/** BFS shortest paths from a single source. Returns distances map. */
function bfsDistances(adj: AdjMap, source: string): Map<string, number> {
  const dist = new Map<string, number>();
  dist.set(source, 0);
  const queue = [source];
  let i = 0;
  while (i < queue.length) {
    const current = queue[i++];
    const d = dist.get(current)!;
    const neighbors = adj.get(current);
    if (!neighbors) continue;
    for (const [neighbor] of neighbors) {
      if (!dist.has(neighbor)) {
        dist.set(neighbor, d + 1);
        queue.push(neighbor);
      }
    }
  }
  return dist;
}

/** Betweenness centrality (Bridge Score): how often a node sits on shortest paths. */
export function betweennessCentrality(nodes: AnalysisNode[], edges: AnalysisEdge[]): Map<string, number> {
  const adj = buildAdjacency(nodes, edges);
  const ids = nodeIds(nodes);
  const n = ids.length;
  const cb = new Map<string, number>();
  for (const id of ids) cb.set(id, 0);

  for (const s of ids) {
    // BFS from s — Brandes' algorithm
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>(); // number of shortest paths
    const dist = new Map<string, number>();

    for (const v of ids) {
      pred.set(v, []);
      sigma.set(v, 0);
      dist.set(v, -1);
    }
    sigma.set(s, 1);
    dist.set(s, 0);

    const queue = [s];
    let qi = 0;
    while (qi < queue.length) {
      const v = queue[qi++];
      stack.push(v);
      const dv = dist.get(v)!;
      const neighbors = adj.get(v);
      if (!neighbors) continue;
      for (const [w] of neighbors) {
        if (dist.get(w)! < 0) {
          queue.push(w);
          dist.set(w, dv + 1);
        }
        if (dist.get(w) === dv + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }

    // Back-propagation
    const delta = new Map<string, number>();
    for (const v of ids) delta.set(v, 0);

    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        const d = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + d);
      }
      if (w !== s) {
        cb.set(w, cb.get(w)! + delta.get(w)!);
      }
    }
  }

  // Normalize: divide by (n-1)(n-2) for undirected
  const norm = n > 2 ? (n - 1) * (n - 2) : 1;
  const result = new Map<string, number>();
  for (const [id, val] of cb) {
    result.set(id, val / norm);
  }
  return result;
}

/** Closeness centrality (Reach): inverse of average shortest path to all reachable nodes. */
export function closenessCentrality(nodes: AnalysisNode[], edges: AnalysisEdge[]): Map<string, number> {
  const adj = buildAdjacency(nodes, edges);
  const ids = nodeIds(nodes);
  const n = ids.length;
  const result = new Map<string, number>();

  for (const s of ids) {
    const distances = bfsDistances(adj, s);
    let totalDist = 0;
    let reachable = 0;
    for (const [id, d] of distances) {
      if (id !== s && d > 0) {
        totalDist += d;
        reachable++;
      }
    }
    if (reachable > 0 && n > 1) {
      // Wasserman-Faust normalization: (reachable/(n-1)) * (reachable/totalDist)
      result.set(s, (reachable / (n - 1)) * (reachable / totalDist));
    } else {
      result.set(s, 0);
    }
  }
  return result;
}

/** Eigenvector centrality (Influence): power iteration. */
export function eigenvectorCentrality(nodes: AnalysisNode[], edges: AnalysisEdge[], maxIter = 100, tol = 1e-6): Map<string, number> {
  const adj = buildAdjacency(nodes, edges);
  const ids = nodeIds(nodes);
  const n = ids.length;
  if (n === 0) return new Map();

  let scores = new Map<string, number>();
  for (const id of ids) scores.set(id, 1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    const next = new Map<string, number>();
    let norm = 0;

    for (const id of ids) {
      let sum = 0;
      const neighbors = adj.get(id);
      if (neighbors) {
        for (const [neighbor, weight] of neighbors) {
          sum += (scores.get(neighbor) ?? 0) * weight;
        }
      }
      next.set(id, sum);
      norm += sum * sum;
    }

    // Normalize
    norm = Math.sqrt(norm) || 1;
    let diff = 0;
    for (const id of ids) {
      const val = next.get(id)! / norm;
      diff += Math.abs(val - (scores.get(id) ?? 0));
      next.set(id, val);
    }
    scores = next;
    if (diff < tol) break;
  }

  return scores;
}

// ============================================================
// PATH-LEVEL TOOLS
// ============================================================

export interface PathResult {
  paths: string[][];
  distance: number;
  fragileEdge?: { from: string; to: string };
}

/** Find all shortest paths between two nodes via BFS. */
export function findShortestPaths(nodes: AnalysisNode[], edges: AnalysisEdge[], fromId: string, toId: string): PathResult {
  const adj = buildAdjacency(nodes, edges);

  // BFS collecting all shortest paths
  const dist = new Map<string, number>();
  const preds = new Map<string, string[]>(); // predecessors on shortest paths
  dist.set(fromId, 0);
  preds.set(fromId, []);
  const queue = [fromId];
  let qi = 0;

  while (qi < queue.length) {
    const current = queue[qi++];
    const d = dist.get(current)!;
    if (dist.has(toId) && d >= dist.get(toId)!) break; // found all shortest

    const neighbors = adj.get(current);
    if (!neighbors) continue;
    for (const [neighbor] of neighbors) {
      if (!dist.has(neighbor)) {
        dist.set(neighbor, d + 1);
        preds.set(neighbor, [current]);
        queue.push(neighbor);
      } else if (dist.get(neighbor) === d + 1) {
        preds.get(neighbor)!.push(current);
      }
    }
  }

  if (!dist.has(toId)) return { paths: [], distance: Infinity };

  // Reconstruct all paths by backtracking from toId
  const paths: string[][] = [];
  function backtrack(node: string, path: string[]) {
    if (node === fromId) {
      paths.push([fromId, ...path]);
      return;
    }
    for (const pred of preds.get(node) ?? []) {
      backtrack(pred, [node, ...path]);
    }
  }
  backtrack(toId, []);

  // Find fragile edge: edge on the path whose removal increases distance most
  let fragileEdge: { from: string; to: string } | undefined;
  if (paths.length > 0) {
    const mainPath = paths[0];
    let maxIncrease = 0;
    for (let i = 0; i < mainPath.length - 1; i++) {
      const a = mainPath[i], b = mainPath[i + 1];
      // Remove this edge and recompute distance
      const filteredEdges = edges.filter((e) =>
        !((e.from === a && e.to === b) || (!e.directed && e.from === b && e.to === a))
      );
      const altAdj = buildAdjacency(nodes, filteredEdges);
      const altDist = bfsDistances(altAdj, fromId);
      const newDist = altDist.get(toId) ?? Infinity;
      const increase = newDist - dist.get(toId)!;
      if (increase > maxIncrease) {
        maxIncrease = increase;
        fragileEdge = { from: a, to: b };
      }
    }
  }

  return { paths, distance: dist.get(toId)!, fragileEdge };
}

// ============================================================
// GROUP-LEVEL TOOLS
// ============================================================

/** Community detection via label propagation. Returns node ID → community index. */
export function detectCommunities(nodes: AnalysisNode[], edges: AnalysisEdge[]): Map<string, number> {
  const adj = buildAdjacency(nodes, edges);
  const ids = nodeIds(nodes);

  // Initialize: each node in its own community
  const labels = new Map<string, number>();
  ids.forEach((id, i) => labels.set(id, i));

  // Iterate until stable (max 50 iterations)
  for (let iter = 0; iter < 50; iter++) {
    let changed = false;
    // Shuffle node order for each iteration (deterministic shuffle using iteration as seed)
    const shuffled = [...ids].sort((a, b) => {
      const ha = Math.sin(a.length * 9301 + iter * 49297) * 43758.5453;
      const hb = Math.sin(b.length * 9301 + iter * 49297) * 43758.5453;
      return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
    });

    for (const node of shuffled) {
      const neighbors = adj.get(node);
      if (!neighbors || neighbors.size === 0) continue;

      // Count neighbor labels
      const labelCounts = new Map<number, number>();
      for (const [neighbor, weight] of neighbors) {
        const nl = labels.get(neighbor)!;
        labelCounts.set(nl, (labelCounts.get(nl) ?? 0) + weight);
      }

      // Pick most frequent label
      let bestLabel = labels.get(node)!;
      let bestCount = 0;
      for (const [label, count] of labelCounts) {
        if (count > bestCount) {
          bestCount = count;
          bestLabel = label;
        }
      }

      if (bestLabel !== labels.get(node)) {
        labels.set(node, bestLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Normalize community indices to 0, 1, 2, ...
  const uniqueLabels = [...new Set(labels.values())];
  const labelMap = new Map<number, number>();
  uniqueLabels.forEach((l, i) => labelMap.set(l, i));

  const result = new Map<string, number>();
  for (const [id, label] of labels) {
    result.set(id, labelMap.get(label)!);
  }
  return result;
}

/** Newman's modularity Q for a given partition. */
export function modularity(nodes: AnalysisNode[], edges: AnalysisEdge[], communities: Map<string, number>): number {
  const m = edges.reduce((sum, e) => sum + (e.directed ? 1 : 2), 0) / 2; // total edge weight (undirected count)
  if (m === 0) return 0;

  const adj = buildAdjacency(nodes, edges);
  const degree = new Map<string, number>();
  for (const [id, neighbors] of adj) {
    let d = 0;
    for (const [, w] of neighbors) d += w;
    degree.set(id, d);
  }

  let q = 0;
  for (const [i, neighbors] of adj) {
    for (const [j, w] of neighbors) {
      if (communities.get(i) === communities.get(j)) {
        q += w - (degree.get(i)! * degree.get(j)!) / (2 * m);
      }
    }
  }

  return q / (2 * m);
}

/** K-core decomposition: returns node ID → core number. */
export function kCoreDecomposition(nodes: AnalysisNode[], edges: AnalysisEdge[]): Map<string, number> {
  const adj = buildAdjacency(nodes, edges);
  const degree = new Map<string, number>();
  for (const id of nodeIds(nodes)) {
    degree.set(id, adj.get(id)?.size ?? 0);
  }

  const core = new Map<string, number>();
  const removed = new Set<string>();
  let k = 0;

  while (removed.size < nodes.length) {
    // Find all nodes with degree <= k (in remaining graph)
    let found = true;
    while (found) {
      found = false;
      for (const [id, d] of degree) {
        if (removed.has(id)) continue;
        if (d <= k) {
          core.set(id, k);
          removed.add(id);
          // Decrease degree of neighbors
          const neighbors = adj.get(id);
          if (neighbors) {
            for (const [neighbor] of neighbors) {
              if (!removed.has(neighbor)) {
                degree.set(neighbor, (degree.get(neighbor) ?? 0) - 1);
              }
            }
          }
          found = true;
        }
      }
    }
    k++;
  }

  return core;
}

/** Network diameter: longest shortest path in the graph. */
export function networkDiameter(nodes: AnalysisNode[], edges: AnalysisEdge[]): number {
  const adj = buildAdjacency(nodes, edges);
  let maxDist = 0;
  for (const n of nodes) {
    const distances = bfsDistances(adj, n.id);
    for (const [, d] of distances) {
      if (d > maxDist && isFinite(d)) maxDist = d;
    }
  }
  return maxDist;
}

/** Graph density: actual edges / possible edges. */
export function graphDensity(nodes: AnalysisNode[], edges: AnalysisEdge[]): number {
  const n = nodes.length;
  if (n < 2) return 0;
  const possibleEdges = n * (n - 1) / 2;
  // Count unique undirected edges
  const edgeSet = new Set<string>();
  for (const e of edges) {
    const key = [e.from, e.to].sort().join("|");
    edgeSet.add(key);
  }
  return edgeSet.size / possibleEdges;
}

// ============================================================
// AGGREGATE ANALYSIS RESULT
// ============================================================

export interface NetworkAnalysis {
  // Network-level
  nodeCount: number;
  edgeCount: number;
  density: number;
  diameter: number;
  avgDegree: number;
  modularityScore: number;
  communityCount: number;

  // Per-node
  degree: Map<string, number>;
  degreeCounts: Map<string, number>;
  betweenness: Map<string, number>;
  closeness: Map<string, number>;
  eigenvector: Map<string, number>;
  communities: Map<string, number>;
  kCore: Map<string, number>;
}

/** Compute all analysis metrics for a graph. */
export function analyzeNetwork(nodes: AnalysisNode[], edges: AnalysisEdge[]): NetworkAnalysis {
  const degree = degreeCentrality(nodes, edges);
  const degreeCounts = degreeCount(nodes, edges);
  const betweenness = betweennessCentrality(nodes, edges);
  const closeness = closenessCentrality(nodes, edges);
  const eigenvector = eigenvectorCentrality(nodes, edges);
  const communities = detectCommunities(nodes, edges);
  const kCore = kCoreDecomposition(nodes, edges);
  const density = graphDensity(nodes, edges);
  const diameter = networkDiameter(nodes, edges);
  const modularityScore = modularity(nodes, edges, communities);

  let totalDegree = 0;
  for (const [, d] of degreeCounts) totalDegree += d;
  const avgDegree = nodes.length > 0 ? totalDegree / nodes.length : 0;

  const communityCount = new Set(communities.values()).size;

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    density,
    diameter,
    avgDegree,
    modularityScore,
    communityCount,
    degree,
    degreeCounts,
    betweenness,
    closeness,
    eigenvector,
    communities,
    kCore,
  };
}
