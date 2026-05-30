// REQ-114: pure hit-testing helpers. NO D3, NO React, NO refs — every input
// arrives as a parameter so behaviour can be tested deterministically.

import type { SimLink, SimNode } from "../types/graph-ir";

/** Padding added to node radius when checking whether a pointer is inside. */
export const NODE_HIT_PADDING = 4;
/** Screen-space pixel distance within which an edge counts as "hovered". */
export const EDGE_HIT_THRESHOLD = 8;
/** Minimum marquee size (canvas-units) before a marquee zoom triggers. */
export const MARQUEE_MIN_SIZE = 10;

export interface Transform {
  x: number;
  y: number;
  k: number;
}

/** Convert a screen-space pointer to canvas-world coordinates given a zoom transform. */
export function pointerToWorld(
  canvasX: number,
  canvasY: number,
  transform: Transform,
): { x: number; y: number } {
  return {
    x: (canvasX - transform.x) / transform.k,
    y: (canvasY - transform.y) / transform.k,
  };
}

/** Is world-space point (x, y) inside the node disc (radius + padding)? */
export function pointInNode(
  x: number,
  y: number,
  node: { x: number; y: number },
  radius: number,
  padding: number = NODE_HIT_PADDING,
): boolean {
  const dx = x - node.x;
  const dy = y - node.y;
  const r = radius + padding;
  return dx * dx + dy * dy < r * r;
}

/**
 * Hit-test a list of nodes from topmost to bottommost. `isVisible` is consulted
 * first so filtered/hidden nodes are skipped, and `nodeRadius` is supplied per
 * node so we don't pull a configs map into this module.
 */
export function findNodeAt<N extends SimNode>(
  worldX: number,
  worldY: number,
  nodes: ReadonlyArray<N>,
  nodeRadius: (n: N) => number,
  isVisible: (n: N) => boolean,
  padding: number = NODE_HIT_PADDING,
): N | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!isVisible(node)) continue;
    if (pointInNode(worldX, worldY, node, nodeRadius(node), padding)) return node;
  }
  return null;
}

/**
 * Closest-point distance from world-space (x, y) to the line segment a→b.
 * Returns Infinity when the segment has zero length.
 */
export function distanceToSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Infinity;
  let param = ((x - ax) * dx + (y - ay) * dy) / lenSq;
  param = Math.max(0, Math.min(1, param));
  const projX = ax + param * dx;
  const projY = ay + param * dy;
  return Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
}

/**
 * Find the first edge whose segment is within `threshold` world units of
 * (worldX, worldY). The threshold should already be divided by the zoom
 * scale by the caller so the hit area stays constant on-screen.
 */
export function findEdgeAt(
  worldX: number,
  worldY: number,
  links: ReadonlyArray<SimLink>,
  threshold: number,
): SimLink | null {
  for (const l of links) {
    const source = l.source as SimNode;
    const target = l.target as SimNode;
    if (!source || !target || typeof source === "string" || typeof target === "string") continue;
    const d = distanceToSegment(worldX, worldY, source.x, source.y, target.x, target.y);
    if (d < threshold) return l;
  }
  return null;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Marquee {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/** Normalise a marquee (which can be drawn in any direction) into a positive-size rect. */
export function marqueeToRect(m: Marquee): Rect {
  return {
    minX: Math.min(m.startX, m.endX),
    minY: Math.min(m.startY, m.endY),
    maxX: Math.max(m.startX, m.endX),
    maxY: Math.max(m.startY, m.endY),
  };
}

/** Width and height of a rect — useful when computing fit scale for marquee zoom. */
export function rectSize(r: Rect): { width: number; height: number } {
  return { width: r.maxX - r.minX, height: r.maxY - r.minY };
}

/** Does the rect have at least the minimum size to be considered a deliberate marquee? */
export function isMarqueeUsable(m: Marquee, minSize: number = MARQUEE_MIN_SIZE): boolean {
  const { width, height } = rectSize(marqueeToRect(m));
  return width > minSize && height > minSize;
}

/** Axis-aligned point-in-rect test. */
export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY;
}

/**
 * Hit-test a small disc (the collapse +/- glyph) anchored to the top-right of a node.
 * `indicatorR` is the glyph radius and `hitScale` allows a generous hit area.
 */
export function pointInCollapseIndicator(
  x: number,
  y: number,
  node: { x: number; y: number },
  nodeRadius: number,
  indicatorR: number,
  offset: number,
  hitScale: number,
): boolean {
  const ix = node.x + nodeRadius + indicatorR + offset;
  const iy = node.y - nodeRadius;
  const dx = x - ix;
  const dy = y - iy;
  const r = indicatorR * hitScale;
  return dx * dx + dy * dy <= r * r;
}
