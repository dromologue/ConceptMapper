// REQ-114: smoke + pure-function tests for useZoomController.
// The hook owns the zoom-behaviour and current-transform refs; the pure
// helpers it exports — fitTransform, zoomByCenterTransform, marqueeZoom —
// are where the maths lives, so those carry most of the coverage.
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import * as d3 from "d3";
import {
  useZoomController,
  fitTransform,
  bboxOf,
  zoomByCenterTransform,
  centerOnNodeTransform,
  marqueeZoomTransform,
  FIT_TO_VIEW_MAX_SCALE,
  MIN_ZOOM,
  MAX_ZOOM,
} from "../../graph/useZoomController";

describe("useZoomController (hook smoke test)", () => {
  it("mounts and exposes a zoom-behaviour ref and an identity transform ref", () => {
    const { result, unmount } = renderHook(() => useZoomController());
    expect(result.current.zoomBehaviorRef.current).toBeNull();
    expect(result.current.transformRef.current).toBe(d3.zoomIdentity);
    unmount();
  });
});

describe("bboxOf", () => {
  it("returns null for an empty point list", () => {
    expect(bboxOf([])).toBeNull();
  });

  it("computes min/max for a non-empty point list", () => {
    const bb = bboxOf([{ x: 1, y: 2 }, { x: 5, y: -3 }, { x: -1, y: 4 }]);
    expect(bb).toEqual({ minX: -1, maxX: 5, minY: -3, maxY: 4 });
  });
});

describe("fitTransform", () => {
  it("returns null when the bbox is null", () => {
    expect(fitTransform(null, 800, 600)).toBeNull();
  });

  it("clamps the scale to the FIT_TO_VIEW_MAX_SCALE for tiny graphs", () => {
    const t = fitTransform({ minX: 0, maxX: 1, minY: 0, maxY: 1 }, 800, 600, 0)!;
    expect(t.k).toBe(FIT_TO_VIEW_MAX_SCALE);
  });

  it("scales to fit a large graph within the viewport (with padding accounted for)", () => {
    const t = fitTransform({ minX: 0, maxX: 1000, minY: 0, maxY: 500 }, 800, 600, 80)!;
    // gw=1160, gh=660 → scale=min(800/1160, 600/660) ≈ 0.689
    expect(t.k).toBeLessThan(1);
    expect(t.k).toBeGreaterThan(0.5);
  });
});

describe("zoomByCenterTransform", () => {
  it("zooms in by the requested factor when within bounds", () => {
    const start = d3.zoomIdentity.scale(1);
    const t = zoomByCenterTransform(start, 400, 300, 2);
    expect(t.k).toBe(2);
  });

  it("clamps to MAX_ZOOM at the upper bound", () => {
    const start = d3.zoomIdentity.scale(4);
    const t = zoomByCenterTransform(start, 0, 0, 10);
    expect(t.k).toBe(MAX_ZOOM);
  });

  it("clamps to MIN_ZOOM at the lower bound", () => {
    const start = d3.zoomIdentity.scale(0.2);
    const t = zoomByCenterTransform(start, 0, 0, 0.01);
    expect(t.k).toBe(MIN_ZOOM);
  });
});

describe("centerOnNodeTransform", () => {
  it("centres a node on the canvas at the configured scale", () => {
    const t = centerOnNodeTransform(100, 100, 800, 600, 2);
    expect(t.k).toBe(2);
    // Centering (100,100) at scale 2 in a 800x600 canvas → screen (400,300).
    expect(t.applyX(100)).toBeCloseTo(400);
    expect(t.applyY(100)).toBeCloseTo(300);
  });
});

describe("marqueeZoomTransform", () => {
  it("fits the marquee rect into the viewport with a margin", () => {
    const t = marqueeZoomTransform({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, 800, 600);
    // Scale is min(800/100, 600/100) * 0.9 = 6 * 0.9 = 5.4
    expect(t.k).toBeCloseTo(5.4);
    // The centre of the marquee maps to the centre of the canvas.
    expect(t.applyX(50)).toBeCloseTo(400);
    expect(t.applyY(50)).toBeCloseTo(300);
  });
});
