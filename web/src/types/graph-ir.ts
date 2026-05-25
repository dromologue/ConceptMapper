// --- Layout preset ---

export type LayoutPreset = "force" | "flow" | "radial";

// --- Template / Config types ---

export type FieldType = "text" | "select" | "textarea" | "time";

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

// --- Classifier types: the only structural axis the runtime understands ---

export interface ClassifierValue {
  id: string;
  label: string;
  color?: string;        // hex color — meaningful on first classifier (drives node color)
  description?: string;
}

export interface Classifier {
  id: string;            // e.g. "discipline", "phase"
  label: string;         // e.g. "Disciplines", "Phases"
  layout?: "x" | "y" | "region" | "region-column";   // "region" = circle clusters; "region-column" = fixed-width columns; omit = filter-only
  values: ClassifierValue[];
}

export interface TaxonomyTemplate {
  title: string;
  description?: string;
  classifiers?: Classifier[];
  node_types: NodeTypeConfig[];
  edge_types?: EdgeTypeConfig[];
}

/** .cm data file format (v2 JSON) */
export interface ConceptMapData {
  version: string;
  template: string;        // .cmt filename or path
  title?: string;
  classifiers?: Classifier[];
  node_types?: NodeTypeConfig[];
  edge_types?: EdgeTypeConfig[];
  nodes: DataNode[];
  edges: GraphEdge[];
  /** Free-form document-level notes. Anything more structured belongs in
   *  a node defined by the template. */
  notes?: string[];
}

export interface DataNode {
  id: string;
  node_type: string;       // matches NodeTypeConfig.id
  name: string;
  tags?: string[];
  classifiers?: Record<string, string>;
  properties: Record<string, string | string[] | number | undefined>;
  notes?: string;
  /** Absolute path to an external markdown file backing this node's notes.
   *  When set, the notes pane loads from / saves to this file. REQ-111. */
  notes_file?: string;
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
  source_template?: string;     // .cmt filename, preserved across save/load
  parsed_at?: string;
  classifiers?: Classifier[];
  /** Free-form document-level notes (populated from a `## Notes` section). */
  notes: string[];
  network_stats?: NetworkStats;
  template?: TaxonomyTemplate;  // merged at runtime after load
}

export interface NetworkStats {
  node_count: number;
  edge_count: number;
}

export interface GraphNode {
  id: string;
  node_type: string;
  name: string;
  tags?: string[];
  classifiers?: Record<string, string>;
  properties?: Record<string, string | string[] | number | undefined>;
  notes?: string;
  /** Absolute path to an external markdown file backing this node's notes.
   *  When set, the notes pane loads from / saves to this file. REQ-111. */
  notes_file?: string;
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
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

// D3 simulation link type
export interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  edge: GraphEdge;
}
