import type {
  GraphIR, GraphNode,
  TaxonomyTemplate, ConceptMapData, DataNode,
  NodeTypeConfig, FieldConfig,
  Classifier, Stream, Generation,
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

/** Convert legacy Stream[] to a Classifier with layout "x" */
export function streamsToClassifier(streams: Stream[], label?: string): Classifier {
  return {
    id: label?.toLowerCase().replace(/\s+/g, "_") ?? "stream",
    label: label ?? "Streams",
    layout: "x",
    values: streams.map((s) => ({
      id: s.id,
      label: s.name,
      color: s.color,
      description: s.description,
    })),
  };
}

/** Convert legacy Generation[] to a Classifier with layout "y" */
export function generationsToClassifier(generations: Generation[], label?: string): Classifier {
  return {
    id: label?.toLowerCase().replace(/\s+/g, "_") ?? "generation",
    label: label ?? "Generations",
    layout: "y",
    values: generations.map((g) => ({
      id: String(g.number),
      label: g.label ?? `${g.number}`,
      description: g.period,
    })),
  };
}

/** Build classifiers from a template, using classifiers if present or converting legacy streams/gens */
export function getTemplateClassifiers(template: TaxonomyTemplate): Classifier[] {
  if (template.classifiers && template.classifiers.length > 0) return template.classifiers;
  const result: Classifier[] = [];
  if (template.streams && template.streams.length > 0) {
    result.push(streamsToClassifier(template.streams, template.stream_label));
  }
  if (template.generations && template.generations.length > 0) {
    result.push(generationsToClassifier(template.generations, template.generation_label));
  }
  return result;
}

/** Populate node.classifiers from legacy stream/generation fields.
 *  Maps stream → any classifier whose values contain the stream ID,
 *  and generation → any classifier whose values contain the generation number.
 *  This works regardless of classifier layout (x, y, region, etc). */
function populateNodeClassifiers(node: GraphNode, classifiers: Classifier[]): void {
  if (node.classifiers && Object.keys(node.classifiers).length > 0) return;
  const cls: Record<string, string> = {};
  for (const c of classifiers) {
    // Try to match stream to a classifier by value IDs
    if (node.stream && !cls[c.id]) {
      const match = c.values.find((v) => v.id === node.stream);
      if (match) cls[c.id] = node.stream;
    }
    // Try to match generation to a classifier by value IDs
    if (node.generation != null && !cls[c.id]) {
      const genStr = String(node.generation);
      const match = c.values.find((v) => v.id === genStr);
      if (match) cls[c.id] = genStr;
    }
  }
  if (Object.keys(cls).length > 0) node.classifiers = cls;
}

/**
 * Migrate a parsed GraphIR (from the WASM markdown parser) into template + data.
 * Maps "thinker" → "person" with renamed fields.
 */
export function migrateFromParser(parsed: GraphIR, activeTemplate?: TaxonomyTemplate | null): { template: TaxonomyTemplate; data: ConceptMapData } {
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

  // If an active template is loaded, prefer its node_types, edge_types, and classifiers
  // (these carry shape, size_map, layout, color info that can't be derived from data)
  const mergedNodeTypes = activeTemplate?.node_types ?? (nodeTypes.length > 0 ? nodeTypes : DEFAULT_NODE_TYPES);
  const mergedEdgeTypes = activeTemplate?.edge_types;

  // Palette for auto-detected classifier values
  const DEFAULT_COLORS = ["#4A90D9", "#50C878", "#FF7F50", "#9B59B6", "#F1C40F", "#E74C3C", "#1ABC9C", "#E67E22"];

  // Auto-detect classifiers from node data if no template provides them.
  // A field is a classifier candidate if it:
  //   - appears across multiple node types (cross-cutting, not type-specific)
  //   - appears on ≥50% of nodes
  //   - has ≤20 distinct values
  let detectedClassifiers: Classifier[] | undefined;
  if (!activeTemplate?.classifiers && rawNodes.length > 0) {
    const fieldCounts = new Map<string, Map<string, number>>();
    const fieldNodeTypes = new Map<string, Set<string>>(); // track which node types use each field
    const reservedKeys = new Set(["id", "name", "notes", "tags", "generation", "stream"]);
    for (const n of rawNodes) {
      if (!n.fields) continue;
      for (const [k, v] of Object.entries(n.fields)) {
        if (reservedKeys.has(k)) continue;
        if (!fieldCounts.has(k)) fieldCounts.set(k, new Map());
        const vals = fieldCounts.get(k)!;
        vals.set(v, (vals.get(v) ?? 0) + 1);
        if (!fieldNodeTypes.has(k)) fieldNodeTypes.set(k, new Set());
        fieldNodeTypes.get(k)!.add(n.node_type);
      }
    }
    const nodeTypeCount = new Set(rawNodes.map((n) => n.node_type)).size;
    const candidates: Classifier[] = [];
    for (const [key, vals] of fieldCounts) {
      const nodeCount = [...vals.values()].reduce((a, b) => a + b, 0);
      const typeCount = fieldNodeTypes.get(key)?.size ?? 0;
      // Only promote cross-cutting fields (appear in multiple node types, or all nodes have one type)
      const isCrossCutting = typeCount > 1 || nodeTypeCount <= 1;
      if (vals.size <= 20 && nodeCount >= rawNodes.length * 0.5 && isCrossCutting) {
        const colors = DEFAULT_COLORS;
        candidates.push({
          id: key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          values: [...vals.keys()].map((v, i) => ({
            id: v,
            label: v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " "),
            color: colors[i % colors.length],
          })),
        });
      }
    }
    if (candidates.length > 0) detectedClassifiers = candidates;
  }

  const effectiveClassifiers = activeTemplate?.classifiers ?? detectedClassifiers;

  const template: TaxonomyTemplate = {
    title: parsed.metadata.title ?? activeTemplate?.title ?? "Untitled",
    description: parsed.metadata.structural_observations[0] ?? activeTemplate?.description ?? undefined,
    classifiers: effectiveClassifiers,
    streams: parsed.metadata.streams,
    generations: parsed.metadata.generations,
    node_types: mergedNodeTypes,
    edge_types: mergedEdgeTypes,
  };

  const classifiers = effectiveClassifiers ?? getTemplateClassifiers(template);

  const nodes: DataNode[] = rawNodes.map((n) => ({
    id: n.id,
    node_type: n.node_type,
    name: n.name,
    generation: n.generation,
    stream: n.stream,
    tags: n.tags,
    properties: { ...(n.fields ?? {}) },
    notes: n.notes,
  }));

  // Populate classifiers on nodes from fields or legacy stream/generation
  for (const node of nodes) {
    const gn = node as unknown as GraphNode;
    // Extract classifier values from node properties (works with both template and auto-detected classifiers)
    if (effectiveClassifiers) {
      if (!gn.classifiers) gn.classifiers = {};
      for (const cls of effectiveClassifiers) {
        const val = (node.properties as Record<string, string>)[cls.id];
        if (val) {
          gn.classifiers[cls.id] = val;
          // Remove from properties since it's now a classifier
          delete (node.properties as Record<string, string>)[cls.id];
        }
      }
    }
    populateNodeClassifiers(gn, classifiers);
    node.classifiers = gn.classifiers;
  }

  const data: ConceptMapData = {
    version: "2.0",
    template: "",
    classifiers,
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
      tags: dn.tags,
      classifiers: dn.classifiers,
      properties: { ...dn.properties },
      notes: dn.notes,
    };

    return node;
  });

  const classifiers = getTemplateClassifiers(template);
  for (const node of nodes) populateNodeClassifiers(node, classifiers);

  return {
    version: data.version,
    metadata: {
      title: template.title,
      classifiers,
      streams: template.streams ?? [],
      generations: template.generations ?? [],
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
    tags: n.tags,
    classifiers: n.classifiers,
    properties: n.properties ?? {},
    notes: n.notes,
  }));

  return {
    version: "2.0",
    template: templateRef,
    title: graphIR.metadata.title,
    classifiers: graphIR.metadata.classifiers,
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
