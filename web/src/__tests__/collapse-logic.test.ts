import { describe, it, expect } from "vitest";
import { computeCollapseState } from "../graph/collapse-utils";
import type { GraphEdge } from "../types/graph-ir";

function edge(from: string, to: string, directed: boolean): GraphEdge {
  return {
    from, to, directed,
    edge_type: "test", edge_category: "thinker_thinker",
    weight: 1.0, visual: { style: "solid", show_arrow: directed },
  };
}

describe("computeCollapseState", () => {
  // --- hasChildren ---

  it("marks nodes with directed children", () => {
    const edges = [edge("A", "B", true), edge("A", "C", true)];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(true);
    expect(hasChildren.has("B")).toBe(false);
  });

  it("marks both ends of undirected edges as having children", () => {
    const edges = [edge("A", "B", false)];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(true);
    expect(hasChildren.has("B")).toBe(true);
  });

  it("handles mixed directed and undirected edges", () => {
    const edges = [
      edge("A", "B", true),   // A → B
      edge("C", "D", false),  // C — D (rivalry/alliance style)
    ];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(true);
    expect(hasChildren.has("B")).toBe(false);
    expect(hasChildren.has("C")).toBe(true);
    expect(hasChildren.has("D")).toBe(true);
  });

  it("returns empty hasChildren for no edges", () => {
    const { hasChildren } = computeCollapseState([], new Set());
    expect(hasChildren.size).toBe(0);
  });

  // --- hiddenByCollapse (directed) ---

  it("hides child when sole parent is collapsed", () => {
    const edges = [edge("A", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  it("does not hide child with another non-collapsed parent", () => {
    const edges = [edge("A", "B", true), edge("C", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(false);
  });

  it("hides child when all parents are collapsed", () => {
    const edges = [edge("A", "B", true), edge("C", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A", "C"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  // --- hiddenByCollapse (undirected) ---

  it("hides undirected neighbor when sole connection is collapsed", () => {
    const edges = [edge("A", "B", false)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  it("does not hide undirected neighbor with other connections", () => {
    const edges = [edge("A", "B", false), edge("C", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(false);
  });

  // --- cascading collapse ---

  it("cascades: hiding A hides B, which then hides C", () => {
    const edges = [edge("A", "B", true), edge("B", "C", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
    expect(hiddenByCollapse.has("C")).toBe(true);
  });

  it("collapsed nodes themselves are NOT hidden (they show +)", () => {
    const edges = [edge("A", "B", true)];
    const collapsed = new Set(["A"]);
    const { hiddenByCollapse } = computeCollapseState(edges, collapsed);
    expect(hiddenByCollapse.has("A")).toBe(false);
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  it("no nodes hidden when collapsed set is empty", () => {
    const edges = [edge("A", "B", true), edge("B", "C", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set());
    expect(hiddenByCollapse.size).toBe(0);
  });
});
