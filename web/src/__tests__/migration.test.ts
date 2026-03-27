import { describe, it, expect } from "vitest";
import { migrateFromParser, graphIRFromData, dataFromGraphIR } from "../migration";
import type { GraphIR } from "../types/graph-ir";

// Simulates raw WASM parser output which uses `fields` (Rust convention)
const minimalParsed = {
  version: "1.0",
  metadata: {
    title: "Test",
    generations: [{ number: 1, period: "2020-2025" }],
    streams: [{ id: "main", name: "Main", color: "#4A90D9" }],
    external_shocks: [],
    structural_observations: [],
  },
  nodes: [
    {
      id: "t1", node_type: "thinker", name: "Thinker One", generation: 1, stream: "main",
      fields: {
        dates: "1960-2020", eminence: "major", structural_roles: "leader",
        institutional_base: "MIT",
      },
    },
    {
      id: "c1", node_type: "concept", name: "Concept One", generation: 1, stream: "main",
      fields: {
        originator_id: "t1", concept_type: "framework",
        abstraction_level: "theoretical", status: "active",
      },
    },
  ],
  edges: [
    {
      from: "t1", to: "c1", edge_type: "originates",
      directed: true, weight: 1.0, visual: { style: "solid", show_arrow: true },
    },
  ],
} as unknown as GraphIR;

describe("migrateFromParser", () => {
  it("maps thinker node with fields as properties", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    const thinker = data.nodes.find((n) => n.id === "t1");
    expect(thinker).toBeDefined();
    expect(thinker!.node_type).toBe("thinker");
    expect(thinker!.properties.eminence).toBe("major");
    expect(thinker!.properties.dates).toBe("1960-2020");
    expect(template.node_types.find((t) => t.id === "thinker")).toBeDefined();
  });

  it("maps concept node with fields as properties", () => {
    const { data } = migrateFromParser(minimalParsed);
    const concept = data.nodes.find((n) => n.id === "c1");
    expect(concept!.node_type).toBe("concept");
    expect(concept!.properties.concept_type).toBe("framework");
  });

  it("handles generic node types via fields", () => {
    const withGeneric = {
      ...minimalParsed,
      nodes: [
        ...(minimalParsed as unknown as { nodes: unknown[] }).nodes,
        {
          id: "inst1", node_type: "institution", name: "MIT",
          generation: 1, stream: "main",
          fields: { founded: "1861", location: "Cambridge, MA" },
        },
      ],
    } as unknown as GraphIR;
    const { template, data } = migrateFromParser(withGeneric);
    const inst = data.nodes.find((n) => n.id === "inst1");
    expect(inst).toBeDefined();
    expect(inst!.node_type).toBe("institution");
    expect(inst!.properties.founded).toBe("1861");
    expect(inst!.properties.location).toBe("Cambridge, MA");
    expect(template.node_types.find((t) => t.id === "institution")).toBeDefined();
  });

  it("preserves edges through migration", () => {
    const { data } = migrateFromParser(minimalParsed);
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0].edge_type).toBe("originates");
  });
});

describe("graphIRFromData round-trip", () => {
  it("round-trips thinker node properties", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    const ir = graphIRFromData(template, data);
    const thinker = ir.nodes.find((n) => n.id === "t1");
    expect(thinker!.properties?.eminence).toBe("major");
  });

  it("round-trips concept node properties", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    const ir = graphIRFromData(template, data);
    const concept = ir.nodes.find((n) => n.id === "c1");
    expect(concept!.properties?.concept_type).toBe("framework");
  });
});

