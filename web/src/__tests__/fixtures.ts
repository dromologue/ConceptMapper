import type { GraphIR, GraphNode, GraphEdge, NodeTypeConfig, Classifier } from "../types/graph-ir";
import { DEFAULT_NODE_CONFIG, DEFAULT_PERSON_CONFIG, DEFAULT_CONCEPT_CONFIG } from "../migration";

export const defaultNodeTypeConfigs: NodeTypeConfig[] = [DEFAULT_NODE_CONFIG];
export const legacyNodeTypeConfigs: NodeTypeConfig[] = [DEFAULT_PERSON_CONFIG, DEFAULT_CONCEPT_CONFIG];

// Classifier that used to be modelled as "streams" — now just a regular classifier.
export const conditionClassifier: Classifier = {
  id: "condition",
  label: "Conditions",
  layout: "x",
  values: [
    { id: "psychology", label: "Psychology & Cognition", color: "#D9A84A", description: "How individuals think" },
    { id: "systems", label: "Systems & Complexity", color: "#4AD94A", description: "How systems work" },
    { id: "sensemaking", label: "Sensemaking & Safety", color: "#9B59B6", description: "How meaning is constructed" },
  ],
};

// Classifier that used to be modelled as "generations" — now just a regular classifier.
export const generationClassifier: Classifier = {
  id: "generation",
  label: "Generations",
  layout: "y",
  values: [
    { id: "2", label: "Systematisers", description: "~1930–1960" },
    { id: "3", label: "Flowering", description: "~1960–1985" },
    { id: "5", label: "Practitioners", description: "~2000–present" },
  ],
};

export const sampleClassifiers: Classifier[] = [conditionClassifier, generationClassifier];

export const sampleRegionClassifier: Classifier = {
  id: "domain",
  label: "Domain",
  layout: "region-column",
  values: [
    { id: "theory", label: "Theory", color: "#4A90D9" },
    { id: "practice", label: "Practice", color: "#D94A4A" },
    { id: "methodology", label: "Methodology", color: "#4AD94A" },
  ],
};

export const argyris: GraphNode = {
  id: "argyris",
  node_type: "person",
  name: "Chris Argyris",
  classifiers: { generation: "2", condition: "psychology" },
  tags: ["Harvard Business School"],
  properties: {
    importance: "dominant",
    date_from: "1923",
    date_to: "2013",
    structural_roles: "intellectual_leader, chain_originator",
  },
};

export const senge: GraphNode = {
  id: "senge",
  node_type: "person",
  name: "Peter Senge",
  classifiers: { generation: "3", condition: "systems" },
  tags: ["MIT Sloan"],
  properties: {
    importance: "major",
    date_from: "1947",
    structural_roles: "synthesiser",
  },
};

export const dekker: GraphNode = {
  id: "dekker",
  node_type: "person",
  name: "Sidney Dekker",
  classifiers: { generation: "5", condition: "sensemaking" },
  tags: ["Griffith University"],
  properties: {
    importance: "major",
    date_from: "1969",
    structural_roles: "intellectual_leader",
  },
};

export const doubleLoop: GraphNode = {
  id: "double_loop",
  node_type: "concept",
  name: "Double-Loop Learning",
  classifiers: { generation: "3", condition: "psychology" },
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
  classifiers: { generation: "5", condition: "sensemaking" },
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
    classifiers: sampleClassifiers,
    notes: ["Test observation", "Agile Manifesto, 2001"],
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
