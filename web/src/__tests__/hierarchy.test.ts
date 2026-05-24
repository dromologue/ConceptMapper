// SPEC: REQ-088 (Collapse/Expand to Level)
import { describe, it, expect } from "vitest";
import { computeHierarchy, collapsedNodesForLevel, hiddenNodesForLevel, computeVisibility } from "../graph/hierarchy";
import type { GraphNode, GraphEdge } from "../types/graph-ir";

function n(id: string): GraphNode {
  return { id, node_type: "node", name: id };
}
function e(from: string, to: string): GraphEdge {
  return { from, to, edge_type: "contains", directed: true, weight: 1, visual: { style: "solid", show_arrow: true } };
}

describe("computeHierarchy", () => {
  it("returns depth 0 for an isolated node", () => {
    const info = computeHierarchy([n("a")], []);
    expect(info.roots).toEqual(["a"]);
    expect(info.depths.get("a")).toBe(0);
    expect(info.maxDepth).toBe(0);
  });

  it("computes depths via BFS from roots along directed edges", () => {
    // root → a → b → c
    const nodes = [n("root"), n("a"), n("b"), n("c")];
    const edges = [e("root", "a"), e("a", "b"), e("b", "c")];
    const info = computeHierarchy(nodes, edges);
    expect(info.roots).toEqual(["root"]);
    expect(info.depths.get("root")).toBe(0);
    expect(info.depths.get("a")).toBe(1);
    expect(info.depths.get("b")).toBe(2);
    expect(info.depths.get("c")).toBe(3);
    expect(info.maxDepth).toBe(3);
  });

  it("treats nodes with no incoming directed edge as roots, regardless of how many", () => {
    const nodes = [n("r1"), n("r2"), n("x")];
    const edges = [e("r1", "x"), e("r2", "x")];
    const info = computeHierarchy(nodes, edges);
    expect(info.roots).toEqual(["r1", "r2"]);
    expect(info.depths.get("x")).toBe(1);
  });

  it("uses shortest path when a node is reachable from multiple roots at different depths", () => {
    // r → a → x ; r → x  (direct shortcut)
    const nodes = [n("r"), n("a"), n("x")];
    const edges = [e("r", "a"), e("a", "x"), e("r", "x")];
    const info = computeHierarchy(nodes, edges);
    expect(info.depths.get("x")).toBe(1);
  });

  it("assigns depth 0 to nodes unreachable from any root (cycles or disconnected)", () => {
    const nodes = [n("a"), n("b")];
    const edges = [e("a", "b"), e("b", "a")];  // pure cycle, no root
    const info = computeHierarchy(nodes, edges);
    expect(info.roots).toEqual([]);
    expect(info.depths.get("a")).toBe(0);
    expect(info.depths.get("b")).toBe(0);
  });

  it("ignores edges that reference unknown nodes", () => {
    const nodes = [n("a"), n("b")];
    const edges = [e("a", "b"), e("ghost", "b"), e("a", "phantom")];
    const info = computeHierarchy(nodes, edges);
    expect(info.depths.get("a")).toBe(0);
    expect(info.depths.get("b")).toBe(1);
  });
});

describe("collapsedNodesForLevel", () => {
  // tree: root → [a, b]; a → [a1, a2]; b → [b1]
  const nodes = [n("root"), n("a"), n("b"), n("a1"), n("a2"), n("b1")];
  const edges = [e("root", "a"), e("root", "b"), e("a", "a1"), e("a", "a2"), e("b", "b1")];
  const info = computeHierarchy(nodes, edges);

  it("level 0 collapses only roots that have outgoing edges", () => {
    const collapsed = collapsedNodesForLevel(0, info, edges);
    expect(collapsed).toEqual(new Set(["root"]));
  });

  it("level 1 collapses depth-1 nodes that have outgoing edges", () => {
    const collapsed = collapsedNodesForLevel(1, info, edges);
    // a (→ a1, a2) and b (→ b1) both have children
    expect(collapsed).toEqual(new Set(["a", "b"]));
  });

  it("level equal to or greater than maxDepth collapses nothing", () => {
    expect(collapsedNodesForLevel(info.maxDepth, info, edges)).toEqual(new Set());
    expect(collapsedNodesForLevel(99, info, edges)).toEqual(new Set());
  });

  it("never collapses leaves (no outgoing edges)", () => {
    const collapsed = collapsedNodesForLevel(2, info, edges);
    // a1, a2, b1 are leaves → not collapsed
    expect(collapsed).toEqual(new Set());
  });
});

