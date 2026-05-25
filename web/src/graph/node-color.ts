import type { GraphNode, Classifier } from "../types/graph-ir";

export function getNodeColor(node: GraphNode, classifiers: Classifier[], overrides?: Record<string, string>): string {
  // Use the first classifier whose values carry color definitions
  const colorCls = classifiers.find((c) => c.values.some((v) => v.color)) ?? classifiers[0];
  if (!colorCls) return "#666";
  const valueId = node.classifiers?.[colorCls.id];
  if (!valueId) return "#666";
  if (overrides && overrides[String(valueId)]) return overrides[String(valueId)];
  return colorCls.values.find((v) => v.id === String(valueId))?.color ?? "#666";
}

// Maximum proportion of white to mix in at the deepest depth. Caps at 0.6 so
// leaves stay recognisably coloured rather than fading to white.
const MAX_DEPTH_LIGHTEN = 0.6;

/**
 * Lighten a node's base colour by its BFS depth so deeper nodes appear paler.
 * Roots (depth 0) keep their full colour; the deepest visible nodes are mixed
 * with white up to MAX_DEPTH_LIGHTEN. Preserves hue — only lightness changes.
 */
export function applyDepthLightness(hex: string, depth: number, maxDepth: number): string {
  if (maxDepth <= 0 || depth <= 0) return hex;
  const t = Math.min(depth / maxDepth, 1) * MAX_DEPTH_LIGHTEN;
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const nr = Math.round(rgb.r + (255 - rgb.r) * t);
  const ng = Math.round(rgb.g + (255 - rgb.g) * t);
  const nb = Math.round(rgb.b + (255 - rgb.b) * t);
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || !/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}
