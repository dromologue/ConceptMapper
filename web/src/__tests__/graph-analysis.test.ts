import { describe, it, expect } from "vitest";
import {
  degreeCentrality, degreeCount, betweennessCentrality, closenessCentrality,
  eigenvectorCentrality, findShortestPaths, detectCommunities, modularity,
  kCoreDecomposition, networkDiameter, graphDensity, analyzeNetwork,
} from "../utils/graph-analysis";

// SPEC: REQ-063 - Network Analysis Engine

// --- Test fixtures ---

const triangleNodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
const triangleEdges = [
  { from: "a", to: "b", directed: false, weight: 1 },
  { from: "b", to: "c", directed: false, weight: 1 },
  { from: "a", to: "c", directed: false, weight: 1 },
];

const lineNodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const lineEdges = [
  { from: "a", to: "b", directed: false, weight: 1 },
  { from: "b", to: "c", directed: false, weight: 1 },
  { from: "c", to: "d", directed: false, weight: 1 },
];

const starNodes = [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const starEdges = [
  { from: "hub", to: "a", directed: false, weight: 1 },
  { from: "hub", to: "b", directed: false, weight: 1 },
  { from: "hub", to: "c", directed: false, weight: 1 },
  { from: "hub", to: "d", directed: false, weight: 1 },
];

// Two clusters connected by a bridge
const bridgeNodes = [
  { id: "a1" }, { id: "a2" }, { id: "a3" },
  { id: "b1" }, { id: "b2" }, { id: "b3" },
];
const bridgeEdges = [
  { from: "a1", to: "a2", directed: false, weight: 1 },
  { from: "a2", to: "a3", directed: false, weight: 1 },
  { from: "a1", to: "a3", directed: false, weight: 1 },
  { from: "b1", to: "b2", directed: false, weight: 1 },
  { from: "b2", to: "b3", directed: false, weight: 1 },
  { from: "b1", to: "b3", directed: false, weight: 1 },
  { from: "a3", to: "b1", directed: false, weight: 1 }, // bridge
];

// --- Degree centrality ---

describe("degreeCentrality", () => {
  it("returns normalized degree for triangle (all equal)", () => {
    const result = degreeCentrality(triangleNodes, triangleEdges);
    expect(result.get("a")).toBe(1); // 2 connections / (3-1) = 1.0
    expect(result.get("b")).toBe(1);
    expect(result.get("c")).toBe(1);
  });

  it("star hub has highest degree", () => {
    const result = degreeCentrality(starNodes, starEdges);
    expect(result.get("hub")).toBe(1); // 4/(5-1) = 1.0
    expect(result.get("a")).toBe(0.25); // 1/4
  });

  it("returns 0 for isolated nodes", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const result = degreeCentrality(nodes, []);
    expect(result.get("a")).toBe(0);
  });
});

describe("degreeCount", () => {
  it("counts raw connections", () => {
    const result = degreeCount(starNodes, starEdges);
    expect(result.get("hub")).toBe(4);
    expect(result.get("a")).toBe(1);
  });
});

// --- Betweenness centrality ---

describe("betweennessCentrality", () => {
  it("line center nodes have highest betweenness", () => {
    const result = betweennessCentrality(lineNodes, lineEdges);
    // b and c are on more shortest paths than a and d
    expect(result.get("b")!).toBeGreaterThan(result.get("a")!);
    expect(result.get("c")!).toBeGreaterThan(result.get("d")!);
  });

  it("triangle nodes have zero betweenness (no intermediaries)", () => {
    const result = betweennessCentrality(triangleNodes, triangleEdges);
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(0);
  });

  it("bridge node has highest betweenness", () => {
    const result = betweennessCentrality(bridgeNodes, bridgeEdges);
    // a3 and b1 are the bridge endpoints
    expect(result.get("a3")!).toBeGreaterThan(result.get("a1")!);
    expect(result.get("b1")!).toBeGreaterThan(result.get("b2")!);
  });
});

// --- Closeness centrality ---

describe("closenessCentrality", () => {
  it("center of star has highest closeness", () => {
    const result = closenessCentrality(starNodes, starEdges);
    expect(result.get("hub")!).toBeGreaterThan(result.get("a")!);
  });

  it("all triangle nodes have equal closeness", () => {
    const result = closenessCentrality(triangleNodes, triangleEdges);
    expect(result.get("a")).toBeCloseTo(result.get("b")!, 6);
    expect(result.get("b")).toBeCloseTo(result.get("c")!, 6);
  });
});

// --- Eigenvector centrality ---

describe("eigenvectorCentrality", () => {
  it("star hub has highest eigenvector centrality", () => {
    const result = eigenvectorCentrality(starNodes, starEdges);
    // Hub connects to all leaves; its score should be >= any leaf
    expect(result.get("hub")!).toBeGreaterThanOrEqual(result.get("a")!);
  });

  it("all triangle nodes have equal eigenvector centrality", () => {
    const result = eigenvectorCentrality(triangleNodes, triangleEdges);
    expect(result.get("a")).toBeCloseTo(result.get("b")!, 4);
  });

  it("returns empty map for empty graph", () => {
    const result = eigenvectorCentrality([], []);
    expect(result.size).toBe(0);
  });
});

// --- Shortest paths ---

