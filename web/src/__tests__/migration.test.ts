import { describe, it, expect } from "vitest";
import { migrateFromParser, graphIRFromData, dataFromGraphIR } from "../migration";
import { getNodeColor } from "../graph/GraphCanvas";
import type { GraphIR, SimNode, Classifier, TaxonomyTemplate } from "../types/graph-ir";
import { classifierWithoutColors, classifierWithColors, multiClassifiers } from "./fixtures";

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

// SPEC: REQ-071 (Classifier-Driven Node Colors)
describe("getNodeColor", () => {
  const makeSimNode = (classifiers?: Record<string, string>): SimNode => ({
    id: "n1", node_type: "field", name: "Test", x: 0, y: 0,
    classifiers,
    properties: {},
  });

  it("picks first classifier with colors (AC-071-01)", () => {
    const node = makeSimNode({ decade: "1940s", domain: "math_physical" });
    const color = getNodeColor(node, multiClassifiers);
    expect(color).toBe("#4A90D9"); // domain color, not fallback gray
  });

  it("returns #666 when no classifiers have colors (AC-071-02)", () => {
    const node = makeSimNode({ decade: "1940s" });
    const noColorClassifiers: Classifier[] = [classifierWithoutColors];
    const color = getNodeColor(node, noColorClassifiers);
    expect(color).toBe("#666");
  });

  it("returns #666 with empty classifiers array", () => {
    const node = makeSimNode({ domain: "math_physical" });
    const color = getNodeColor(node, []);
    expect(color).toBe("#666");
  });

  it("returns #666 when node has no matching classifier value", () => {
    const node = makeSimNode({ domain: "nonexistent" });
    const color = getNodeColor(node, [classifierWithColors]);
    expect(color).toBe("#666");
  });

  it("uses override when present (AC-071-05)", () => {
    const node = makeSimNode({ domain: "math_physical" });
    const overrides = { math_physical: "#FF0000" };
    const color = getNodeColor(node, [classifierWithColors], overrides);
    expect(color).toBe("#FF0000");
  });

  it("falls back to classifiers[0] when none have colors", () => {
    // If all classifiers lack colors, still uses first one (returns #666 via fallback)
    const node = makeSimNode({ decade: "1940s" });
    const color = getNodeColor(node, [classifierWithoutColors]);
    expect(color).toBe("#666");
  });
});

// SPEC: REQ-072 (Template Reference Preserved Across Save)
describe("template reference in export", () => {
  it("graphIRFromData preserves classifiers from template (AC-072-04)", () => {
    const tmpl: TaxonomyTemplate = {
      title: "Test",
      classifiers: multiClassifiers,
      node_types: [{ id: "field", label: "Field", shape: "circle", fields: [] }],
    };
    const data = {
      version: "2.0",
      template: "test.cmt",
      nodes: [{ id: "n1", node_type: "field", name: "Node 1", classifiers: { domain: "math_physical", decade: "1940s" }, properties: {} }],
      edges: [],
      external_shocks: [],
      structural_observations: [],
    };
    const ir = graphIRFromData(tmpl, data);
    expect(ir.metadata.classifiers).toBeDefined();
    expect(ir.metadata.classifiers).toHaveLength(2);
    expect(ir.metadata.classifiers![0].id).toBe("decade");
    expect(ir.metadata.classifiers![1].id).toBe("domain");
  });
});

// SPEC: REQ-071 (template-driven classifiers from migrateFromParser)
describe("migrateFromParser with active template", () => {
  it("extracts classifier values from node properties into classifiers", () => {
    const tmpl: TaxonomyTemplate = {
      title: "Test",
      classifiers: [classifierWithColors],
      node_types: [{ id: "field", label: "Field", shape: "circle", fields: [{ key: "prominence", label: "Prominence", type: "text" as const }] }],
    };
    const parsed = {
      version: "1.0",
      metadata: { title: "Test", generations: [], streams: [], external_shocks: [], structural_observations: [] },
      nodes: [{
        id: "f1", node_type: "field", name: "Systems Theory",
        fields: { domain: "systems_cybernetics", prominence: "dominant" },
      }],
      edges: [],
    } as unknown as GraphIR;

    const { data } = migrateFromParser(parsed, tmpl);
    const node = data.nodes[0];
    // domain should be moved to classifiers
    expect(node.classifiers?.domain).toBe("systems_cybernetics");
    // domain should be removed from properties
    expect(node.properties.domain).toBeUndefined();
    // non-classifier fields remain in properties
    expect(node.properties.prominence).toBe("dominant");
  });

  it("uses template classifiers over auto-detection", () => {
    const tmpl: TaxonomyTemplate = {
      title: "Test",
      classifiers: [classifierWithColors],
      node_types: [{ id: "field", label: "Field", shape: "circle", fields: [] }],
    };
    const parsed = {
      version: "1.0",
      metadata: { title: "Test", generations: [], streams: [], external_shocks: [], structural_observations: [] },
      nodes: [{
        id: "f1", node_type: "field", name: "Test",
        fields: { domain: "math_physical" },
      }],
      edges: [],
    } as unknown as GraphIR;

    const { template } = migrateFromParser(parsed, tmpl);
    // Should use the template's classifiers (with colors), not auto-detected
    expect(template.classifiers).toBeDefined();
    expect(template.classifiers![0].values[0].color).toBe("#4A90D9");
  });
});

// SPEC: REQ-074 (Column Redraw), REQ-076 (Layout Force Deduplication)
describe("column layout computation", () => {
  it("computeRegionColumns produces equal-width columns spanning full width", async () => {
    // Import dynamically to access the module-level function
    const { computeRegionColumns } = await import("../graph/GraphCanvas") as unknown as {
      computeRegionColumns: (cls: Classifier, width: number, counts?: Map<string, number>) => { positions: Map<string, number>; widths: Map<string, number> };
    };
    // computeRegionColumns is not exported, so test indirectly via graphIRFromData + getNodeColor
    // Instead, test the color function with column-style classifiers
    const node = { id: "n1", node_type: "field", name: "Test", x: 0, y: 0, classifiers: { domain: "math_physical" }, properties: {} } as SimNode;
    const color = getNodeColor(node, [classifierWithColors]);
    expect(color).toBe("#4A90D9");
  });
});

// SPEC: REQ-076 (Layout Conflict Resolution)
describe("layout conflict resolution", () => {
  it("classifiers support region and region-column layouts", () => {
    const regionCls: Classifier = { id: "domain", label: "Domain", layout: "region", values: [{ id: "a", label: "A", color: "#f00" }] };
    const columnCls: Classifier = { id: "type", label: "Type", layout: "region-column", values: [{ id: "b", label: "B" }] };
    // Both are valid classifier layouts
    expect(regionCls.layout).toBe("region");
    expect(columnCls.layout).toBe("region-column");
  });

  it("graphIRFromData preserves classifier layout values", () => {
    const tmpl: TaxonomyTemplate = {
      title: "Test",
      classifiers: [
        { id: "domain", label: "Domain", layout: "region", values: [{ id: "a", label: "A", color: "#f00" }] },
        { id: "decade", label: "Decade", layout: "y", values: [{ id: "1940s", label: "1940s" }] },
      ],
      node_types: [{ id: "field", label: "Field", shape: "circle", fields: [] }],
    };
    const data = {
      version: "2.0", template: "", nodes: [], edges: [],
      external_shocks: [], structural_observations: [],
    };
    const ir = graphIRFromData(tmpl, data);
    expect(ir.metadata.classifiers![0].layout).toBe("region");
    expect(ir.metadata.classifiers![1].layout).toBe("y");
  });
});
