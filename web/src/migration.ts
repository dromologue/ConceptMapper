import type {
  GraphIR, GraphNode,
  TaxonomyTemplate, ConceptMapData, DataNode,
  NodeTypeConfig,
} from "./types/graph-ir";

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

/** Default node type for new taxonomies — generic, all text fields */
export const DEFAULT_NODE_CONFIG: NodeTypeConfig = {
  id: "node",
  label: "Node",
  shape: "circle",
  icon: "N",
  fields: [
    { key: "importance", label: "Importance", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "precursor", label: "Precursor", type: "text" },
    { key: "date_from", label: "From", type: "text" },
    { key: "date_to", label: "To", type: "text" },
    { key: "tags", label: "Tags", type: "text" },
    { key: "structural_roles", label: "Roles", type: "text" },
  ],
};

export const DEFAULT_NODE_TYPES: NodeTypeConfig[] = [DEFAULT_NODE_CONFIG];

/**
 * Migrate a parsed GraphIR (from the WASM markdown parser) into template + data.
 * Maps "thinker" → "person" with renamed fields.
 */
export function migrateFromParser(parsed: GraphIR): { template: TaxonomyTemplate; data: ConceptMapData } {
  // Derive node type configs from the actual node types present in the data
  const typeIds = new Set(parsed.nodes.map((n) => n.node_type));
  const nodeTypes: NodeTypeConfig[] = [];
  for (const typeId of typeIds) {
    // Map known types to sensible configs, otherwise create generic
    if (typeId === "thinker") {
      nodeTypes.push(DEFAULT_PERSON_CONFIG);
    } else if (typeId === "concept") {
      nodeTypes.push(DEFAULT_CONCEPT_CONFIG);
    } else {
      nodeTypes.push({
        id: typeId,
        label: typeId.charAt(0).toUpperCase() + typeId.slice(1),
        shape: "circle",
        icon: typeId[0]?.toUpperCase() ?? "?",
        fields: DEFAULT_NODE_CONFIG.fields,
      });
    }
  }

  const template: TaxonomyTemplate = {
    title: parsed.metadata.title ?? "Untitled",
    description: parsed.metadata.structural_observations[0] ?? undefined,
    streams: parsed.metadata.streams,
    generations: parsed.metadata.generations,
    node_types: nodeTypes.length > 0 ? nodeTypes : DEFAULT_NODE_TYPES,
  };

  const nodes: DataNode[] = parsed.nodes.map((n) => {
    if (n.node_type === "thinker") {
      const tf = n.thinker_fields;
      // Parse dates string into from/to if it contains a dash
      let dateFrom = tf?.dates ?? "";
      let dateTo = "";
      if (dateFrom.includes("–") || dateFrom.includes("-")) {
        const sep = dateFrom.includes("–") ? "–" : "-";
        const parts = dateFrom.split(sep).map((s) => s.trim());
        dateFrom = parts[0] ?? "";
        dateTo = parts[1] ?? "";
      }
      return {
        id: n.id,
        node_type: "person",
        name: n.name,
        generation: n.generation,
        stream: n.stream,
        properties: {
          importance: tf?.eminence ?? "minor",
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          tags: tf?.institutional_base ?? undefined,
          structural_roles: tf?.structural_roles?.join(", ") || undefined,
        },
        notes: n.notes,
      };
    } else if (n.node_type === "concept") {
      const cf = n.concept_fields;
      return {
        id: n.id,
        node_type: "concept",
        name: n.name,
        generation: n.generation,
        stream: n.stream,
        properties: {
          concept_type: cf?.concept_type ?? undefined,
          abstraction_level: cf?.abstraction_level ?? undefined,
          status: cf?.status ?? undefined,
          originator_id: cf?.originator_id ?? undefined,
          date_introduced: cf?.date_introduced ?? undefined,
        },
        notes: n.notes,
      };
    } else {
      // Generic node type — use fields as properties
      return {
        id: n.id,
        node_type: n.node_type,
        name: n.name,
        generation: n.generation,
        stream: n.stream,
        properties: { ...(n.fields ?? {}) },
        notes: n.notes,
      };
    }
  });

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
  const configMap = new Map(template.node_types.map((t) => [t.id, t]));

  const nodes: GraphNode[] = data.nodes.map((dn) => {
    const config = configMap.get(dn.node_type);
    const node: GraphNode = {
      id: dn.id,
      node_type: dn.node_type,
      name: dn.name,
      generation: dn.generation,
      stream: dn.stream,
      properties: { ...dn.properties },
      notes: dn.notes,
    };

    // Backfill thinker_fields/concept_fields for backward compat with rendering
    if (dn.node_type === "person" || (config && config.shape === "circle")) {
      node.thinker_fields = {
        eminence: String(dn.properties.importance ?? "minor"),
        dates: [dn.properties.date_from, dn.properties.date_to].filter(Boolean).join("–") || undefined,
        structural_roles: typeof dn.properties.structural_roles === "string"
          ? dn.properties.structural_roles.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        key_concept_ids: [],
        institutional_base: typeof dn.properties.tags === "string" ? dn.properties.tags : undefined,
      };
    }
    if (dn.node_type === "concept" || (config && config.shape === "rectangle")) {
      node.concept_fields = {
        originator_id: String(dn.properties.originator_id ?? "unknown_author"),
        concept_type: String(dn.properties.concept_type ?? "framework"),
        abstraction_level: String(dn.properties.abstraction_level ?? "operational"),
        status: String(dn.properties.status ?? "active"),
        date_introduced: dn.properties.date_introduced ? String(dn.properties.date_introduced) : undefined,
      };
    }

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
    properties: n.properties ?? buildPropertiesFromLegacy(n),
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

/** Build properties from legacy thinker_fields/concept_fields */
function buildPropertiesFromLegacy(n: GraphNode): Record<string, string | string[] | number | undefined> {
  if (n.thinker_fields) {
    const tf = n.thinker_fields;
    let dateFrom = tf.dates ?? "";
    let dateTo = "";
    if (dateFrom.includes("–") || dateFrom.includes("-")) {
      const sep = dateFrom.includes("–") ? "–" : "-";
      const parts = dateFrom.split(sep).map((s) => s.trim());
      dateFrom = parts[0] ?? "";
      dateTo = parts[1] ?? "";
    }
    return {
      importance: tf.eminence,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      tags: tf.institutional_base,
      structural_roles: tf.structural_roles?.join(", ") || undefined,
    };
  }
  if (n.concept_fields) {
    return {
      concept_type: n.concept_fields.concept_type,
      abstraction_level: n.concept_fields.abstraction_level,
      status: n.concept_fields.status,
      originator_id: n.concept_fields.originator_id,
      date_introduced: n.concept_fields.date_introduced,
    };
  }
  return {};
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
export function getConfigNodeRadius(config: NodeTypeConfig | undefined, properties: Record<string, string | string[] | number | undefined> | undefined, _viewMode: string): number {
  if (!config || !config.size_field || !config.size_map) return 10;
  const sizeValue = properties?.[config.size_field];
  if (typeof sizeValue === "string" && config.size_map[sizeValue] != null) {
    return config.size_map[sizeValue];
  }
  return 10;
}