describe("dataFromGraphIR", () => {
  it("extracts data with version 2.0", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    const ir = graphIRFromData(template, data);
    const extracted = dataFromGraphIR(ir);
    expect(extracted.version).toBe("2.0");
    expect(extracted.nodes).toHaveLength(2);
    expect(extracted.edges).toHaveLength(1);
  });

  it("includes edge_types from template in saved data", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    // Add edge_types to template
    template.edge_types = [
      { id: "chain", label: "Chain", color: "#888", directed: true, style: "solid" },
      { id: "rivalry", label: "Rivalry", color: "#D94", directed: false, style: "dashed" },
    ];
    const ir = graphIRFromData(template, data);
    const extracted = dataFromGraphIR(ir);
    expect(extracted.edge_types).toBeDefined();
    expect(extracted.edge_types).toHaveLength(2);
    expect(extracted.edge_types![0].id).toBe("chain");
    expect(extracted.edge_types![1].directed).toBe(false);
  });

  it("omits edge_types when template has none", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    // Ensure no edge_types
    delete template.edge_types;
    const ir = graphIRFromData(template, data);
    const extracted = dataFromGraphIR(ir);
    expect(extracted.edge_types).toBeUndefined();
  });

  it("preserves node notes through round-trip", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    // Add notes to a node
    data.nodes[0].notes = "Important research notes";
    const ir = graphIRFromData(template, data);
    expect(ir.nodes[0].notes).toBe("Important research notes");
    const extracted = dataFromGraphIR(ir);
    expect(extracted.nodes[0].notes).toBe("Important research notes");
  });

  it("preserves edge weight through round-trip", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    // Modify edge weight
    data.edges[0].weight = 2.5;
    const ir = graphIRFromData(template, data);
    expect(ir.edges[0].weight).toBe(2.5);
    const extracted = dataFromGraphIR(ir);
    expect(extracted.edges[0].weight).toBe(2.5);
  });

  it("preserves edge note through round-trip", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    data.edges[0].note = "Strong influence relationship";
    const ir = graphIRFromData(template, data);
    expect(ir.edges[0].note).toBe("Strong influence relationship");
    const extracted = dataFromGraphIR(ir);
    expect(extracted.edges[0].note).toBe("Strong influence relationship");
  });
});

describe("generic node model", () => {
  it("IR has no thinker_fields, concept_fields, or edge_category", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    const ir = graphIRFromData(template, data);
    const json = JSON.stringify(ir);
    expect(json).not.toContain("thinker_fields");
    expect(json).not.toContain("concept_fields");
    expect(json).not.toContain("edge_category");
  });

  it("all node types use properties uniformly", () => {
    const { data } = migrateFromParser(minimalParsed);
    for (const node of data.nodes) {
      expect(node.properties).toBeDefined();
      expect(typeof node.node_type).toBe("string");
    }
  });

  it("auto-derives node type configs from data", () => {
    const { template } = migrateFromParser(minimalParsed);
    const thinkerConfig = template.node_types.find((t) => t.id === "thinker");
    expect(thinkerConfig).toBeDefined();
    expect(thinkerConfig!.fields.length).toBeGreaterThan(0);
    const conceptConfig = template.node_types.find((t) => t.id === "concept");
    expect(conceptConfig).toBeDefined();
    expect(conceptConfig!.fields.length).toBeGreaterThan(0);
  });
});

describe("classifier conversion", () => {
  it("migrateFromParser populates classifiers on nodes", () => {
    const { data } = migrateFromParser(minimalParsed);
    const thinker = data.nodes.find((n) => n.id === "t1");
    expect(thinker?.classifiers).toBeDefined();
    // stream "main" → x-axis classifier value
    expect(Object.values(thinker!.classifiers!)).toContain("main");
  });

  it("migrateFromParser produces classifiers on data", () => {
    const { data } = migrateFromParser(minimalParsed);
    expect(data.classifiers).toBeDefined();
    expect(data.classifiers!.length).toBeGreaterThan(0);
  });

  it("graphIRFromData populates classifiers in metadata", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    const ir = graphIRFromData(template, data);
    expect(ir.metadata.classifiers).toBeDefined();
    expect(ir.metadata.classifiers!.length).toBeGreaterThan(0);
  });

  it("graphIRFromData populates classifiers on nodes from legacy stream/generation", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    const ir = graphIRFromData(template, data);
    const thinker = ir.nodes.find((n) => n.id === "t1");
    expect(thinker?.classifiers).toBeDefined();
  });

  it("dataFromGraphIR preserves tags and classifiers", () => {
    const { template, data } = migrateFromParser(minimalParsed);
    const ir = graphIRFromData(template, data);
    // Add tags to a node
    ir.nodes[0].tags = ["test-tag", "research"];
    const extracted = dataFromGraphIR(ir);
    expect(extracted.nodes[0].tags).toEqual(["test-tag", "research"]);
    expect(extracted.nodes[0].classifiers).toBeDefined();
    expect(extracted.classifiers).toBeDefined();
  });
});
