import { describe, it, expect } from "vitest";
import { applyDepthLightness } from "../graph/node-color";

describe("applyDepthLightness", () => {
  it("returns the base colour when depth is 0", () => {
    expect(applyDepthLightness("#4A90D9", 0, 4)).toBe("#4A90D9");
  });

  it("returns the base colour when maxDepth is 0", () => {
    expect(applyDepthLightness("#4A90D9", 3, 0)).toBe("#4A90D9");
  });

  it("lightens progressively with depth, capped at MAX_DEPTH_LIGHTEN (0.6)", () => {
    const base = "#4A90D9"; // r=74 g=144 b=217
    const mid = applyDepthLightness(base, 2, 4);
    const max = applyDepthLightness(base, 4, 4);
    // mid is lighter than base
    expect(hexLuma(mid)).toBeGreaterThan(hexLuma(base));
    // max is lighter than mid
    expect(hexLuma(max)).toBeGreaterThan(hexLuma(mid));
    // max stays below pure white (cap = 0.6, so each channel ≤ base + 0.6 * (255-base))
    const m = parseHex(max);
    expect(m.r).toBe(Math.round(74 + (255 - 74) * 0.6));
    expect(m.g).toBe(Math.round(144 + (255 - 144) * 0.6));
    expect(m.b).toBe(Math.round(217 + (255 - 217) * 0.6));
  });

  it("preserves hue (relative channel ordering)", () => {
    const base = "#4A90D9"; // blue > green > red
    const out = applyDepthLightness(base, 3, 4);
    const o = parseHex(out);
    expect(o.b).toBeGreaterThan(o.g);
    expect(o.g).toBeGreaterThan(o.r);
  });

  it("clamps depth > maxDepth to the cap", () => {
    const base = "#000000";
    const at = applyDepthLightness(base, 4, 4);
    const over = applyDepthLightness(base, 10, 4);
    expect(over).toBe(at);
  });

  it("handles 3-char hex shorthand", () => {
    // #f00 → #ff0000
    const out = applyDepthLightness("#f00", 4, 4);
    const o = parseHex(out);
    expect(o.r).toBe(255);
    expect(o.g).toBe(Math.round(0 + 255 * 0.6));
  });

  it("returns the input unchanged for invalid hex", () => {
    expect(applyDepthLightness("not-a-colour", 2, 4)).toBe("not-a-colour");
  });
});

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function hexLuma(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
