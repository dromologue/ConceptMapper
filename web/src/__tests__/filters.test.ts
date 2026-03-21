import { describe, it, expect } from "vitest";
import { createEmptyFilterState, isFilterActive, isNodeFilterVisible } from "../utils/filters";
import type { FilterState } from "../utils/filters";
import type { GraphNode } from "../types/graph-ir";

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: "n1",
    node_type: "person",
    name: "Alice",
    generation: 1,
    stream: "s1",
    properties: { importance: "major" },
    ...overrides,
  };
}

describe("createEmptyFilterState", () => {
  it("returns null for all filter categories", () => {
    const state = createEmptyFilterState();
    expect(state.streams).toBeNull();
    expect(state.generations).toBeNull();
    expect(state.attributes.size).toBe(0);
  });
});

describe("isFilterActive", () => {
  it("returns false for empty filter state", () => {
    expect(isFilterActive(createEmptyFilterState())).toBe(false);
  });

  it("returns true when streams filter is set", () => {
    const state: FilterState = { ...createEmptyFilterState(), streams: new Set(["s1"]) };
    expect(isFilterActive(state)).toBe(true);
  });

  it("returns true when generations filter is set", () => {
    const state: FilterState = { ...createEmptyFilterState(), generations: new Set([1]) };
    expect(isFilterActive(state)).toBe(true);
  });

  it("returns true when attribute filter is set", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", new Set(["major"]));
    const state: FilterState = { ...createEmptyFilterState(), attributes: attrs };
    expect(isFilterActive(state)).toBe(true);
  });

  it("returns false when attribute map has only null values", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", null);
    const state: FilterState = { ...createEmptyFilterState(), attributes: attrs };
    expect(isFilterActive(state)).toBe(false);
  });
});

