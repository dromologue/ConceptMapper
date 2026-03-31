import type { GraphIR, GraphNode, GraphEdge, NodeTypeConfig, Classifier } from "../types/graph-ir";
import { DEFAULT_NODE_CONFIG, DEFAULT_PERSON_CONFIG, DEFAULT_CONCEPT_CONFIG, streamsToClassifier, generationsToClassifier } from "../migration";

export const defaultNodeTypeConfigs: NodeTypeConfig[] = [DEFAULT_NODE_CONFIG];
export const legacyNodeTypeConfigs: NodeTypeConfig[] = [DEFAULT_PERSON_CONFIG, DEFAULT_CONCEPT_CONFIG];

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

export const sampleClassifiers: Classifier[] = [
  streamsToClassifier(sampleStreams),
  generationsToClassifier(sampleGenerations),
];

export const argyris: GraphNode = {
  id: "argyris",
  node_type: "person",
  name: "Chris Argyris",
  generation: 2,
  stream: "psychology",
  properties: {
    importance: "dominant",
    date_from: "1923",
    date_to: "2013",
    tags: "Harvard Business School",
    structural_roles: "intellectual_leader, chain_originator",
  },
};

export const senge: GraphNode = {
  id: "senge",
  node_type: "person",
  name: "Peter Senge",
  generation: 3,
  stream: "systems",
  properties: {
    importance: "major",
    date_from: "1947",
    tags: "MIT Sloan",
    structural_roles: "synthesiser",
  },
};

export const dekker: GraphNode = {
  id: "dekker",
  node_type: "person",
  name: "Sidney Dekker",
  generation: 5,
  stream: "sensemaking",
  properties: {
    importance: "major",
    date_from: "1969",
    tags: "Griffith University",
    structural_roles: "intellectual_leader",
  },
};

export const doubleLoop: GraphNode = {
  id: "double_loop",
  node_type: "concept",
  name: "Double-Loop Learning",
  generation: 3,
  stream: "psychology",
  properties: {
    concept_type: "distinction",
    abstraction_level: "theoretical",
    status: "active",
    originator_id: "argyris",
    date_introduced: "1977",
  },
};

export const cynefin: GraphNode = {
  id: "cynefin",
  node_type: "concept",
  name: "Cynefin Framework",
  generation: 5,
  stream: "sensemaking",
  properties: {
    concept_type: "framework",
    abstraction_level: "operational",
    status: "active",
    originator_id: "snowden",
    date_introduced: "1999",
  },
};

export const sampleEdges: GraphEdge[] = [
  {
    from: "argyris", to: "senge", edge_type: "chain",
    directed: true, weight: 1.0,
    note: "Learning organisation draws directly on Argyris' learning theory",
    visual: { style: "solid", show_arrow: true },
  },
  {
    from: "argyris", to: "double_loop", edge_type: "originates",
    directed: true, weight: 1.0,
    visual: { style: "solid", show_arrow: true },
  },
  {
    from: "cynefin", to: "double_loop", edge_type: "reframes",
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

// Multi-classifier fixture: first has no colors (decade), second has colors (domain)
export const classifierWithoutColors: Classifier = {
  id: "decade",
  label: "Decade",
  layout: "y",
  values: [
    { id: "1940s", label: "1940s" },
    { id: "1960s", label: "1960s" },
    { id: "1980s", label: "1980s" },
  ],
};

export const classifierWithColors: Classifier = {
  id: "domain",
  label: "Domain",
  layout: "region",
  values: [
    { id: "math_physical", label: "Mathematical & Physical", color: "#4A90D9" },
    { id: "systems_cybernetics", label: "Systems & Cybernetics", color: "#50C878" },
    { id: "core_complexity", label: "Core Complexity", color: "#C4B035" },
  ],
};

export const multiClassifiers: Classifier[] = [classifierWithoutColors, classifierWithColors];

