import { describe, it, expect } from "vitest";
import { searchNodes } from "../utils/search";
import type { GraphNode } from "../types/graph-ir";

// ─── fixtures ────────────────────────────────────────────────────────────────

const argyris: GraphNode = {
  id: "argyris",
  node_type: "person",
  name: "Chris Argyris",
  classifiers: { generation: "2", condition: "psychology" },
  tags: ["Harvard Business School", "double-loop learning"],
  properties: {
    importance: "dominant",
    date_from: "1923",
    date_to: "2013",
    structural_roles: "intellectual_leader, chain_originator",
  },
  notes: "Key figure in organisational learning theory.",
};

const senge: GraphNode = {
  id: "senge",
  node_type: "person",
  name: "Peter Senge",
  classifiers: { generation: "3", condition: "systems" },
  tags: ["MIT Sloan", "systems thinking"],
  properties: { importance: "significant", works: "The Fifth Discipline" },
};

const cynefin: GraphNode = {
  id: "cynefin",
  node_type: "concept",
  name: "Cynefin Framework",
  classifiers: { condition: "sensemaking" },
  tags: ["complexity", "Snowden"],
  properties: { origin: "IBM Research" },
  notes: "A sense-making framework with five domains.",
};

const freeNode: GraphNode = {
  id: "free",
  node_type: "concept",
  name: "Free Agent Node",
  tags: [],
};

const nodes = [argyris, senge, cynefin, freeNode];

// ─── empty / trivial ──────────────────────────────────────────────────────────

describe("searchNodes — empty / trivial", () => {
  it("returns [] for empty query", () => {
    expect(searchNodes(nodes, "")).toEqual([]);
  });

  it("returns [] for whitespace-only query", () => {
    expect(searchNodes(nodes, "   ")).toEqual([]);
  });

  it("returns [] when nothing matches", () => {
    expect(searchNodes(nodes, "zzznomatch")).toEqual([]);
  });
});

// ─── name search ─────────────────────────────────────────────────────────────

describe("searchNodes — name field", () => {
  it("matches on exact name (case-insensitive)", () => {
    expect(searchNodes(nodes, "CHRIS argyris")).toEqual([argyris]);
  });

  it("matches on partial name", () => {
    expect(searchNodes(nodes, "argy")).toEqual([argyris]);
  });

  it("finds multiple nodes by shared name substring", () => {
    const result = searchNodes(nodes, "er"); // 'Chr*is', 'Pet*er', 'Cynefin Framework' ← 'Fram*ew*ork' no; but 'Pete*r' yes
    expect(result).toContain(senge);
    expect(result).toContain(argyris); // 'Chris' contains 'r'
  });
});

// ─── node_type search ────────────────────────────────────────────────────────

describe("searchNodes — node_type field", () => {
  it("finds all nodes of type 'concept'", () => {
    const result = searchNodes(nodes, "concept");
    expect(result).toContain(cynefin);
    expect(result).toContain(freeNode);
    expect(result).not.toContain(argyris);
  });

  it("finds all nodes of type 'person'", () => {
    const result = searchNodes(nodes, "person");
    expect(result).toContain(argyris);
    expect(result).toContain(senge);
    expect(result).not.toContain(cynefin);
  });
});

// ─── tag search ──────────────────────────────────────────────────────────────

describe("searchNodes — tags field", () => {
  it("matches a tag substring", () => {
    const result = searchNodes(nodes, "systems thinking");
    expect(result).toContain(senge);
    expect(result).not.toContain(argyris);
  });

  it("matches a partial tag", () => {
    expect(searchNodes(nodes, "Snowden")).toEqual([cynefin]);
  });

  it("matches multi-word tag with unquoted tokens (AND)", () => {
    // "Harvard" AND "Business" both in corpus via the tag
    const result = searchNodes(nodes, "Harvard Business");
    expect(result).toContain(argyris);
  });
});

// ─── classifier search ───────────────────────────────────────────────────────

describe("searchNodes — classifier values", () => {
  it("matches a classifier value", () => {
    expect(searchNodes(nodes, "psychology")).toEqual([argyris]);
  });

  it("matches across different classifiers", () => {
    const result = searchNodes(nodes, "sensemaking");
    expect(result).toContain(cynefin);
  });

  it("does not match classifier key (only values are indexed)", () => {
    // 'condition' is a key, not a value — should NOT match
    // (argyris has condition=psychology, senge has condition=systems, cynefin condition=sensemaking)
    // All three have the key 'condition', but we don't index keys
    // → if the search matched keys, all three would appear — test that 'condition' alone returns none
    const result = searchNodes(nodes, "condition");
    expect(result).toHaveLength(0);
  });
});

// ─── property search ─────────────────────────────────────────────────────────

