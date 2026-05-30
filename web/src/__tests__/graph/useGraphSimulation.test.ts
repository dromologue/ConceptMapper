// REQ-114: smoke + pure-function tests for useGraphSimulation.
// The hook is intentionally thin (it owns refs); the pure helpers around it
// — applyLayoutForces, explodedFactor, emptyRegionCaches — are where the
// real layout decisions live, so they get most of the coverage here.
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import * as d3 from "d3";
import {
  useGraphSimulation,
  applyLayoutForces,
  emptyRegionCaches,
  explodedFactor,
} from "../../graph/useGraphSimulation";
import type { SimNode, Classifier } from "../../types/graph-ir";

function node(id: string, x = 0, y = 0): SimNode {
  return { id, name: id, node_type: "concept", x, y };
}

describe("useGraphSimulation (hook smoke test)", () => {
  it("mounts and exposes simulation, init flag, and region cache refs", () => {
    const { result, unmount } = renderHook(() => useGraphSimulation());
    expect(result.current.simRef.current).toBeNull();
    expect(result.current.simInitializedRef.current).toBe(false);
    expect(result.current.regionCachesRef.current).toBeDefined();
    expect(result.current.regionCachesRef.current.columnPositions).toBeInstanceOf(Map);
    unmount();
  });
});

describe("explodedFactor", () => {
  it("returns 1 when not exploded", () => {
    expect(explodedFactor(false, 100)).toBe(1);
  });

  it("scales with node count when exploded, with a floor of 3", () => {
    expect(explodedFactor(true, 1)).toBe(3);
    // sqrt(900)/3 = 10 → factor 10.
    expect(explodedFactor(true, 900)).toBe(10);
  });
});

describe("emptyRegionCaches", () => {
  it("returns fresh empty maps each call", () => {
    const a = emptyRegionCaches();
    const b = emptyRegionCaches();
    expect(a.columnPositions.size).toBe(0);
    expect(a.centroids).not.toBe(b.centroids); // different instances
  });
});

describe("applyLayoutForces", () => {
  it("attaches x/y/charge/collide forces to the simulation", () => {
    const nodes = [node("a"), node("b")];
    const sim = d3.forceSimulation<SimNode>(nodes);
    const caches = emptyRegionCaches();
    applyLayoutForces({
      simulation: sim,
      vw: 800,
      vh: 600,
      classifiers: [],
      isExploded: false,
      preset: "force",
      nodes,
      edges: [],
      nodeTypeConfigs: [],
      fontCollideExtra: 0,
      regionCaches: caches,
    });
    expect(sim.force("x")).toBeDefined();
    expect(sim.force("y")).toBeDefined();
    expect(sim.force("charge")).toBeDefined();
    expect(sim.force("collide")).toBeDefined();
    // No region classifier → caches stay empty.
    expect(caches.centroids.size).toBe(0);
    sim.stop();
  });

  it("populates region centroids when a region classifier is supplied", () => {
    const nodes = [node("a"), node("b")];
    const cls: Classifier = {
      id: "stream",
      label: "Stream",
      layout: "region",
      values: [{ id: "v1", label: "V1" }, { id: "v2", label: "V2" }],
    };
    const sim = d3.forceSimulation<SimNode>(nodes);
    const caches = emptyRegionCaches();
    applyLayoutForces({
      simulation: sim,
      vw: 1000,
      vh: 800,
      classifiers: [cls],
      isExploded: false,
      preset: "force",
      nodes,
      edges: [],
      nodeTypeConfigs: [],
      fontCollideExtra: 0,
      regionCaches: caches,
    });
    expect(caches.centroids.size).toBe(2);
    expect(caches.centroids.has("v1")).toBe(true);
    expect(caches.columnPositions.size).toBe(0);
    sim.stop();
  });

  it("populates column caches for region-column layout", () => {
    const cls: Classifier = {
      id: "lane",
      label: "Lane",
      layout: "region-column",
      values: [{ id: "left", label: "Left" }, { id: "right", label: "Right" }],
    };
    const nodes: SimNode[] = [
      { ...node("a"), classifiers: { lane: "left" } },
      { ...node("b"), classifiers: { lane: "right" } },
    ];
    const sim = d3.forceSimulation<SimNode>(nodes);
    const caches = emptyRegionCaches();
    applyLayoutForces({
      simulation: sim,
      vw: 1000,
      vh: 600,
      classifiers: [cls],
      isExploded: false,
      preset: "force",
      nodes,
      edges: [],
      nodeTypeConfigs: [],
      fontCollideExtra: 0,
      regionCaches: caches,
    });
    expect(caches.columnPositions.size).toBe(2);
    expect(caches.columnLeftEdges.size).toBe(2);
    expect(caches.centroids.size).toBe(0);
    sim.stop();
  });
});
