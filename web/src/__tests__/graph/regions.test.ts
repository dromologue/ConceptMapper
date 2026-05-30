// REQ-114: tests for layout/regions.ts — pure layout helpers used by the
// concept-map canvas. Verifies classifier-based positioning, column-width
// proportionality, cluster radius math, and initial spawn determinism.
import { describe, it, expect } from "vitest";
import {
  computeRegionCentroids,
  computeRegionColumns,
  computeAxisPositions,
  initialNodePosition,
  newNodeSpawnPosition,
  regionClusterRadius,
  hashCode,
  seededRandom,
  X_LAYOUT_START,
  X_LAYOUT_RANGE,
  MIN_COLUMN_FRACTION,
} from "../../graph/layout/regions";
import type { Classifier } from "../../types/graph-ir";

function cls(id: string, values: { id: string; label: string }[]): Classifier {
  return { id, label: id, values };
}

describe("computeRegionCentroids", () => {
  it("returns an empty map when the classifier has no values", () => {
    const result = computeRegionCentroids(cls("c", []), 1000, 800);
    expect(result.size).toBe(0);
  });

  it("places a single value at the configured top-left fraction of the canvas", () => {
    const result = computeRegionCentroids(cls("c", [{ id: "v", label: "V" }]), 1000, 800);
    expect(result.get("v")?.x).toBeCloseTo(1000 * X_LAYOUT_START);
  });

  it("arranges 4 values in a 2x2 grid spanning the layout range", () => {
    const c = cls("c", [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "d", label: "D" },
      { id: "e", label: "E" },
    ]);
    const result = computeRegionCentroids(c, 1000, 1000);
    expect(result.size).toBe(4);
    // Column 0 and column 1 should differ by exactly X_LAYOUT_RANGE * width.
    expect((result.get("b")!.x - result.get("a")!.x)).toBeCloseTo(1000 * X_LAYOUT_RANGE);
    // Rows differ.
    expect(result.get("d")!.y).toBeGreaterThan(result.get("a")!.y);
  });
});

describe("computeRegionColumns", () => {
  it("returns empty maps when the classifier has no values", () => {
    const r = computeRegionColumns(cls("c", []), 1000);
    expect(r.positions.size).toBe(0);
    expect(r.widths.size).toBe(0);
    expect(r.leftEdges.size).toBe(0);
  });

  it("falls back to equal-width columns when no counts are supplied", () => {
    const c = cls("c", [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "d", label: "D" },
    ]);
    const r = computeRegionColumns(c, 900);
    // Each column width should be 300 (within FP tolerance).
    expect(r.widths.get("a")).toBeCloseTo(300);
    expect(r.widths.get("b")).toBeCloseTo(300);
    expect(r.widths.get("d")).toBeCloseTo(300);
    // Left edges progress.
    expect(r.leftEdges.get("a")).toBeCloseTo(0);
    expect(r.leftEdges.get("b")).toBeCloseTo(300);
    expect(r.leftEdges.get("d")).toBeCloseTo(600);
    // Positions are column centres.
    expect(r.positions.get("a")).toBeCloseTo(150);
  });

  it("widens columns whose member count is higher (proportional layout)", () => {
    const c = cls("c", [
      { id: "small", label: "Small" },
      { id: "big", label: "Big" },
    ]);
    const counts = new Map([["small", 1], ["big", 9]]);
    const r = computeRegionColumns(c, 1000, counts);
    expect(r.widths.get("big")!).toBeGreaterThan(r.widths.get("small")!);
    // Widths should sum to the canvas width.
    expect(r.widths.get("big")! + r.widths.get("small")!).toBeCloseTo(1000);
  });

  it("enforces a minimum column fraction so small groups remain visible", () => {
    const c = cls("c", [
      { id: "tiny", label: "Tiny" },
      { id: "huge", label: "Huge" },
    ]);
    const counts = new Map([["tiny", 1], ["huge", 1000]]);
    const r = computeRegionColumns(c, 1000, counts);
    // tiny column must be at least MIN_COLUMN_FRACTION * width (after normalisation
    // it shrinks below the raw 6% but should still be comfortably visible).
    expect(r.widths.get("tiny")!).toBeGreaterThan(1000 * MIN_COLUMN_FRACTION * 0.5);
  });
});

describe("computeAxisPositions", () => {
  it("sorts classifier values by label (natural order) before placing them", () => {
    const c = cls("c", [
      { id: "z", label: "10" },
      { id: "a", label: "2" },
      { id: "m", label: "5" },
    ]);
    const positions = computeAxisPositions(c, 1000);
    // Natural sort: "2" < "5" < "10", so a should be leftmost and z rightmost.
    expect(positions.get("a")!).toBeLessThan(positions.get("m")!);
    expect(positions.get("m")!).toBeLessThan(positions.get("z")!);
  });
});

describe("regionClusterRadius", () => {
  it("returns the minimum radius when no members are present", () => {
    const r = regionClusterRadius({ x: 0, y: 0 }, [], 100, 40);
    expect(r).toBe(100);
  });

  it("returns max(minRadius, farthest-member + padding)", () => {
    const r = regionClusterRadius(
      { x: 0, y: 0 },
      [{ x: 30, y: 40 }, { x: 0, y: 100 }], // farthest is (0,100) → dist 100
      50,
      20,
    );
    expect(r).toBe(120); // 100 + 20 padding
  });

  it("respects the minimum radius even when all members are close", () => {
    const r = regionClusterRadius({ x: 0, y: 0 }, [{ x: 1, y: 1 }], 100, 40);
    expect(r).toBe(100);
  });
});

describe("initialNodePosition / newNodeSpawnPosition", () => {
  it("returns the canvas centre when the RNG is exactly 0.5", () => {
    const p = initialNodePosition(800, 600, () => 0.5);
    expect(p.x).toBeCloseTo(400);
    expect(p.y).toBeCloseTo(300);
  });

  it("spawns new nodes near the canvas centre regardless of canvas size", () => {
    const p = newNodeSpawnPosition(2000, 2000, () => 0.5);
    expect(p.x).toBeCloseTo(1000);
    expect(p.y).toBeCloseTo(1000);
  });
});

describe("hashCode / seededRandom", () => {
  it("hashCode is deterministic", () => {
    expect(hashCode("alpha")).toBe(hashCode("alpha"));
    expect(hashCode("alpha")).not.toBe(hashCode("beta"));
  });

  it("seededRandom produces values in [-1, 1] and is deterministic", () => {
    for (let i = 0; i < 20; i++) {
      const v = seededRandom(42, i);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(seededRandom(42, 7)).toBe(seededRandom(42, 7));
  });
});
