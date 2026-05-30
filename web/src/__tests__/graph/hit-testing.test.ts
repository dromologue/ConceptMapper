// REQ-114: tests for graph/hit-testing.ts — pure geometric hit-tests over
// nodes, edges, marquee rectangles, and collapse glyphs.
import { describe, it, expect } from "vitest";
import {
  pointerToWorld,
  pointInNode,
  pointInRect,
  pointInCollapseIndicator,
  distanceToSegment,
  findNodeAt,
  findEdgeAt,
  marqueeToRect,
  rectSize,
  isMarqueeUsable,
  NODE_HIT_PADDING,
} from "../../graph/hit-testing";
import type { SimLink, SimNode } from "../../types/graph-ir";

function node(id: string, x: number, y: number): SimNode {
  return { id, name: id, node_type: "node", x, y };
}

function link(source: SimNode, target: SimNode): SimLink {
  return {
    source,
    target,
    edge: {
      from: source.id,
      to: target.id,
      edge_type: "rel",
      directed: false,
      weight: 1,
      visual: { style: "solid", show_arrow: false },
    },
  };
}

describe("pointerToWorld", () => {
  it("inverts the identity transform", () => {
    const w = pointerToWorld(10, 20, { x: 0, y: 0, k: 1 });
    expect(w).toEqual({ x: 10, y: 20 });
  });

  it("undoes a scale and translation correctly", () => {
    // Canvas point (110, 80) under transform (translate 10,20 then scale 2) → world (50, 30).
    const w = pointerToWorld(110, 80, { x: 10, y: 20, k: 2 });
    expect(w.x).toBeCloseTo(50);
    expect(w.y).toBeCloseTo(30);
  });
});

describe("pointInNode", () => {
  it("returns true when the point is inside the radius (with padding)", () => {
    expect(pointInNode(5, 0, { x: 0, y: 0 }, 8)).toBe(true);
  });

  it("returns false when the point is outside the radius + padding", () => {
    expect(pointInNode(20, 0, { x: 0, y: 0 }, 8)).toBe(false);
  });

  it("respects the configurable padding parameter", () => {
    // r=4, distance=7 → outside with default padding (4+4=8 just barely contains 7).
    expect(pointInNode(7, 0, { x: 0, y: 0 }, 4, NODE_HIT_PADDING)).toBe(true);
    // Same point with zero padding is outside.
    expect(pointInNode(7, 0, { x: 0, y: 0 }, 4, 0)).toBe(false);
  });
});

describe("findNodeAt", () => {
  it("returns the topmost (last) hit when multiple nodes overlap", () => {
    const a = node("a", 0, 0);
    const b = node("b", 0, 0);
    const hit = findNodeAt(0, 0, [a, b], () => 10, () => true);
    expect(hit?.id).toBe("b");
  });

  it("skips nodes flagged invisible by the predicate", () => {
    const a = node("a", 0, 0);
    const b = node("b", 0, 0);
    const hit = findNodeAt(0, 0, [a, b], () => 10, (n) => n.id === "a");
    expect(hit?.id).toBe("a");
  });

  it("returns null when nothing is under the cursor", () => {
    const a = node("a", 0, 0);
    expect(findNodeAt(1000, 1000, [a], () => 10, () => true)).toBeNull();
  });
});

describe("distanceToSegment / findEdgeAt", () => {
  it("computes the perpendicular distance to a segment", () => {
    expect(distanceToSegment(5, 5, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it("clamps distance to the nearest endpoint when the projection falls outside the segment", () => {
    expect(distanceToSegment(-3, 0, 0, 0, 10, 0)).toBeCloseTo(3);
    expect(distanceToSegment(15, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it("returns Infinity for a zero-length segment", () => {
    expect(distanceToSegment(0, 0, 5, 5, 5, 5)).toBe(Infinity);
  });

  it("findEdgeAt picks an edge within threshold and skips one outside", () => {
    const a = node("a", 0, 0);
    const b = node("b", 100, 0);
    const c = node("c", 0, 1000);
    const d = node("d", 100, 1000);
    const links = [link(a, b), link(c, d)];
    // Point near the a→b segment.
    expect(findEdgeAt(50, 2, links, 5)?.edge.from).toBe("a");
    // Point near the c→d segment.
    expect(findEdgeAt(50, 998, links, 5)?.edge.from).toBe("c");
    // Point that's far from both.
    expect(findEdgeAt(50, 500, links, 5)).toBeNull();
  });
});

describe("marquee helpers", () => {
  it("marqueeToRect normalises an inverted marquee into a positive rect", () => {
    const r = marqueeToRect({ startX: 100, startY: 200, endX: 50, endY: 150 });
    expect(r).toEqual({ minX: 50, minY: 150, maxX: 100, maxY: 200 });
  });

  it("rectSize reports width and height", () => {
    expect(rectSize({ minX: 0, minY: 0, maxX: 10, maxY: 5 })).toEqual({ width: 10, height: 5 });
  });

  it("isMarqueeUsable filters out tiny marquees", () => {
    expect(isMarqueeUsable({ startX: 0, startY: 0, endX: 5, endY: 5 })).toBe(false);
    expect(isMarqueeUsable({ startX: 0, startY: 0, endX: 50, endY: 50 })).toBe(true);
  });

  it("pointInRect performs axis-aligned containment", () => {
    const r = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(pointInRect(5, 5, r)).toBe(true);
    expect(pointInRect(15, 5, r)).toBe(false);
  });
});

describe("pointInCollapseIndicator", () => {
  it("hits inside the glyph circle anchored to the top-right of the node", () => {
    // Node at (100,100), r=20, indicatorR=5, offset=2 → glyph at (127, 80).
    const inside = pointInCollapseIndicator(127, 80, { x: 100, y: 100 }, 20, 5, 2, 1);
    expect(inside).toBe(true);
  });

  it("misses outside the glyph hit area", () => {
    const outside = pointInCollapseIndicator(200, 200, { x: 100, y: 100 }, 20, 5, 2, 1);
    expect(outside).toBe(false);
  });

  it("hitScale enlarges the hit area for finger-tip ergonomics", () => {
    // A point 12 px from the glyph centre — outside at scale 1, inside at scale 3.
    const node0 = { x: 0, y: 0 };
    const cx = 0 + 10 + 5 + 2; // 17
    const cy = -10;            // -10
    // Move 12 px away.
    expect(pointInCollapseIndicator(cx + 12, cy, node0, 10, 5, 2, 1)).toBe(false);
    expect(pointInCollapseIndicator(cx + 12, cy, node0, 10, 5, 2, 3)).toBe(true);
  });
});