describe("findShortestPaths", () => {
  it("finds direct path in triangle", () => {
    const result = findShortestPaths(triangleNodes, triangleEdges, "a", "b");
    expect(result.distance).toBe(1);
    expect(result.paths.length).toBeGreaterThanOrEqual(1);
    expect(result.paths[0]).toEqual(["a", "b"]);
  });

  it("finds path through line graph", () => {
    const result = findShortestPaths(lineNodes, lineEdges, "a", "d");
    expect(result.distance).toBe(3);
    expect(result.paths[0]).toEqual(["a", "b", "c", "d"]);
  });

  it("returns Infinity for disconnected nodes", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const result = findShortestPaths(nodes, [], "a", "b");
    expect(result.distance).toBe(Infinity);
    expect(result.paths).toHaveLength(0);
  });

  it("finds multiple shortest paths when they exist", () => {
    // Square: a-b-d and a-c-d are both length 2
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [
      { from: "a", to: "b", directed: false, weight: 1 },
      { from: "a", to: "c", directed: false, weight: 1 },
      { from: "b", to: "d", directed: false, weight: 1 },
      { from: "c", to: "d", directed: false, weight: 1 },
    ];
    const result = findShortestPaths(nodes, edges, "a", "d");
    expect(result.distance).toBe(2);
    expect(result.paths.length).toBe(2);
  });

  it("identifies fragile edge on the path", () => {
    const result = findShortestPaths(lineNodes, lineEdges, "a", "d");
    expect(result.fragileEdge).toBeDefined();
    // Any edge on the only path is equally fragile
  });
});

// --- Community detection ---

describe("detectCommunities", () => {
  it("detects two communities in bridge graph", () => {
    const result = detectCommunities(bridgeNodes, bridgeEdges);
    // a1, a2, a3 should be in one community; b1, b2, b3 in another (or bridge nodes may merge)
    const communityA = result.get("a1")!;
    expect(result.get("a2")).toBe(communityA);
    // b2 and b3 should be in same community
    const communityB = result.get("b2")!;
    expect(result.get("b3")).toBe(communityB);
  });

  it("assigns single community to fully connected graph", () => {
    const result = detectCommunities(triangleNodes, triangleEdges);
    const values = [...result.values()];
    expect(new Set(values).size).toBe(1); // all in one community
  });

  it("assigns separate communities to disconnected components", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [
      { from: "a", to: "b", directed: false, weight: 1 },
      { from: "c", to: "d", directed: false, weight: 1 },
    ];
    const result = detectCommunities(nodes, edges);
    expect(result.get("a")).toBe(result.get("b"));
    expect(result.get("c")).toBe(result.get("d"));
    expect(result.get("a")).not.toBe(result.get("c"));
  });
});

// --- Modularity ---

describe("modularity", () => {
  it("returns positive modularity for good partition", () => {
    const communities = detectCommunities(bridgeNodes, bridgeEdges);
    const q = modularity(bridgeNodes, bridgeEdges, communities);
    expect(q).toBeGreaterThan(0);
  });

  it("returns a number for single-community graph", () => {
    const communities = new Map([["a", 0], ["b", 0], ["c", 0]]);
    const q = modularity(triangleNodes, triangleEdges, communities);
    // Single community: modularity can be non-zero (measures within vs expected)
    expect(typeof q).toBe("number");
    expect(isFinite(q)).toBe(true);
  });
});

// --- K-core decomposition ---

describe("kCoreDecomposition", () => {
  it("star leaves have core 1, hub depends on structure", () => {
    const result = kCoreDecomposition(starNodes, starEdges);
    expect(result.get("a")).toBe(1);
    expect(result.get("b")).toBe(1);
    expect(result.get("hub")).toBe(1); // hub connected to degree-1 nodes
  });

  it("triangle nodes are all in 2-core", () => {
    const result = kCoreDecomposition(triangleNodes, triangleEdges);
    expect(result.get("a")).toBe(2);
    expect(result.get("b")).toBe(2);
    expect(result.get("c")).toBe(2);
  });
});

// --- Network diameter ---

describe("networkDiameter", () => {
  it("triangle has diameter 1", () => {
    expect(networkDiameter(triangleNodes, triangleEdges)).toBe(1);
  });

  it("line of 4 has diameter 3", () => {
    expect(networkDiameter(lineNodes, lineEdges)).toBe(3);
  });
});

// --- Graph density ---

describe("graphDensity", () => {
  it("complete triangle has density 1.0", () => {
    expect(graphDensity(triangleNodes, triangleEdges)).toBeCloseTo(1.0, 6);
  });

  it("line of 4 has density 0.5", () => {
    expect(graphDensity(lineNodes, lineEdges)).toBeCloseTo(0.5, 6);
  });

  it("empty graph has density 0", () => {
    expect(graphDensity([{ id: "a" }, { id: "b" }], [])).toBe(0);
  });
});

// --- Aggregate analysis ---

describe("analyzeNetwork", () => {
  it("computes all metrics without errors", () => {
    const result = analyzeNetwork(bridgeNodes, bridgeEdges);
    expect(result.nodeCount).toBe(6);
    expect(result.edgeCount).toBe(7);
    expect(result.density).toBeGreaterThan(0);
    expect(result.diameter).toBeGreaterThan(0);
    expect(result.avgDegree).toBeGreaterThan(0);
    expect(result.communityCount).toBeGreaterThanOrEqual(1);
    expect(result.degree.size).toBe(6);
    expect(result.betweenness.size).toBe(6);
    expect(result.closeness.size).toBe(6);
    expect(result.eigenvector.size).toBe(6);
    expect(result.communities.size).toBe(6);
    expect(result.kCore.size).toBe(6);
  });

  it("handles empty graph", () => {
    const result = analyzeNetwork([], []);
    expect(result.nodeCount).toBe(0);
    expect(result.edgeCount).toBe(0);
    expect(result.density).toBe(0);
  });
});
