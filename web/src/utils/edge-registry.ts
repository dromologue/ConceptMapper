import type { EdgeVisual } from "../types/graph-ir";

/** Default edge type configuration — fallback when no .cmt template defines edge_types. */
export interface DefaultEdgeType {
  id: string;
  label: string;
  directed: boolean;
  style: "solid" | "dashed" | "dotted";
  color?: string;
  showArrow: boolean;
}

export const DEFAULT_EDGE_TYPES: DefaultEdgeType[] = [
  { id: "chain", label: "Chain", directed: true, style: "solid", showArrow: true },
  { id: "teacher_pupil", label: "Teacher \u2192 Pupil", directed: true, style: "solid", showArrow: true },
  { id: "rivalry", label: "Rivalry", directed: false, style: "dashed", color: "#D94A4A", showArrow: false },
  { id: "opposes", label: "Opposes", directed: false, style: "dashed", color: "#D94A4A", showArrow: false },
  { id: "alliance", label: "Alliance", directed: false, style: "dotted", color: "#999999", showArrow: false },
  { id: "institutional", label: "Institutional", directed: false, style: "dotted", color: "#999999", showArrow: false },
  { id: "synthesis", label: "Synthesis", directed: true, style: "solid", showArrow: true },
  { id: "originates", label: "Originates", directed: true, style: "solid", showArrow: true },
  { id: "develops", label: "Develops", directed: true, style: "solid", showArrow: true },
  { id: "contests", label: "Contests", directed: false, style: "dashed", showArrow: false },
  { id: "applies", label: "Applies", directed: true, style: "solid", showArrow: true },
  { id: "extends", label: "Extends", directed: true, style: "solid", showArrow: true },
  { id: "subsumes", label: "Subsumes", directed: true, style: "solid", showArrow: true },
  { id: "enables", label: "Enables", directed: true, style: "solid", showArrow: true },
  { id: "reframes", label: "Reframes", directed: true, style: "solid", showArrow: true },
];

const edgeTypeMap = new Map(DEFAULT_EDGE_TYPES.map((e) => [e.id, e]));

/** Get the default visual for an edge type (fallback when template has no override). */
export function getDefaultEdgeVisual(edgeType: string): EdgeVisual & { directed: boolean } {
  const def = edgeTypeMap.get(edgeType);
  if (def) {
    return {
      style: def.style,
      color: def.color ?? undefined,
      show_arrow: def.showArrow,
      directed: def.directed,
    };
  }
  return { style: "solid", show_arrow: true, directed: true };
}

/** Get the human-readable label for an edge type. */
export function getEdgeLabel(edgeType: string): string {
  return edgeTypeMap.get(edgeType)?.label ?? edgeType;
}