describe("searchNodes — property values", () => {
  it("matches a string property value", () => {
    expect(searchNodes(nodes, "dominant")).toEqual([argyris]);
  });

  it("matches across nodes sharing a property value", () => {
    const result = searchNodes(nodes, "significant");
    expect(result).toContain(senge);
  });

  it("matches a property value containing spaces", () => {
    // 'The Fifth Discipline' is a property value on senge
    expect(searchNodes(nodes, "Fifth Discipline")).toEqual([senge]);
  });

  it("matches IBM Research in properties", () => {
    expect(searchNodes(nodes, "IBM")).toEqual([cynefin]);
  });
});

// ─── notes search ────────────────────────────────────────────────────────────

describe("searchNodes — notes field", () => {
  it("matches a word in notes", () => {
    expect(searchNodes(nodes, "organisational learning")).toEqual([argyris]);
  });

  it("matches a notes word alongside a tag word (AND)", () => {
    const result = searchNodes(nodes, "theory Harvard");
    expect(result).toContain(argyris);
  });

  it("matches notes on cynefin", () => {
    expect(searchNodes(nodes, "sense-making")).toEqual([cynefin]);
  });
});

// ─── exact phrase (quoted) ───────────────────────────────────────────────────

describe("searchNodes — exact phrase matching", () => {
  it("quoted phrase matches verbatim substring", () => {
    const result = searchNodes(nodes, '"double-loop learning"');
    expect(result).toEqual([argyris]);
  });

  it("quoted phrase is case-insensitive", () => {
    expect(searchNodes(nodes, '"DOUBLE-LOOP"')).toEqual([argyris]);
  });

  it("quoted phrase does not match with wrong word order", () => {
    // "learning double-loop" is not a substring of the corpus
    expect(searchNodes(nodes, '"learning double-loop"')).toHaveLength(0);
  });

  it("quoted phrase containing spaces matches exactly", () => {
    expect(searchNodes(nodes, '"Harvard Business School"')).toEqual([argyris]);
  });

  it("quoted phrase plus unquoted token — both must match (AND)", () => {
    // "double-loop" AND "theory" → only argyris
    const result = searchNodes(nodes, '"double-loop" theory');
    expect(result).toEqual([argyris]);
  });

  it("quoted phrase plus unquoted token — fails when token absent", () => {
    // "double-loop" is on argyris but "IBM" is only on cynefin
    expect(searchNodes(nodes, '"double-loop" IBM')).toHaveLength(0);
  });

  it("unmatched quote treated as fragment (no crash)", () => {
    // A single unclosed quote should not throw
    expect(() => searchNodes(nodes, '"unclosed')).not.toThrow();
  });
});

// ─── AND semantics ────────────────────────────────────────────────────────────

describe("searchNodes — multi-token AND semantics", () => {
  it("requires all tokens to be present", () => {
    // 'Senge' is only on senge; 'psychology' is only on argyris → no match
    expect(searchNodes(nodes, "senge psychology")).toHaveLength(0);
  });

  it("matches when all tokens are present on the same node", () => {
    // argyris has both 'Harvard' (tag) and 'psychology' (classifier)
    expect(searchNodes(nodes, "Harvard psychology")).toEqual([argyris]);
  });
});

// ─── limit ───────────────────────────────────────────────────────────────────

describe("searchNodes — result limit", () => {
  it("respects a custom limit", () => {
    // 'person' matches argyris and senge (2 nodes); limit 1 → only first
    const result = searchNodes(nodes, "person", 1);
    expect(result).toHaveLength(1);
  });

  it("returns up to 20 by default when many nodes match", () => {
    const many: GraphNode[] = Array.from({ length: 30 }, (_, i) => ({
      id: `node-${i}`,
      node_type: "concept",
      name: `Concept ${i}`,
    }));
    const result = searchNodes(many, "concept");
    expect(result).toHaveLength(20);
  });

  it("returns fewer than limit when matches are scarce", () => {
    expect(searchNodes(nodes, "dominant")).toHaveLength(1);
  });
});

// ─── nodes with missing optional fields ───────────────────────────────────────

describe("searchNodes — sparse nodes", () => {
  it("does not throw for a node with no optional fields", () => {
    const bare: GraphNode = { id: "bare", node_type: "concept", name: "Bare Node" };
    expect(() => searchNodes([bare], "bare")).not.toThrow();
    expect(searchNodes([bare], "bare")).toEqual([bare]);
  });

  it("searches name when tags/classifiers/properties/notes absent", () => {
    expect(searchNodes([freeNode], "free agent")).toEqual([freeNode]);
  });

  it("handles nodes with undefined property values", () => {
    const n: GraphNode = {
      id: "n1",
      node_type: "concept",
      name: "Test",
      properties: { x: undefined, y: "hello" },
    };
    expect(() => searchNodes([n], "hello")).not.toThrow();
    expect(searchNodes([n], "hello")).toEqual([n]);
  });
});
