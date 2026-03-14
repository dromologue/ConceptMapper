export interface GraphIR {
  version: string;
  metadata: Metadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Metadata {
  title?: string;
  source_file?: string;
  parsed_at?: string;
  generations: Generation[];
  streams: Stream[];
  external_shocks: ExternalShock[];
  structural_observations: string[];
  network_stats?: NetworkStats;
}

export interface Generation {
  number: number;
  period?: string;
  label?: string;
  attention_space_count?: number;
}

export interface Stream {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

export interface ExternalShock {
  date: string;
  description: string;
}

export interface NetworkStats {
  chain_depth?: number;
  node_count: number;
  edge_count: number;
}

export interface GraphNode {
  id: string;
  node_type: "thinker" | "concept";
  name: string;
  generation?: number;
  stream?: string;
  thinker_fields?: ThinkerFields;
  concept_fields?: ConceptFields;
  content?: NodeContent;
  notes?: string;
}

export interface ThinkerFields {
  dates?: string;
  eminence: string;
  structural_roles: string[];
  active_period?: string;
  key_concept_ids: string[];
  institutional_base?: string;
  is_placeholder?: boolean;
}

export interface ConceptFields {
  originator_id: string;
  date_introduced?: string;
  concept_type: string;
  abstraction_level: string;
  status: string;
  parent_concept_id?: string;
}

export interface NodeContent {
  summary?: string;
  key_works?: string[];
  critiques?: string[];
  connections_prose?: { target_id: string; text: string }[];
}

export interface GraphEdge {
  from: string;
  to: string;
  edge_type: string;
  edge_category: "thinker_thinker" | "thinker_concept" | "concept_concept";
  directed: boolean;
  weight: number;
  note?: string;
  visual: EdgeVisual;
}

export interface EdgeVisual {
  style: string;
  color?: string;
  show_arrow: boolean;
}

// D3 simulation node type (extends GraphNode with x/y)
export interface SimNode extends GraphNode {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

// D3 simulation link type
export interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  edge: GraphEdge;
}
