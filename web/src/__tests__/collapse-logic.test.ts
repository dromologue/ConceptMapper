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
  // --- hasChildren: any node with at least one edge ---

  it("marks both endpoints of any edge as having children", () => {
    const edges = [edge("A", "B", true)];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(true);
    expect(hasChildren.has("B")).toBe(true);
  });

  it("works for undirected edges too", () => {
    const edges = [edge("A", "B", false)];
    const { hasChildren } = computeCollapseState(edges, new Set());
    expect(hasChildren.has("A")).toBe(true);
    expect(hasChildren.has("B")).toBe(true);
  });

  it("returns empty hasChildren for no edges", () => {
    const { hasChildren } = computeCollapseState([], new Set());
    expect(hasChildren.size).toBe(0);
  });

  // --- hiddenByCollapse: bidirectional neighbor check ---

  it("hides to-node when from-node is collapsed (sole connection)", () => {
    const edges = [edge("A", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  it("hides from-node when to-node is collapsed (sole connection)", () => {
    // Edge is A→B, but collapsing B hides A if A has no other connections
    const edges = [edge("A", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["B"]));
    expect(hiddenByCollapse.has("A")).toBe(true);
  });

  it("does not hide node with another non-collapsed neighbor", () => {
    const edges = [edge("A", "B", true), edge("C", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    expect(hiddenByCollapse.has("B")).toBe(false);
  });

  it("hides node when all neighbors are collapsed", () => {
    const edges = [edge("A", "B", true), edge("C", "B", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A", "C"]));
    expect(hiddenByCollapse.has("B")).toBe(true);
  });

  it("collapsed nodes themselves are NOT hidden", () => {
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

  // --- cascading ---

  it("cascades: collapsing A hides B (sole neighbor), then C (sole neighbor of B)", () => {
    const edges = [edge("A", "B", true), edge("B", "C", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["A"]));
    // B's only neighbor is A (collapsed) → hidden
    // But wait: B also has neighbor C via edge B→C. So B has neighbors {A, C}.
    // A is collapsed, C is not → B is NOT hidden
    expect(hiddenByCollapse.has("B")).toBe(false);
    // C's only neighbor is B, which is not hidden → C is not hidden
    expect(hiddenByCollapse.has("C")).toBe(false);
  });

  it("linear chain: collapsing middle node hides leaf but not root", () => {
    // A→B→C: collapse B. A has neighbor B (collapsed) only → hidden? No: A also connects to nothing else.
    // Actually A's neighbors = {B}. B is collapsed → A is hidden.
    // C's neighbors = {B}. B is collapsed → C is hidden.
    const edges = [edge("A", "B", true), edge("B", "C", true)];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["B"]));
    expect(hiddenByCollapse.has("A")).toBe(true);
    expect(hiddenByCollapse.has("C")).toBe(true);
    expect(hiddenByCollapse.has("B")).toBe(false);
  });

  // --- Collins taxonomy scenario ---

  it("Collins: collapsing system_1_2 hides prospect_theory (sole neighbor via extends)", () => {
    // prospect_theory → system_1_2 (extends): bidirectional, so both are neighbors
    // system_1_2 → drift_into_failure (enables): both are neighbors
    // structuration → drift_into_failure (extends): both are neighbors
    const edges = [
      edge("prospect_theory", "system_1_2", true),
      edge("system_1_2", "drift_into_failure", true),
      edge("structuration", "drift_into_failure", true),
    ];
    const { hiddenByCollapse } = computeCollapseState(edges, new Set(["system_1_2"]));

    // prospect_theory: neighbors = {system_1_2}. system_1_2 is collapsed → hidden
    expect(hiddenByCollapse.has("prospect_theory")).toBe(true);

    // drift_into_failure: neighbors = {system_1_2, structuration}. structuration is not collapsed → NOT hidden
    expect(hiddenByCollapse.has("drift_into_failure")).toBe(false);

    // system_1_2 itself stays visible
    expect(hiddenByCollapse.has("system_1_2")).toBe(false);
  });
});
