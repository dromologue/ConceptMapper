import type { GraphIR, GraphNode, GraphEdge, NodeTypeConfig, Classifier } from "../types/graph-ir";
import type { LLMConfig, AppConfig, ChatMessage } from "../types/llm";
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

// LLM test fixtures
export const sampleLLMConfig: LLMConfig = {
  provider: "anthropic",
  apiKey: (typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).process
    ? ((globalThis as Record<string, unknown>).process as Record<string, Record<string, string>>).env?.ANTHROPIC_API_KEY
    : undefined) ?? "test-key",
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
};

export const sampleAppConfig: AppConfig = {
  llm: sampleLLMConfig,
};

export const sampleChatMessages: ChatMessage[] = [
  { role: "user", content: "What are the key relationships in this network?", timestamp: Date.now() - 2000 },
  { role: "assistant", content: "The network shows Argyris influencing Senge through the chain relationship.", timestamp: Date.now() - 1000 },
];
