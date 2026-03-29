import { DEFAULT_EDGE_TYPES } from "./edge-registry";

/** Map from edge type ID to human-readable label. Derived from the edge registry. */
export const EDGE_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_EDGE_TYPES.map((e) => [e.id, e.label])
);
