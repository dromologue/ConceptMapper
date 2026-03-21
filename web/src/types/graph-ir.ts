// --- Template / Config types ---

export type FieldType = "text" | "select" | "textarea";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];    // for select type
  required?: boolean;
}

export interface NodeTypeConfig {
  id: string;            // e.g. "person"
  label: string;         // e.g. "Person"
  shape: "circle" | "rectangle" | "diamond" | "hexagon" | "triangle" | "pill";
  icon?: string;         // single char for sidebar, defaults to label[0]
  size_field?: string;   // key of the field that drives node size
  size_map?: Record<string, number>;  // field value → radius
  fields: FieldConfig[];
  label_overrides?: Record<string, string>;  // field key → custom label for this type
}

export interface EdgeTypeConfig {
  id: string;            // e.g. "chain"
  label: string;         // e.g. "Chain"
  color?: string;        // display color
  directed: boolean;     // has arrow
  style?: string;        // "solid" | "dashed" | "dotted"
}

export interface TaxonomyTemplate {
  title: string;
  description?: string;
  streams: Stream[];
  generations: Generation[];
  node_types: NodeTypeConfig[];
  edge_types?: EdgeTypeConfig[];
  stream_label?: string;       // e.g. "Category", "Stream", "Domain"
  generation_label?: string;   // e.g. "Phase", "Horizon", "Generation"
}

/** .cm data file format (v2 JSON) */
export interface ConceptMapData {
  version: string;
  template: string;        // .cmt filename or path
  title?: string;
  streams?: Stream[];
  generations?: Generation[];
  node_types?: NodeTypeConfig[];
  edge_types?: EdgeTypeConfig[];
  nodes: DataNode[];
  edges: GraphEdge[];
  external_shocks: ExternalShock[];
  structural_observations: string[];
}

export interface DataNode {
  id: string;
  node_type: string;       // matches NodeTypeConfig.id
  name: string;
  generation?: number;
  stream?: string;
  properties: Record<string, string | string[] | number | undefined>;
  notes?: string;
}

// --- Runtime types ---

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
  template?: TaxonomyTemplate;  // merged at runtime after load
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
  node_type: string;
  name: string;
  generation?: number;
  stream?: string;
  properties?: Record<string, string | string[] | number | undefined>;
  content?: NodeContent;
  notes?: string;
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
