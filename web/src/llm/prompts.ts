import type { TaxonomyTemplate, ConceptMapData } from "../types/graph-ir";

/**
 * System prompt instructing the LLM to map free text to a taxonomy.
 * Produces ConceptMapData JSON matching the taxonomy's node_types, streams, and horizons.
 */
export function buildMappingSystemPrompt(taxonomy: TaxonomyTemplate): string {
  const nodeTypes = taxonomy.node_types.map((nt) => {
    const fields = nt.fields.map((f) => `    - ${f.key} (${f.label})`).join("\n");
    return `  - ${nt.id} (${nt.label}, shape: ${nt.shape})\n${fields}`;
  }).join("\n");

  const streams = taxonomy.streams.map((s) =>
    `  - ${s.id}: ${s.name}${s.description ? ` — ${s.description}` : ""}`
  ).join("\n");

  const horizons = taxonomy.generations.map((g) =>
    `  - horizon ${g.number}: ${g.label ?? ""} (${g.period ?? ""})`
  ).join("\n");

  return `You are a knowledge mapping assistant. Your task is to analyze text and produce a structured concept map as JSON.

The taxonomy defines these node types:
${nodeTypes}

Available streams (categories):
${streams}

Horizons (time periods):
${horizons}

Output a JSON object matching this schema:
{
  "version": "2.0",
  "template": "${taxonomy.title}",
  "nodes": [
    {
      "id": "snake_case_id",
      "node_type": "<one of the node type ids>",
      "name": "Display Name",
      "generation": <horizon number>,
      "stream": "<stream id>",
      "properties": { <key-value pairs matching the node type's fields> }
    }
  ],
  "edges": [
    {
      "from": "<node id>",
      "to": "<node id>",
      "edge_type": "<relationship type>",
      "directed": true,
      "weight": 1.0
    }
  ],
  "external_shocks": [],
  "structural_observations": ["<key insight about the network>"]
}

Rules:
- Generate IDs as snake_case (lowercase, underscores)
- Assign each node to the most appropriate stream and horizon
- Create edges to capture relationships mentioned or implied in the text
- Include properties that match the node type's field definitions
- Output ONLY the JSON object, no other text`;
}

/**
 * User prompt wrapping the source text for mapping.
 */
export function buildMappingUserPrompt(sourceText: string): string {
  return `Analyze the following text and produce a concept map JSON:

---
${sourceText}
---

Extract all key entities, concepts, and their relationships. Map each to the appropriate node type, stream, and horizon.`;
}

/**
 * System prompt for chat with .cm context.
 */
export function buildChatSystemPrompt(cmData: ConceptMapData, taxonomy: TaxonomyTemplate): string {
  const nodeCount = cmData.nodes.length;
  const edgeCount = cmData.edges.length;

  const nodesSummary = cmData.nodes.map((n) => {
    const props = n.properties ? Object.entries(n.properties)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") : "";
    return `  - ${n.name} (${n.node_type}, stream: ${n.stream ?? "?"})${props ? ` [${props}]` : ""}`;
  }).join("\n");

  const edgesSummary = cmData.edges.slice(0, 50).map((e) =>
    `  - ${e.from} → ${e.to} (${e.edge_type})${e.note ? `: ${e.note}` : ""}`
  ).join("\n");

  return `You are an expert assistant helping a user explore and refine their concept map.

The concept map "${taxonomy.title}" contains ${nodeCount} nodes and ${edgeCount} edges.

Nodes:
${nodesSummary}

Relationships:
${edgesSummary}

When the user asks questions:
- Reference specific nodes and relationships from the map
- Suggest additions, refinements, or reorganization when appropriate
- If suggesting changes to the map, format them clearly so the user can apply them
- Be conversational and helpful`;
}
