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

  it("undirected edges do NOT create collapse parent-child relationships", () => {
    const edges = [edge("A", "B", false)];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(false);
    expect(hasChildren.has("B")).toBe(false);
  });

  it("handles mixed directed and undirected edges", () => {
    const edges = [
      edge("A", "B", true),   // A → B (directed: A has children)
      edge("C", "D", false),  // C — D (undirected: no collapse relationship)
    ];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(true);
    expect(hasChildren.has("B")).toBe(false);
    expect(hasChildren.has("C")).toBe(false);
    expect(hasChildren.has("D")).toBe(false);
  });

  it("returns empty hasChildren for no edges", () => {
    const { hasChildren } = computeCollapseState([], new Set());
    expect(hasChildren.size).toBe(0);
  });

  // --- hiddenByCollapse (directed) ---

  it("hides child when sole directed parent is collapsed", () => {
    const edges = [edge("A", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  it("does not hide child with another non-collapsed directed parent", () => {
    const edges = [edge("A", "B", true), edge("C", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(false);
  });

  it("hides child when all directed parents are collapsed", () => {
    const edges = [edge("A", "B", true), edge("C", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A", "C"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  // --- undirected edges do NOT participate in collapse hiding ---

  it("undirected edges do not hide neighbors on collapse", () => {
    const edges = [edge("A", "B", false)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(false);
  });

  it("child with undirected edge to another node is still hidden if sole directed parent collapsed", () => {
    // A→B directed, B—C undirected. Collapse A: B hidden (sole directed parent). C NOT hidden (no directed parent).
    const edges = [edge("A", "B", true), edge("B", "C", false)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
    expect(hiddenByCollapse.has("C")).toBe(false);
  });

  // --- cascading collapse ---

  it("cascades: collapsing A hides B, which then hides C", () => {
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

  // --- edge case: node with mixed directed + undirected ---

  it("node with directed parent AND undirected edge: only directed parent matters for collapse", () => {
    // A→B directed, B—D undirected. Collapse A: B hidden. D not affected.
    const edges = [edge("A", "B", true), edge("B", "D", false)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
    expect(hiddenByCollapse.has("D")).toBe(false);
  });
});
