// REQ-114: pure layout helpers for region / region-column classifiers and
// initial node spawn positioning. NO D3, NO React, NO refs — every input
// arrives as a parameter so the functions can be unit-tested in isolation.

import type { Classifier } from "../../types/graph-ir";

// ---- Configuration constants ----

/** Region grid: fraction of canvas dimension where the first row/column sits. */
export const X_LAYOUT_START = 0.15;
/** Region grid: fraction of canvas dimension spanned by all rows/columns. */
export const X_LAYOUT_RANGE = 0.7;
export const Y_LAYOUT_START = 0.1;
export const Y_LAYOUT_RANGE = 0.8;
/** Multiplier on min(width, height) used for the random spread of initial node positions. */
export const INITIAL_SPREAD_FACTOR = 0.6;
/** Spread (in canvas units) applied to nodes that appear after the first render. */
export const NEW_NODE_SPAWN_SPREAD = 200;
/** Minimum column width as a fraction of canvas width, regardless of member count. */
export const MIN_COLUMN_FRACTION = 0.06;

// ---- Helper hashes / deterministic noise (used by both layout and rendering) ----

/** Deterministic hash from a string, for stable jitter per node. */
export function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

/** Deterministic pseudo-random from seed, returns -1 to 1. */
export function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297 + 233280) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

// ---- Region centroid layout (circle clusters) ----

export interface Point {
  x: number;
  y: number;
}

/** Compute centroid positions for region layout, arranged in a near-square grid. */
export function computeRegionCentroids(
  regionCls: Classifier,
  width: number,
  height: number,
): Map<string, Point> {
  const result = new Map<string, Point>();
  const n = regionCls.values.length;
  if (n === 0) return result;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  regionCls.values.forEach((v, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = width * (X_LAYOUT_START + (X_LAYOUT_RANGE * col) / Math.max(cols - 1, 1));
    const y = height * (Y_LAYOUT_START + (Y_LAYOUT_RANGE * row) / Math.max(rows - 1, 1));
    result.set(v.id, { x, y });
  });
  return result;
}

// ---- Region columns (fixed-width vertical lanes proportional to member count) ----

export interface RegionColumns {
  /** Center-line X for each column value. */
  positions: Map<string, number>;
  /** Width of each column in canvas units. */
  widths: Map<string, number>;
  /** Left edge X of each column. */
  leftEdges: Map<string, number>;
}

/**
 * Compute proportional column positions based on member counts.
 * Columns with more nodes get more width; a minimum fraction ensures small
 * groups remain visible. When no counts are supplied, columns are equal-width.
 */
export function computeRegionColumns(
  regionCls: Classifier,
  width: number,
  nodeCounts?: Map<string, number>,
): RegionColumns {
  const n = regionCls.values.length;
  if (n === 0) return { positions: new Map(), widths: new Map(), leftEdges: new Map() };

  const total = nodeCounts ? [...nodeCounts.values()].reduce((a, b) => a + b, 0) : 0;
  const rawFractions = regionCls.values.map((v) => {
    const count = nodeCounts?.get(v.id) ?? 0;
    return total > 0 ? Math.max(MIN_COLUMN_FRACTION, count / total) : 1 / n;
  });
  const fractionSum = rawFractions.reduce((a, b) => a + b, 0);
  const normalized = rawFractions.map((f) => f / fractionSum);

  const positions = new Map<string, number>();
  const widths = new Map<string, number>();
  const leftEdges = new Map<string, number>();
  let x = 0;
  regionCls.values.forEach((v, i) => {
    const colW = width * normalized[i];
    leftEdges.set(v.id, x);
    widths.set(v.id, colW);
    positions.set(v.id, x + colW / 2);
    x += colW;
  });
  return { positions, widths, leftEdges };
}

// ---- Classifier-driven 1D axis positions ----

/**
 * Compute target X (or Y) positions for nodes whose classifier value is
 * `layout: "x"` or `layout: "y"`. Values are sorted by label for stable
 * ordering and evenly spaced across the layout range.
 */
export function computeAxisPositions(
  classifier: Classifier,
  extent: number,
  start: number = X_LAYOUT_START,
  range: number = X_LAYOUT_RANGE,
): Map<string, number> {
  const sorted = [...classifier.values].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
  const result = new Map<string, number>();
  sorted.forEach((v, i) => {
    result.set(v.id, extent * (start + (range * i) / Math.max(sorted.length - 1, 1)));
  });
  return result;
}

// ---- Initial spawn positions ----

/** Random spawn position around the centre of the canvas, for first-load layout. */
export function initialNodePosition(
  width: number,
  height: number,
  rng: () => number = Math.random,
): Point {
  const spread = Math.min(width, height) * INITIAL_SPREAD_FACTOR;
  return {
    x: width / 2 + (rng() - 0.5) * spread,
    y: height / 2 + (rng() - 0.5) * spread,
  };
}

/** Spawn position for nodes added after the first render. */
export function newNodeSpawnPosition(
  width: number,
  height: number,
  rng: () => number = Math.random,
): Point {
  return {
    x: width / 2 + (rng() - 0.5) * NEW_NODE_SPAWN_SPREAD,
    y: height / 2 + (rng() - 0.5) * NEW_NODE_SPAWN_SPREAD,
  };
}

// ---- Region cluster sizing (for background circles) ----

/**
 * Given a centroid and a set of member positions, return the radius that
 * tightly contains all members with a configurable padding. Returns
 * `minRadius` when there are no members.
 */
export function regionClusterRadius(
  centroid: Point,
  members: ReadonlyArray<{ x: number; y: number }>,
  minRadius: number,
  padding: number,
): number {
  if (members.length === 0) return minRadius;
  let maxDist = 0;
  for (const m of members) {
    const dx = m.x - centroid.x;
    const dy = m.y - centroid.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > maxDist) maxDist = d;
  }
  return Math.max(minRadius, maxDist + padding);
}
