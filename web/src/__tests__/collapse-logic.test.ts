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
  // --- hasChildren: based on from-side of ALL edges ---

  it("marks from-node as having children for directed edges", () => {
    const edges = [edge("A", "B", true), edge("A", "C", true)];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(true);
    expect(hasChildren.has("B")).toBe(false);
  });

  it("marks from-node as having children for undirected edges too", () => {
    const edges = [edge("A", "B", false)];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(true);
    // B is NOT a parent (to-side only) — no indicator
    expect(hasChildren.has("B")).toBe(false);
  });

  it("returns empty hasChildren for no edges", () => {
    const { hasChildren } = computeCollapseState([], new Set());
    expect(hasChildren.size).toBe(0);
  });

  // --- hiddenByCollapse ---

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

  it("undirected edge: collapsing from-node hides to-node", () => {
    // A—B undirected (rivalry). A is the from-node, so collapsing A hides B.
    const edges = [edge("A", "B", false)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  it("undirected edge: collapsing to-node does NOT hide from-node", () => {
    // A—B undirected. B is the to-node. Collapsing B does NOT hide A.
    const edges = [edge("A", "B", false)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["B"]));
    expect(hiddenByCollapse.has("A")).toBe(false);
  });

  it("child with additional undirected parent is not hidden when directed parent collapsed", () => {
    // A→B directed, C→B undirected. Collapse A only: B has parent C (not collapsed) → NOT hidden.
    const edges = [edge("A", "B", true), edge("C", "B", false)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(false);
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

  // --- Real-world Collins taxonomy scenario ---

  it("Collins: collapsing argyris hides senge (child via chain)", () => {
    const edges = [
      edge("argyris", "senge", true),          // chain (directed)
      edge("argyris", "double_loop", true),     // originates (directed)
      edge("senge", "seven_conditions", true),  // develops (directed)
      edge("stacey", "double_loop", true),      // contests (directed)
      edge("stacey", "senge", false),           // rivalry (undirected, stacey→senge)
    ];
    const { hasChildren, hiddenByCollapse } = computeCollapseState(edges, new Set(["argyris"]));

    expect(hasChildren.has("argyris")).toBe(true);
    // senge: parents are argyris (chain) + stacey (rivalry from-side).
    // Only argyris is collapsed, stacey is not → NOT hidden
    expect(hiddenByCollapse.has("senge")).toBe(false);
    // double_loop: parents are argyris + stacey. Only argyris collapsed → NOT hidden
    expect(hiddenByCollapse.has("double_loop")).toBe(false);
    // argyris itself stays visible
    expect(hiddenByCollapse.has("argyris")).toBe(false);
  });
});