describe("hiddenNodesForLevel (REQ-088 fix — tree-shaped graphs)", () => {
  // The bug: bidirectional cascade in computeCollapseState refuses to hide
  // interior nodes whose children aren't also collapsed. For a tree rooted
  // at "root" with children {a, b} and grandchildren {a1, a2, b1}:
  //   - collapsing {root} alone doesn't hide a, b, a1, a2, b1
  //     (each has at least one non-collapsed neighbour).
  // hiddenNodesForLevel sidesteps the cascade and hides strictly by depth.
  const nodes = [n("root"), n("a"), n("b"), n("a1"), n("a2"), n("b1")];
  const edges = [e("root", "a"), e("root", "b"), e("a", "a1"), e("a", "a2"), e("b", "b1")];
  const info = computeHierarchy(nodes, edges);

  it("level 0 hides every descendant of every root", () => {
    const hidden = hiddenNodesForLevel(0, info);
    expect(hidden).toEqual(new Set(["a", "b", "a1", "a2", "b1"]));
  });

  it("level 1 reveals depth-1 children but still hides their children", () => {
    const hidden = hiddenNodesForLevel(1, info);
    expect(hidden).toEqual(new Set(["a1", "a2", "b1"]));
  });

  it("level >= maxDepth hides nothing", () => {
    expect(hiddenNodesForLevel(info.maxDepth, info)).toEqual(new Set());
    expect(hiddenNodesForLevel(99, info)).toEqual(new Set());
  });

  it("graphs with no edges (maxDepth = 0) hide nothing at any level", () => {
    const isolated = computeHierarchy([n("a"), n("b")], []);
    expect(hiddenNodesForLevel(0, isolated)).toEqual(new Set());
  });

  it("deep chain: each level reveals exactly one more node", () => {
    const chainNodes = [n("r"), n("a"), n("b"), n("c")];
    const chainEdges = [e("r", "a"), e("a", "b"), e("b", "c")];
    const chainInfo = computeHierarchy(chainNodes, chainEdges);
    expect(hiddenNodesForLevel(0, chainInfo)).toEqual(new Set(["a", "b", "c"]));
    expect(hiddenNodesForLevel(1, chainInfo)).toEqual(new Set(["b", "c"]));
    expect(hiddenNodesForLevel(2, chainInfo)).toEqual(new Set(["c"]));
    expect(hiddenNodesForLevel(3, chainInfo)).toEqual(new Set());
  });
});

describe("computeVisibility (REQ-088 unified model)", () => {
  // tree: root → [a, b]; a → [a1, a2]; b → [b1]
  const nodes = [n("root"), n("a"), n("b"), n("a1"), n("a2"), n("b1")];
  const edges = [e("root", "a"), e("root", "b"), e("a", "a1"), e("a", "a2"), e("b", "b1")];
  const info = computeHierarchy(nodes, edges);
  const empty = new Set<string>();

  it("level 0 with no overrides: only roots visible, root shows '+'", () => {
    const v = computeVisibility(info, edges, 0, empty, empty);
    expect(v.hidden).toEqual(new Set(["a", "b", "a1", "a2", "b1"]));
    expect(v.showsPlus).toEqual(new Set(["root"]));
    expect(v.showsMinus).toEqual(new Set());
  });

  it("level is CUMULATIVE — stepping to 2 still shows level 1 (user-reported bug)", () => {
    const v = computeVisibility(info, edges, 2, empty, empty);
    expect(v.hidden).toEqual(new Set()); // depth 0, 1, 2 all visible; no depth-3 nodes
    // root and a, b all have children currently visible → "−"
    expect(v.showsMinus).toEqual(new Set(["root", "a", "b"]));
    expect(v.showsPlus).toEqual(new Set());
  });

  it("level 1: roots + their children visible; depth-2 hidden; a/b show '+'", () => {
    const v = computeVisibility(info, edges, 1, empty, empty);
    expect(v.hidden).toEqual(new Set(["a1", "a2", "b1"]));
    expect(v.showsPlus).toEqual(new Set(["a", "b"]));     // their children are hidden
    expect(v.showsMinus).toEqual(new Set(["root"]));      // root's children are visible
  });

  it("manual '+' on a collapsed node overrides the stepper (REQ-088)", () => {
    // Stepper at level 0 (only root visible). User clicks '+' on root.
    const v = computeVisibility(info, edges, 0, empty, new Set(["root"]));
    expect(v.hidden).toEqual(new Set(["a1", "a2", "b1"])); // root expanded by 1 layer
    expect(v.showsMinus).toEqual(new Set(["root"]));
    expect(v.showsPlus).toEqual(new Set(["a", "b"]));
  });

  it("manual '−' on a node overrides the stepper", () => {
    // Stepper at level 3 (everything visible). User collapses 'a'.
    const v = computeVisibility(info, edges, 3, new Set(["a"]), empty);
    expect(v.hidden).toEqual(new Set(["a1", "a2"]));      // a's subtree hidden
    expect(v.showsPlus).toEqual(new Set(["a"]));          // a shows '+'
    expect(v.showsMinus).toEqual(new Set(["root", "b"])); // others still expanded
  });

  it("manual expand on one node + manual collapse on a sibling at the same level", () => {
    // User opens at level 0 (only root visible), clicks + on root (sees a, b),
    // clicks + on a (sees a1, a2), clicks − on b (b1 stays hidden).
    const v = computeVisibility(info, edges, 0, new Set(["b"]), new Set(["root", "a"]));
    expect(v.hidden).toEqual(new Set(["b1"]));
    expect(v.showsMinus.has("a")).toBe(true);
    expect(v.showsMinus.has("root")).toBe(true);
    expect(v.showsPlus.has("b")).toBe(true);
  });
});
