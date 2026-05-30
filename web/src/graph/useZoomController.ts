// REQ-114: D3 zoom lifecycle and programmatic transform helpers.
// Owns the zoom-behaviour ref and current-transform ref; exposes pure helpers
// for computing fit / center / zoom-by transforms so the coordinator can
// drive them with its own canvas ref.

import { useRef } from "react";
import * as d3 from "d3";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_IN_FACTOR = 1.5;
export const ZOOM_OUT_FACTOR = 0.67;
export const CENTER_ON_NODE_SCALE = 1.5;
export const FIT_TO_VIEW_PADDING = 80;
export const FIT_TO_VIEW_MAX_SCALE = 1.2;
export const FIT_TO_VIEW_DURATION = 400;
export const TRANSITION_DURATION = 500;
export const ZOOM_BUTTON_DURATION = 300;
export const MARQUEE_ZOOM_SCALE = 0.9;

export interface UseZoomControllerResult {
  zoomBehaviorRef: React.MutableRefObject<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>;
  transformRef: React.MutableRefObject<d3.ZoomTransform>;
}

/** Hook owning the zoom-behaviour ref and the current transform ref. */
export function useZoomController(): UseZoomControllerResult {
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const transformRef = useRef(d3.zoomIdentity);
  return { zoomBehaviorRef, transformRef };
}

// ---- Pure transform helpers ----

export interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function bboxOf(points: ReadonlyArray<{ x: number; y: number }>): BBox | null {
  if (points.length === 0) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Compute a d3 zoom transform that fits the given bounding box into the
 * canvas (with padding and a max-scale clamp). Returns `null` when the bbox
 * is empty.
 */
export function fitTransform(
  bbox: BBox | null,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = FIT_TO_VIEW_PADDING,
  maxScale: number = FIT_TO_VIEW_MAX_SCALE,
): d3.ZoomTransform | null {
  if (!bbox) return null;
  const gw = bbox.maxX - bbox.minX + padding * 2;
  const gh = bbox.maxY - bbox.minY + padding * 2;
  const scale = Math.min(canvasWidth / gw, canvasHeight / gh, maxScale);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  return d3.zoomIdentity
    .translate(canvasWidth / 2, canvasHeight / 2)
    .scale(scale)
    .translate(-cx, -cy);
}

/**
 * Compute a zoom-by-factor transform anchored on the canvas centre.
 * Used for the +/- zoom buttons.
 */
export function zoomByCenterTransform(
  current: d3.ZoomTransform,
  cx: number,
  cy: number,
  factor: number,
  minZoom: number = MIN_ZOOM,
  maxZoom: number = MAX_ZOOM,
): d3.ZoomTransform {
  const newK = Math.max(minZoom, Math.min(maxZoom, current.k * factor));
  return d3.zoomIdentity
    .translate(cx - (cx - current.x) * (newK / current.k), cy - (cy - current.y) * (newK / current.k))
    .scale(newK);
}

/** Compute a transform that centres on a node at a given scale. */
export function centerOnNodeTransform(
  nodeX: number,
  nodeY: number,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = CENTER_ON_NODE_SCALE,
): d3.ZoomTransform {
  return d3.zoomIdentity
    .translate(canvasWidth / 2, canvasHeight / 2)
    .scale(scale)
    .translate(-nodeX, -nodeY);
}

/**
 * Compute a marquee-zoom transform that fits a world-space rect into the
 * canvas with a slight margin (controlled by `MARQUEE_ZOOM_SCALE`).
 */
export function marqueeZoomTransform(
  rect: { minX: number; minY: number; maxX: number; maxY: number },
  canvasWidth: number,
  canvasHeight: number,
  margin: number = MARQUEE_ZOOM_SCALE,
): d3.ZoomTransform {
  const mw = rect.maxX - rect.minX;
  const mh = rect.maxY - rect.minY;
  const scale = Math.min(canvasWidth / mw, canvasHeight / mh) * margin;
  const cx = (rect.minX + rect.maxX) / 2;
  const cy = (rect.minY + rect.maxY) / 2;
  return d3.zoomIdentity
    .translate(canvasWidth / 2, canvasHeight / 2)
    .scale(scale)
    .translate(-cx, -cy);
}
