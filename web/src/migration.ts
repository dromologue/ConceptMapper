import type {
  GraphIR, GraphNode,
  TaxonomyTemplate, ConceptMapData, DataNode,
  NodeTypeConfig, FieldConfig,
} from "./types/graph-ir";

/** Raw node shape from the WASM parser (Rust outputs `fields`, not `properties`) */
interface RawParsedNode extends Omit<GraphNode, 'properties'> {
  fields?: Record<string, string>;
}

// --- Default Node Type Configs ---

// Legacy configs — kept for backward compatibility with old .cm files
export const DEFAULT_PERSON_CONFIG: NodeTypeConfig = {
  id: "person",
  label: "Person",
  shape: "circle",
  icon: "P",
  size_field: "importance",
  size_map: { dominant: 20, major: 14, secondary: 10, minor: 6 },
  fields: [
    { key: "importance", label: "Importance", type: "select", options: ["dominant", "major", "secondary", "minor"] },
    { key: "date_from", label: "From", type: "text" },
    { key: "date_to", label: "To", type: "text" },
    { key: "tags", label: "Tags", type: "text" },
    { key: "structural_roles", label: "Roles", type: "text" },
  ],
};

export const DEFAULT_CONCEPT_CONFIG: NodeTypeConfig = {
  id: "concept",
  label: "Concept",
  shape: "rectangle",
  icon: "C",
  size_field: "abstraction_level",
  size_map: { "meta-theoretical": 16, theoretical: 13, operational: 10, concrete: 7 },
  fields: [
    { key: "concept_type", label: "Type", type: "select", options: ["framework", "principle", "distinction", "mechanism", "prescription", "synthesis"] },
    { key: "abstraction_level", label: "Abstraction", type: "select", options: ["meta-theoretical", "theoretical", "operational", "concrete"] },
    { key: "status", label: "Status", type: "select", options: ["active", "absorbed", "contested", "dormant", "superseded"] },
    { key: "originator_id", label: "Originator", type: "text" },
    { key: "date_introduced", label: "Date Introduced", type: "text" },
  ],
};

/** Default node type for new taxonomies — blank slate, users define their own fields */
export const DEFAULT_NODE_CONFIG: NodeTypeConfig = {
  id: "node",
  label: "Node",
  shape: "circle",
  icon: "N",
  fields: [],
};

export const DEFAULT_NODE_TYPES: NodeTypeConfig[] = [DEFAULT_NODE_CONFIG];

/**
 * Migrate a parsed GraphIR (from the WASM markdown parser) into template + data.
 * Maps "thinker" → "person" with renamed fields.
 */
export function migrateFromParser(parsed: GraphIR): { template: TaxonomyTemplate; data: ConceptMapData } {
  // The WASM parser outputs nodes with `fields` (Rust convention), cast to RawParsedNode
  const rawNodes = parsed.nodes as unknown as RawParsedNode[];

  // Derive node type configs from the actual node types present in the data
  const typeIds = new Set(rawNodes.map((n) => n.node_type));
  const nodeTypes: NodeTypeConfig[] = [];
  for (const typeId of typeIds) {
    // Derive fields from the actual data for this type
    const typeNodes = rawNodes.filter((n) => n.node_type === typeId);
    const fieldKeys = new Set<string>();
    for (const n of typeNodes) {
      if (n.fields) {
        for (const key of Object.keys(n.fields)) fieldKeys.add(key);
      }
    }
    const fields: FieldConfig[] = [...fieldKeys].map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      type: "text" as const,
    }));
    nodeTypes.push({
      id: typeId,
      label: typeId.charAt(0).toUpperCase() + typeId.slice(1),
      shape: "circle",
      icon: typeId[0]?.toUpperCase() ?? "?",
      fields: fields.length > 0 ? fields : DEFAULT_NODE_CONFIG.fields,
    });
  }

  const template: TaxonomyTemplate = {
    title: parsed.metadata.title ?? "Untitled",
    description: parsed.metadata.structural_observations[0] ?? undefined,
    streams: parsed.metadata.streams,
    generations: parsed.metadata.generations,
    node_types: nodeTypes.length > 0 ? nodeTypes : DEFAULT_NODE_TYPES,
  };

  const nodes: DataNode[] = rawNodes.map((n) => ({
    id: n.id,
    node_type: n.node_type,
    name: n.name,
    generation: n.generation,
    stream: n.stream,
    properties: { ...(n.fields ?? {}) },
    notes: n.notes,
  }));

  const data: ConceptMapData = {
    version: "2.0",
    template: "",
    nodes,
    edges: parsed.edges,
    external_shocks: parsed.metadata.external_shocks,
    structural_observations: parsed.metadata.structural_observations,
  };

  return { template, data };
}

/**
 * Merge a template + data into a runtime GraphIR (for rendering).
 */
export function graphIRFromData(template: TaxonomyTemplate, data: ConceptMapData): GraphIR {
  const nodes: GraphNode[] = data.nodes.map((dn) => {
    const node: GraphNode = {
      id: dn.id,
      node_type: dn.node_type,
      name: dn.name,
      generation: dn.generation,
      stream: dn.stream,
      properties: { ...dn.properties },
      notes: dn.notes,
    };

    return node;
  });

  return {
    version: data.version,
    metadata: {
      title: template.title,
      streams: template.streams,
      generations: template.generations,
      external_shocks: data.external_shocks,
      structural_observations: data.structural_observations,
      template,
    },
    nodes,
    edges: data.edges,
  };
}

/**
 * Extract data from a runtime GraphIR for saving as .cm JSON.
 */
export function dataFromGraphIR(graphIR: GraphIR, templateRef: string = ""): ConceptMapData {
  const nodes: DataNode[] = graphIR.nodes.map((n) => ({
    id: n.id,
    node_type: n.node_type,
    name: n.name,
    generation: n.generation,
    stream: n.stream,
    properties: n.properties ?? {},
    notes: n.notes,
  }));

  return {
    version: "2.0",
    template: templateRef,
    title: graphIR.metadata.title,
    streams: graphIR.metadata.streams,
    generations: graphIR.metadata.generations,
    node_types: graphIR.metadata.template?.node_types,
    edge_types: graphIR.metadata.template?.edge_types,
    nodes,
    edges: graphIR.edges,
    external_shocks: graphIR.metadata.external_shocks,
    structural_observations: graphIR.metadata.structural_observations,
  };
}

/**
 * Get a node type config by id, or return a fallback config.
 */
export function getNodeTypeConfig(nodeTypes: NodeTypeConfig[], nodeType: string): NodeTypeConfig | undefined {
  return nodeTypes.find((t) => t.id === nodeType);
}

/**
 * Get node radius from config, falling back to defaults.
 */
export function getConfigNodeRadius(config: NodeTypeConfig | undefined, properties: Record<string, string | string[] | number | undefined> | undefined): number {
  if (!config || !config.size_field || !config.size_map) return 10;
  const sizeValue = properties?.[config.size_field];
  if (typeof sizeValue === "string" && config.size_map[sizeValue] != null) {
    return config.size_map[sizeValue];
  }
  return 10;
}
