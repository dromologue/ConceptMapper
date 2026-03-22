import type { GraphNode } from "../types/graph-ir";

export interface DateRange {
  from: string | null;  // ISO or year string, null = no lower bound
  to: string | null;    // ISO or year string, null = no upper bound
}

export interface AttributeFilter {
  nodeType: string;
  field: string;
  values: Set<string> | null;  // null = all shown (filter inactive for this attr)
}

export interface DateRangeFilter {
  nodeType: string;
  fromField: string;
  toField?: string;
  range: DateRange;
}

export interface ClassifierFilter {
  classifierId: string;
  values: Set<string> | null;  // null = all shown
}

export interface FilterState {
  classifiers: ClassifierFilter[];
  attributes: AttributeFilter[];
  dateRanges: DateRangeFilter[];
  tags: Set<string> | null;          // null = all shown
  // Legacy — keep temporarily
  streams: Set<string> | null;       // null = all shown
  generations: Set<number> | null;   // null = all shown
}

export function createEmptyFilterState(): FilterState {
  return { streams: null, generations: null, classifiers: [], attributes: [], dateRanges: [], tags: null };
}

export function isFilterActive(filters: FilterState): boolean {
  if (filters.streams !== null) return true;
  if (filters.generations !== null) return true;
  for (const cf of filters.classifiers) {
    if (cf.values !== null) return true;
  }
  if (filters.tags !== null) return true;
  for (const attr of filters.attributes) {
    if (attr.values !== null) return true;
  }
  for (const dr of filters.dateRanges) {
    if (dr.range.from !== null || dr.range.to !== null) return true;
  }
  return false;
}

/** Find an attribute filter by nodeType and field */
export function findAttributeFilter(filters: FilterState, nodeType: string, field: string): AttributeFilter | undefined {
  return filters.attributes.find((a) => a.nodeType === nodeType && a.field === field);
}

/** Find a date range filter by nodeType and fields */
export function findDateRangeFilter(filters: FilterState, nodeType: string, fromField: string, toField?: string): DateRangeFilter | undefined {
  return filters.dateRanges.find((d) => d.nodeType === nodeType && d.fromField === fromField && d.toField === (toField ?? undefined));
}

/**
 * Parse a date-like value into a comparable number.
 * Supports: "2026-03-15" (ISO), "2026-03" (month), "1923" (year), "b. 1947", "~1930".
 * Returns a sortable number: YYYYMMDD for full dates, YYYY0101 for years.
 */
function parseDateNum(val: string | undefined | null): number | null {
  if (val == null || val === "") return null;
  const s = String(val);
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return parseInt(isoMatch[1] + isoMatch[2] + isoMatch[3], 10);
  const monthMatch = s.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) return parseInt(monthMatch[1] + monthMatch[2] + "01", 10);
  const yearMatch = s.match(/(\d{4})/);
  if (yearMatch) return parseInt(yearMatch[1] + "0101", 10);
  return null;
}

export function isNodeFilterVisible(node: GraphNode, filters: FilterState): boolean {
  // Classifier filters
  for (const cf of filters.classifiers) {
    if (cf.values === null) continue;
    const nodeVal = node.classifiers?.[cf.classifierId];
    if (nodeVal == null || !cf.values.has(String(nodeVal))) return false;
  }

  // Tag filter (OR: node must have at least one matching tag)
  if (filters.tags !== null) {
    if (!node.tags || node.tags.length === 0) return false;
    if (!node.tags.some((t) => filters.tags!.has(t))) return false;
  }

  // Streams: OR within
  if (filters.streams !== null) {
    if (!node.stream || !filters.streams.has(node.stream)) return false;
  }

  // Generations: OR within
  if (filters.generations !== null) {
    if (node.generation == null || !filters.generations.has(node.generation)) return false;
  }

  // Attribute filters: AND between categories, OR within each
  for (const attr of filters.attributes) {
    if (attr.values === null) continue;
    if (node.node_type !== attr.nodeType) continue;

    const val = node.properties?.[attr.field];
    if (val == null || !attr.values.has(String(val))) return false;
  }

  // Date range filters
  for (const dr of filters.dateRanges) {
    if (dr.range.from === null && dr.range.to === null) continue;
    if (node.node_type !== dr.nodeType) continue;

    const fromField = dr.fromField;
    const toField = dr.toField ?? fromField;
    const nodeFrom = parseDateNum(node.properties?.[fromField] as string | undefined);
    const nodeTo = parseDateNum(node.properties?.[toField] as string | undefined);

    const nodeStart = nodeFrom ?? nodeTo;
    if (nodeStart == null) return false;

    if (dr.range.from !== null) {
      const rangeFrom = parseDateNum(dr.range.from);
      if (rangeFrom !== null && nodeStart < rangeFrom) return false;
    }
    if (dr.range.to !== null) {
      const rangeTo = parseDateNum(dr.range.to);
      if (rangeTo !== null) {
        const nodeEnd = nodeTo ?? nodeFrom ?? nodeStart;
        if (nodeEnd > rangeTo) return false;
      }
    }
  }

  return true;
}

export function findClassifierFilter(filters: FilterState, classifierId: string): ClassifierFilter | undefined {
  return filters.classifiers.find((c) => c.classifierId === classifierId);
}
