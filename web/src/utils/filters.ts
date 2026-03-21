import type { GraphNode } from "../types/graph-ir";

export interface DateRange {
  from: string | null;  // ISO or year string, null = no lower bound
  to: string | null;    // ISO or year string, null = no upper bound
}

export interface FilterState {
  streams: Set<string> | null;       // null = all shown
  generations: Set<number> | null;   // null = all shown
  attributes: Map<string, Set<string> | null>;  // key = "nodeType.fieldKey"
  dateRanges: Map<string, DateRange>;  // key = "nodeType.fromField|toField"
}

export function createEmptyFilterState(): FilterState {
  return { streams: null, generations: null, attributes: new Map(), dateRanges: new Map() };
}

export function isFilterActive(filters: FilterState): boolean {
  if (filters.streams !== null) return true;
  if (filters.generations !== null) return true;
  for (const v of filters.attributes.values()) {
    if (v !== null) return true;
  }
  for (const v of filters.dateRanges.values()) {
    if (v.from !== null || v.to !== null) return true;
  }
  return false;
}

/**
 * Parse a date-like value into a comparable number.
 * Supports: "2026-03-15" (ISO), "2026-03" (month), "1923" (year), "b. 1947", "~1930".
 * Returns a sortable number: YYYYMMDD for full dates, YYYY0101 for years.
 */
function parseDateNum(val: string | undefined | null): number | null {
  if (val == null || val === "") return null;
  const s = String(val);
  // Full ISO date: 2026-03-15
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return parseInt(isoMatch[1] + isoMatch[2] + isoMatch[3], 10);
  // Month: 2026-03
  const monthMatch = s.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) return parseInt(monthMatch[1] + monthMatch[2] + "01", 10);
  // Year only: extract 4 digits
  const yearMatch = s.match(/(\d{4})/);
  if (yearMatch) return parseInt(yearMatch[1] + "0101", 10);
  return null;
}

export function isNodeFilterVisible(node: GraphNode, filters: FilterState): boolean {
  // Streams: OR within
  if (filters.streams !== null) {
    if (!node.stream || !filters.streams.has(node.stream)) return false;
  }

  // Generations: OR within
  if (filters.generations !== null) {
    if (node.generation == null || !filters.generations.has(node.generation)) return false;
  }

  // Attribute filters: AND between categories, OR within each
  for (const [compositeKey, selectedValues] of filters.attributes) {
    if (selectedValues === null) continue;
    const dotIdx = compositeKey.indexOf(".");
    if (dotIdx < 0) continue;
    const nodeType = compositeKey.slice(0, dotIdx);
    const fieldKey = compositeKey.slice(dotIdx + 1);

    // Only apply to matching node types
    if (node.node_type !== nodeType) continue;

    const val = node.properties?.[fieldKey];
    if (val == null || !selectedValues.has(String(val))) return false;
  }

  // Date range filters
  for (const [compositeKey, range] of filters.dateRanges) {
    if (range.from === null && range.to === null) continue;
    const dotIdx = compositeKey.indexOf(".");
    if (dotIdx < 0) continue;
    const nodeType = compositeKey.slice(0, dotIdx);
    const fieldsPart = compositeKey.slice(dotIdx + 1);

    if (node.node_type !== nodeType) continue;

    const [fromField, toField] = fieldsPart.split("|");
    const nodeFrom = parseDateNum(node.properties?.[fromField] as string | undefined);
    const nodeTo = parseDateNum(node.properties?.[toField ?? fromField] as string | undefined);

    // Use whichever date the node has — prefer from, fallback to to
    const nodeStart = nodeFrom ?? nodeTo;
    if (nodeStart == null) return false; // no date → hidden when date filter active

    if (range.from !== null) {
      const rangeFrom = parseDateNum(range.from);
      if (rangeFrom !== null && nodeStart < rangeFrom) return false;
    }
    if (range.to !== null) {
      const rangeTo = parseDateNum(range.to);
      if (rangeTo !== null) {
        const nodeEnd = nodeTo ?? nodeFrom ?? nodeStart;
        if (nodeEnd > rangeTo) return false;
      }
    }
  }

  return true;
}
