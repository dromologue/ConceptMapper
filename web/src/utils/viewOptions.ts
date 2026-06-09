// View options that travel with a map file (the `.cm`), stored as an HTML
// comment so they round-trip through the parser untouched (same approach as
// the edge-colors comment). Covers the layout preset (force/flow/radial) and
// per-attribute classifier layouts (region/axis).

import type { Classifier, LayoutPreset } from "../types/graph-ir";

export interface ViewOptions {
  layout?: LayoutPreset;
  /** classifier id → layout ("x" | "y" | "region" | "region-column"). */
  classifierLayouts?: Record<string, string>;
}

/**
 * Serialize the current view to an HTML comment line, or "" when there is
 * nothing non-default to persist (default "force" preset, no classifier
 * layouts). The JSON is a single line so it round-trips through the parser.
 */
export function serializeViewComment(input: {
  layoutPreset?: LayoutPreset;
  classifiers?: Classifier[];
}): string {
  const classifierLayouts: Record<string, string> = {};
  for (const c of input.classifiers ?? []) {
    if (c.layout) classifierLayouts[c.id] = c.layout;
  }
  const view: ViewOptions = {};
  if (input.layoutPreset && input.layoutPreset !== "force") view.layout = input.layoutPreset;
  if (Object.keys(classifierLayouts).length > 0) view.classifierLayouts = classifierLayouts;
  if (Object.keys(view).length === 0) return "";
  return `<!-- view: ${JSON.stringify(view)} -->`;
}

/**
 * Parse the view comment out of .cm content. Returns null if absent or
 * malformed. The object can be nested, so the match is greedy to the last
 * brace before the comment close.
 */
export function parseViewComment(content: string): ViewOptions | null {
  const m = content.match(/<!--\s*view:\s*(\{.*\})\s*-->/);
  if (!m) return null;
  try {
    const v = JSON.parse(m[1]) as ViewOptions;
    const out: ViewOptions = {};
    if (v.layout === "force" || v.layout === "flow" || v.layout === "radial") out.layout = v.layout;
    if (v.classifierLayouts && typeof v.classifierLayouts === "object") {
      out.classifierLayouts = v.classifierLayouts;
    }
    return out;
  } catch {
    return null;
  }
}