describe("isNodeFilterVisible", () => {
  it("shows all nodes when filters are empty", () => {
    const node = makeNode();
    expect(isNodeFilterVisible(node, createEmptyFilterState())).toBe(true);
  });

  // --- Stream filtering ---

  it("shows node when its stream is in the active set", () => {
    const state: FilterState = { ...createEmptyFilterState(), streams: new Set(["s1"]) };
    expect(isNodeFilterVisible(makeNode({ stream: "s1" }), state)).toBe(true);
  });

  it("hides node when its stream is NOT in the active set", () => {
    const state: FilterState = { ...createEmptyFilterState(), streams: new Set(["s2"]) };
    expect(isNodeFilterVisible(makeNode({ stream: "s1" }), state)).toBe(false);
  });

  it("hides node with no stream when stream filter is active", () => {
    const state: FilterState = { ...createEmptyFilterState(), streams: new Set(["s1"]) };
    expect(isNodeFilterVisible(makeNode({ stream: undefined }), state)).toBe(false);
  });

  // --- Generation filtering ---

  it("shows node when its generation is in the active set", () => {
    const state: FilterState = { ...createEmptyFilterState(), generations: new Set([1]) };
    expect(isNodeFilterVisible(makeNode({ generation: 1 }), state)).toBe(true);
  });

  it("hides node when its generation is NOT in the active set", () => {
    const state: FilterState = { ...createEmptyFilterState(), generations: new Set([2]) };
    expect(isNodeFilterVisible(makeNode({ generation: 1 }), state)).toBe(false);
  });

  it("hides node with no generation when generation filter is active", () => {
    const state: FilterState = { ...createEmptyFilterState(), generations: new Set([1]) };
    expect(isNodeFilterVisible(makeNode({ generation: undefined }), state)).toBe(false);
  });

  // --- Attribute filtering ---

  it("shows node when its property matches the attribute filter", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", new Set(["major"]));
    const state: FilterState = { ...createEmptyFilterState(), attributes: attrs };
    expect(isNodeFilterVisible(makeNode({ properties: { importance: "major" } }), state)).toBe(true);
  });

  it("hides node when its property does NOT match the attribute filter", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", new Set(["dominant"]));
    const state: FilterState = { ...createEmptyFilterState(), attributes: attrs };
    expect(isNodeFilterVisible(makeNode({ properties: { importance: "major" } }), state)).toBe(false);
  });

  it("does not apply attribute filter to nodes of a different type", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", new Set(["dominant"]));
    const state: FilterState = { ...createEmptyFilterState(), attributes: attrs };
    // concept node should NOT be affected by person.importance filter
    expect(isNodeFilterVisible(makeNode({ node_type: "concept", properties: { importance: "minor" } }), state)).toBe(true);
  });

  it("hides node with no value for a filtered property", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", new Set(["major"]));
    const state: FilterState = { ...createEmptyFilterState(), attributes: attrs };
    expect(isNodeFilterVisible(makeNode({ properties: {} }), state)).toBe(false);
  });

  it("ignores null attribute filter entries", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", null);
    const state: FilterState = { ...createEmptyFilterState(), attributes: attrs };
    expect(isNodeFilterVisible(makeNode(), state)).toBe(true);
  });

  // --- Combined filters (AND between categories) ---

  it("requires ALL active filter categories to pass (AND logic)", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", new Set(["major"]));
    const state: FilterState = {
      streams: new Set(["s1"]),
      generations: new Set([1]),
      attributes: attrs,
      dateRanges: new Map(),
    };
    // Passes all three
    expect(isNodeFilterVisible(makeNode({ stream: "s1", generation: 1, properties: { importance: "major" } }), state)).toBe(true);
    // Fails stream
    expect(isNodeFilterVisible(makeNode({ stream: "s2", generation: 1, properties: { importance: "major" } }), state)).toBe(false);
    // Fails generation
    expect(isNodeFilterVisible(makeNode({ stream: "s1", generation: 2, properties: { importance: "major" } }), state)).toBe(false);
    // Fails attribute
    expect(isNodeFilterVisible(makeNode({ stream: "s1", generation: 1, properties: { importance: "minor" } }), state)).toBe(false);
  });

  it("supports OR within a category (multiple selected values)", () => {
    const state: FilterState = { ...createEmptyFilterState(), streams: new Set(["s1", "s2"]) };
    expect(isNodeFilterVisible(makeNode({ stream: "s1" }), state)).toBe(true);
    expect(isNodeFilterVisible(makeNode({ stream: "s2" }), state)).toBe(true);
    expect(isNodeFilterVisible(makeNode({ stream: "s3" }), state)).toBe(false);
  });

  it("supports OR within attribute filters", () => {
    const attrs = new Map<string, Set<string> | null>();
    attrs.set("person.importance", new Set(["major", "dominant"]));
    const state: FilterState = { ...createEmptyFilterState(), attributes: attrs };
    expect(isNodeFilterVisible(makeNode({ properties: { importance: "major" } }), state)).toBe(true);
    expect(isNodeFilterVisible(makeNode({ properties: { importance: "dominant" } }), state)).toBe(true);
    expect(isNodeFilterVisible(makeNode({ properties: { importance: "minor" } }), state)).toBe(false);
  });

  // --- Date range filtering ---

  it("shows node when its date is within the range", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: "1920", to: "2020" });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    expect(isNodeFilterVisible(makeNode({ properties: { date_from: "1923", date_to: "2013" } }), state)).toBe(true);
  });

  it("hides node when its end date exceeds the range", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: "1920", to: "1950" });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    // Node started in range but ended after range
    expect(isNodeFilterVisible(makeNode({ properties: { date_from: "1923", date_to: "2013" } }), state)).toBe(false);
  });

  it("hides node when its start date is before the range", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: "1950", to: null });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    expect(isNodeFilterVisible(makeNode({ properties: { date_from: "1923", date_to: "2013" } }), state)).toBe(false);
  });

  it("hides node when its end date is after the range", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: null, to: "1900" });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    expect(isNodeFilterVisible(makeNode({ properties: { date_from: "1923", date_to: "2013" } }), state)).toBe(false);
  });

  it("hides node with no date when date range filter is active", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: "1900", to: null });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    expect(isNodeFilterVisible(makeNode({ properties: {} }), state)).toBe(false);
  });

  it("ignores date range filter for nodes of different type", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: "1950", to: null });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    expect(isNodeFilterVisible(makeNode({ node_type: "concept", properties: { date_from: "1900" } }), state)).toBe(true);
  });

  it("parses years from strings like 'b. 1947'", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: "1940", to: "1960" });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    expect(isNodeFilterVisible(makeNode({ properties: { date_from: "b. 1947" } }), state)).toBe(true);
  });

  it("ignores date range with both null bounds", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: null, to: null });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    expect(isNodeFilterVisible(makeNode({ properties: {} }), state)).toBe(true);
  });

  it("works with ISO date strings from date picker", () => {
    const ranges = new Map();
    ranges.set("person.date_from|date_to", { from: "2026-01-01", to: "2026-06-30" });
    const state: FilterState = { ...createEmptyFilterState(), dateRanges: ranges };
    // Node within range
    expect(isNodeFilterVisible(makeNode({ properties: { date_from: "2026-03", date_to: "2026-05" } }), state)).toBe(true);
    // Node after range
    expect(isNodeFilterVisible(makeNode({ properties: { date_from: "2026-07", date_to: "2026-08" } }), state)).toBe(false);
    // Node before range
    expect(isNodeFilterVisible(makeNode({ properties: { date_from: "2025-06", date_to: "2025-12" } }), state)).toBe(false);
  });
});
