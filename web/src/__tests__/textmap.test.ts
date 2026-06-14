import { describe, it, expect } from "vitest";
import type { GraphIR, GraphNode, GraphEdge, EdgeTypeConfig } from "../types/graph-ir";
import {
  indexNodes,
  connectionsOf,
  groupConnections,
  findRoots,
  groupByNodeType,
  revisitKind,
} from "../views/textmap";
import type { NodeTypeConfig } from "../types/graph-ir";

function node(id: string, name = id): GraphNode {
  return { id, node_type: "concept", name };
}

function edge(from: string, to: string, edge_type = "rel", directed = true): GraphEdge {
  return { from, to, edge_type, directed, weight: 1, visual: { style: "solid", show_arrow: directed } };
}

function graph(nodes: GraphNode[], edges: GraphEdge[]): GraphIR {
  return { version: "2", metadata: { notes: [] }, nodes, edges };
}

describe("connectionsOf", () => {
  const nodes = [node("a"), node("b"), node("c")];
  const byId = indexNodes(nodes);

  it("reports a directed edge as out from the source and in from the target", () => {
    const edges = [edge("a", "b", "originates", true)];
    const fromA = connectionsOf("a", edges, byId);
    expect(fromA).toHaveLength(1);
    expect(fromA[0]).toMatchObject({ direction: "out", node: { id: "b" } });

    const fromB = connectionsOf("b", edges, byId);
    expect(fromB).toHaveLength(1);
    expect(fromB[0]).toMatchObject({ direction: "in", node: { id: "a" } });
  });

  it("reports an undirected edge as undirected from either side", () => {
    const edges = [edge("a", "c", "allies", false)];
    expect(connectionsOf("a", edges, byId)[0].direction).toBe("undirected");
    expect(connectionsOf("c", edges, byId)[0].direction).toBe("undirected");
  });

  it("skips edges whose other endpoint is missing", () => {
    const edges = [edge("a", "zzz", "rel", true)];
    expect(connectionsOf("a", edges, byId)).toHaveLength(0);
  });
});

describe("groupConnections", () => {
  const nodes = [node("a"), node("b", "Beta"), node("c", "Alpha"), node("d")];
  const byId = indexNodes(nodes);
  const cfgs: EdgeTypeConfig[] = [{ id: "originates", label: "Originates", directed: true }];

  it("labels groups with direction arrows and uses the edge-type config label", () => {
    const conns = connectionsOf("a", [edge("a", "b", "originates", true)], byId);
    const groups = groupConnections(conns, cfgs);
    expect(groups[0].label).toBe("Originates →");
  });

  it("falls back to the raw edge_type when no config is given", () => {
    const conns = connectionsOf("a", [edge("a", "b", "custom", true)], byId);
    expect(groupConnections(conns)[0].label).toBe("custom →");
  });

  it("orders groups out → undirected → in and sorts members by name", () => {
    const edges = [
      edge("a", "b", "originates", true), // out, b="Beta"
      edge("a", "c", "originates", true), // out, c="Alpha"
      edge("d", "a", "feeds", true), // in
      edge("a", "d", "allies", false), // undirected
    ];
    const groups = groupConnections(connectionsOf("a", edges, byId));
    expect(groups.map((g) => g.direction)).toEqual(["out", "undirected", "in"]);
    // members within the outgoing group sorted by name: Alpha (c) before Beta (b)
    expect(groups[0].connections.map((c) => c.node.id)).toEqual(["c", "b"]);
  });
});

describe("findRoots", () => {
  it("returns nodes with no incoming directed edge", () => {
    const g = graph([node("a"), node("b"), node("c")], [edge("a", "b"), edge("b", "c")]);
    expect(findRoots(g).map((n) => n.id)).toEqual(["a"]);
  });

  it("returns all nodes when the graph is fully cyclic", () => {
    const g = graph([node("a"), node("b")], [edge("a", "b"), edge("b", "a")]);
    expect(findRoots(g).map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("returns all nodes for a purely undirected graph", () => {
    const g = graph([node("b", "B"), node("a", "A")], [edge("a", "b", "rel", false)]);
    expect(findRoots(g).map((n) => n.id)).toEqual(["a", "b"]); // sorted by name
  });
});

describe("groupByNodeType", () => {
  const cfg = (id: string, label: string, icon?: string): NodeTypeConfig => ({
    id,
    label,
    icon,
    shape: "circle",
    fields: [],
  });

  function typedNode(id: string, node_type: string, name = id): GraphNode {
    return { id, node_type, name };
  }

  it("groups nodes by type and sorts alphabetically within each group", () => {
    const nodes = [
      typedNode("b1", "book", "Zotero"),
      typedNode("p1", "person", "Argyris"),
      typedNode("b2", "book", "Aesthetics"),
      typedNode("p2", "person", "Senge"),
    ];
    const groups = groupByNodeType(nodes);
    // No config → sorted by typeId: "book" before "person"
    expect(groups.map((g) => g.typeId)).toEqual(["book", "person"]);
    expect(groups[0].nodes.map((n) => n.name)).toEqual(["Aesthetics", "Zotero"]);
    expect(groups[1].nodes.map((n) => n.name)).toEqual(["Argyris", "Senge"]);
  });

  it("follows template order when nodeTypeConfigs supplied", () => {
    const nodes = [
      typedNode("c1", "concept", "C"),
      typedNode("t1", "thinker", "T"),
    ];
    const cfgs = [cfg("thinker", "Thinker", "T"), cfg("concept", "Concept", "C")];
    const groups = groupByNodeType(nodes, cfgs);
    expect(groups.map((g) => g.typeId)).toEqual(["thinker", "concept"]);
    expect(groups[0].label).toBe("Thinker");
    expect(groups[1].label).toBe("Concept");
  });

  it("uses cfg.icon when available, falls back to cfg.label[0]", () => {
    const nodes = [typedNode("x", "thing", "X")];
    const groups = groupByNodeType(nodes, [cfg("thing", "Thing")]);
    expect(groups[0].icon).toBe("T"); // label[0] fallback
    const groups2 = groupByNodeType(nodes, [cfg("thing", "Thing", "🔷")]);
    expect(groups2[0].icon).toBe("🔷");
  });

  it("places types not in the template at the end, sorted by id", () => {
    const nodes = [typedNode("z", "zebra", "Z"), typedNode("a", "apple", "A")];
    const cfgs = [cfg("other", "Other")]; // neither node matches
    const groups = groupByNodeType(nodes, cfgs);
    // "other" has no nodes so it's skipped; apple and zebra are unknown, sorted
    expect(groups.map((g) => g.typeId)).toEqual(["apple", "zebra"]);
  });

  it("returns an empty array for an empty node list", () => {
    expect(groupByNodeType([])).toEqual([]);
  });
});

describe("revisitKind", () => {
  it("flags an ancestor as a loop", () => {
    expect(revisitKind("a", new Set(["a", "b"]), new Set())).toBe("ancestor");
  });
  it("flags a previously rendered non-ancestor as a cross-link", () => {
    expect(revisitKind("x", new Set(["a"]), new Set(["x"]))).toBe("cross");
  });
  it("reports none for a first appearance", () => {
    expect(revisitKind("z", new Set(["a"]), new Set(["x"]))).toBe("none");
  });
});
