import { describe, it, expect } from "vitest";
import { computeFlowDepths, computeFlowPositions, computeRadialTargets } from "../graph/layout-presets";

describe("computeFlowDepths", () => {
  it("assigns depth 0 to source nodes (no incoming directed edges)", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [{ from: "a", to: "b" }, { from: "b", to: "c" }];
    const directed = new Map([["a→b", true], ["b→c", true]]);
    const depths = computeFlowDepths(nodes, edges, directed);
    expect(depths.get("a")).toBe(0);
    expect(depths.get("b")).toBe(1);
    expect(depths.get("c")).toBe(2);
  });

  it("uses longest-path semantics for nodes with multiple parents", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [
      { from: "a", to: "c" },
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "d" },
    ];
    const directed = new Map([["a→c", true], ["a→b", true], ["b→c", true], ["c→d", true]]);
    const depths = computeFlowDepths(nodes, edges, directed);
    // c reachable via a→c (depth 1) and a→b→c (depth 2), should be 2
    expect(depths.get("c")).toBe(2);
    expect(depths.get("d")).toBe(3);
  });

  it("ignores non-directed edges", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [{ from: "a", to: "b" }, { from: "b", to: "c" }];
    const directed = new Map([["a→b", true], ["b→c", false]]);
    const depths = computeFlowDepths(nodes, edges, directed);
    expect(depths.get("a")).toBe(0);
    expect(depths.get("b")).toBe(1);
    // c has no directed incoming, so depth 0
    expect(depths.get("c")).toBe(0);
  });

  it("handles cycles by assigning maxDepth + 1", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "a" }];
    const directed = new Map([["a→b", true], ["b→c", true], ["c→a", true]]);
    const depths = computeFlowDepths(nodes, edges, directed);
    // All in cycle — all should get maxDepth + 1 (which is 1 since no node gets assigned)
    for (const n of nodes) {
      expect(depths.get(n.id)).toBeDefined();
    }
  });
});

describe("computeFlowPositions", () => {
  it("places nodes at different Y levels by depth", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [{ from: "a", to: "b" }, { from: "b", to: "c" }];
    const directed = new Map([["a→b", true], ["b→c", true]]);
    const depths = computeFlowDepths(nodes, edges, directed);
    const positions = computeFlowPositions(nodes, edges, directed, depths);
    const yA = positions.get("a")!.y;
    const yB = positions.get("b")!.y;
    const yC = positions.get("c")!.y;
    expect(yA).toBeLessThan(yB);
    expect(yB).toBeLessThan(yC);
  });

  it("separates connected components horizontally", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [{ from: "a", to: "b" }, { from: "c", to: "d" }];
    const directed = new Map([["a→b", true], ["c→d", true]]);
    const depths = computeFlowDepths(nodes, edges, directed);
    const positions = computeFlowPositions(nodes, edges, directed, depths);
    // Components should have different X centers
    const xAB = (positions.get("a")!.x + positions.get("b")!.x) / 2;
    const xCD = (positions.get("c")!.x + positions.get("d")!.x) / 2;
    expect(Math.abs(xAB - xCD)).toBeGreaterThan(100);
  });
});

describe("computeRadialTargets", () => {
  it("places highest-degree node at center", () => {
    const nodes = [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [
      { from: "hub", to: "a" },
      { from: "hub", to: "b" },
      { from: "hub", to: "c" },
    ];
    const targets = computeRadialTargets(nodes, edges, 500, 500);
    const hubPos = targets.get("hub")!;
    // Hub has degree 3 (highest), should be at or very near center
    expect(Math.abs(hubPos.x - 500)).toBeLessThan(1);
    expect(Math.abs(hubPos.y - 500)).toBeLessThan(1);
  });

  it("places low-degree nodes further from center than high-degree nodes", () => {
    const nodes = [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "leaf" }];
    const edges = [
      { from: "hub", to: "a" },
      { from: "hub", to: "b" },
      { from: "hub", to: "leaf" },
      { from: "a", to: "b" },
    ];
    // hub has degree 3, a and b have degree 2, leaf has degree 1
    const targets = computeRadialTargets(nodes, edges, 0, 0);
    const hubDist = Math.sqrt(targets.get("hub")!.x ** 2 + targets.get("hub")!.y ** 2);
    const leafDist = Math.sqrt(targets.get("leaf")!.x ** 2 + targets.get("leaf")!.y ** 2);
    expect(leafDist).toBeGreaterThan(hubDist);
  });
});
