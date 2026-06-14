import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TextmapView } from "../views/TextmapView";
import type { GraphIR, GraphNode, GraphEdge } from "../types/graph-ir";

const node = (id: string, name = id): GraphNode => ({ id, node_type: "concept", name });
const edge = (from: string, to: string, edge_type = "rel", directed = true): GraphEdge => ({
  from,
  to,
  edge_type,
  directed,
  weight: 1,
  visual: { style: "solid", show_arrow: directed },
});
const graph = (nodes: GraphNode[], edges: GraphEdge[]): GraphIR => ({
  version: "2",
  metadata: { notes: [] },
  nodes,
  edges,
});

describe("TextmapView", () => {
  it("groups nodes by type, shows all nodes by default, and expands connections", () => {
    const g = graph(
      [node("a", "Alpha"), node("b", "Beta"), node("c", "Gamma")],
      [edge("a", "b"), edge("a", "c")],
    );
    const onSelect = vi.fn();
    render(<TextmapView data={g} selectedNodeId={null} onSelectNode={onSelect} />);

    // All nodes are visible in the type group (groups start expanded).
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();

    // Expand Alpha's connections by clicking the disclosure in its row.
    const alphaRow = screen.getByText("Alpha").closest(".textmap-row") as HTMLElement;
    fireEvent.click(within(alphaRow).getByLabelText("Expand"));

    // Beta now appears twice: once in the type group and once under Alpha's connections.
    expect(screen.getAllByText("Beta").length).toBeGreaterThanOrEqual(2);

    // Selecting any Beta calls the handler.
    fireEvent.click(screen.getAllByText("Beta")[0]);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
  });

  it("re-roots and records a breadcrumb when focusing a node", () => {
    const g = graph([node("a", "Alpha"), node("b", "Beta")], [edge("a", "b")]);
    render(<TextmapView data={g} selectedNodeId={null} onSelectNode={() => {}} />);

    fireEvent.click(screen.getByLabelText("Focus on Alpha"));
    expect(screen.getByText("All")).toBeInTheDocument();
    // Alpha now appears both as a breadcrumb crumb and as the focused row.
    expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(2);
  });

  it("edits a node's notes inline and persists via onNodeUpdate (debounced)", () => {
    vi.useFakeTimers();
    try {
      const g = graph([node("a", "Alpha")], []);
      const onUpdate = vi.fn();
      render(
        <TextmapView data={g} selectedNodeId={null} onSelectNode={() => {}} onNodeUpdate={onUpdate} />,
      );
      fireEvent.click(screen.getByLabelText("Notes for Alpha"));
      fireEvent.change(screen.getByPlaceholderText(/notes/i), { target: { value: "hello" } });
      vi.advanceTimersByTime(600);
      expect(onUpdate).toHaveBeenCalledWith("a", { notes: "hello" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders a loop marker for a cycle instead of recursing forever", () => {
    // Alpha → Beta → Gamma → Beta (cycle). All nodes visible in type group.
    const g = graph(
      [node("a", "Alpha"), node("b", "Beta"), node("c", "Gamma")],
      [edge("a", "b"), edge("b", "c"), edge("c", "b")],
    );
    const { container } = render(
      <TextmapView data={g} selectedNodeId={null} onSelectNode={() => {}} />,
    );

    // Expand Alpha's connections via its own row's disclosure button.
    const alphaRow = screen.getByText("Alpha").closest(".textmap-row") as HTMLElement;
    fireEvent.click(within(alphaRow).getByLabelText("Expand")); // Alpha → Beta child

    // Beta now appears as both a type-group item and a child of Alpha.
    // Find the child Beta (inside Alpha's .textmap-node, after the row).
    const alphaNode = screen.getByText("Alpha").closest(".textmap-node") as HTMLElement;
    const childBetaRow = within(alphaNode).getAllByText("Beta")[0].closest(".textmap-row") as HTMLElement;
    fireEvent.click(within(childBetaRow).getByLabelText("Expand")); // Beta at path a>b → surfaces Alpha as loop

    const loops = container.querySelectorAll(".textmap-loop");
    expect(loops.length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain("Alpha"); // the loop links back to the ancestor
  });
});
