// SPEC: REQ-088 (Collapse/Expand to Level)
import { describe, it, expect } from "vitest";
import { computeHierarchy, collapsedNodesForLevel } from "../graph/hierarchy";
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
