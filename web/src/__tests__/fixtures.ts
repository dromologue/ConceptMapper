import type { GraphIR, GraphNode, GraphEdge } from "../types/graph-ir";

export const sampleStreams = [
  { id: "psychology", name: "Psychology & Cognition", color: "#D9A84A", description: "How individuals think" },
  { id: "systems", name: "Systems & Complexity", color: "#4AD94A", description: "How systems work" },
  { id: "sensemaking", name: "Sensemaking & Safety", color: "#9B59B6", description: "How meaning is constructed" },
];

export const sampleGenerations = [
  { number: 2, period: "~1930–1960", label: "Systematisers", attention_space_count: 4 },
  { number: 3, period: "~1960–1985", label: "Flowering", attention_space_count: 5 },
  { number: 5, period: "~2000–present", label: "Practitioners", attention_space_count: 4 },
];

export const argyris: GraphNode = {
  id: "argyris",
  node_type: "thinker",
  name: "Chris Argyris",
  generation: 2,
  stream: "psychology",
  thinker_fields: {
    dates: "1923–2013",
    eminence: "dominant",
    structural_roles: ["intellectual_leader", "chain_originator"],
    active_period: "1960–1995",
    key_concept_ids: ["double_loop"],
    institutional_base: "Harvard Business School",
    is_placeholder: false,
  },
};

export const senge: GraphNode = {
  id: "senge",
  node_type: "thinker",
  name: "Peter Senge",
  generation: 3,
  stream: "systems",
  thinker_fields: {
    dates: "b. 1947",
    eminence: "major",
    structural_roles: ["synthesiser"],
    active_period: "1990–2010",
    key_concept_ids: ["learning_organisation"],
    institutional_base: "MIT Sloan",
    is_placeholder: false,
  },
};

export const dekker: GraphNode = {
  id: "dekker",
  node_type: "thinker",
  name: "Sidney Dekker",
  generation: 5,
  stream: "sensemaking",
  thinker_fields: {
    dates: "b. 1969",
    eminence: "major",
    structural_roles: ["intellectual_leader"],
    active_period: "2006–present",
    key_concept_ids: ["just_culture", "drift_into_failure"],
    institutional_base: "Griffith University",
    is_placeholder: false,
  },
};

export const doubleLoop: GraphNode = {
  id: "double_loop",
  node_type: "concept",
  name: "Double-Loop Learning",
  generation: 3,
  stream: "psychology",
  concept_fields: {
    originator_id: "argyris",
    date_introduced: "1977",
    concept_type: "distinction",
    abstraction_level: "theoretical",
    status: "active",
  },
};

export const cynefin: GraphNode = {
  id: "cynefin",
  node_type: "concept",
  name: "Cynefin Framework",
  generation: 5,
  stream: "sensemaking",
  concept_fields: {
    originator_id: "snowden",
    date_introduced: "1999",
    concept_type: "framework",
    abstraction_level: "operational",
    status: "active",
  },
};

export const sampleEdges: GraphEdge[] = [
  {
    from: "argyris", to: "senge", edge_type: "chain", edge_category: "thinker_thinker",
    directed: true, weight: 1.0,
    note: "Learning organisation draws directly on Argyris' learning theory",
    visual: { style: "solid", show_arrow: true },
  },
  {
    from: "argyris", to: "double_loop", edge_type: "originates", edge_category: "thinker_concept",
    directed: true, weight: 1.0,
    visual: { style: "solid", show_arrow: true },
  },
  {
    from: "cynefin", to: "double_loop", edge_type: "reframes", edge_category: "concept_concept",
    directed: true, weight: 1.0,
    note: "Double-loop works in the complicated domain; complex requires probe-sense-respond",
    visual: { style: "solid", show_arrow: true },
  },
];

export const sampleGraphData: GraphIR = {
  version: "1.0",
  metadata: {
    title: "Test Network",
    source_file: "test.md",
    parsed_at: "2026-03-14T00:00:00Z",
    generations: sampleGenerations,
    streams: sampleStreams,
    external_shocks: [{ date: "2001", description: "Agile Manifesto" }],
    structural_observations: ["Test observation"],
    network_stats: { node_count: 5, edge_count: 3 },
  },
  nodes: [argyris, senge, dekker, doubleLoop, cynefin],
  edges: sampleEdges,
};
