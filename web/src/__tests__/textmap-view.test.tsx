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
  it("shows roots, expands to reveal connections, and selects on click", () => {
    const g = graph(
      [node("a", "Alpha"), node("b", "Beta"), node("c", "Gamma")],
      [edge("a", "b"), edge("a", "c")],
    );
    const onSelect = vi.fn();
    render(<TextmapView data={g} selectedNodeId={null} onSelectNode={onSelect} />);

    // Root present; children not yet rendered.
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();

    // Expand the only expandable row (Alpha).
    fireEvent.click(screen.getByLabelText("Expand"));
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();

    // Selecting a child calls the handler with that node.
    fireEvent.click(screen.getByText("Beta"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
  });

  it("re-roots and records a breadcrumb when focusing a node", () => {
    const g = graph([node("a", "Alpha"), node("b", "Beta")], [edge("a", "b")]);
    render(<TextmapView data={g} selectedNodeId={null} onSelectNode={() => {}} />);

    fireEvent.click(screen.getByLabelText("Focus on Alpha"));
    expect(screen.getByText("All roots")).toBeInTheDocument();
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
    // Alpha → Beta → Gamma → Beta (cycle). Single root: Alpha.
    const g = graph(
      [node("a", "Alpha"), node("b", "Beta"), node("c", "Gamma")],
      [edge("a", "b"), edge("b", "c"), edge("c", "b")],
    );
    const { container } = render(
      <TextmapView data={g} selectedNodeId={null} onSelectNode={() => {}} />,
    );

    // Expand Alpha, then Beta. Beta's incoming edge from Gamma is fine, but the
    // path Alpha›Beta means expanding Gamma later would loop on Beta; more
    // directly, expanding Beta surfaces Alpha as an ancestor loop-link.
    fireEvent.click(screen.getByLabelText("Expand")); // Alpha
    const betaRow = screen.getByText("Beta").closest(".textmap-row") as HTMLElement;
    fireEvent.click(within(betaRow).getByLabelText("Expand")); // Beta

    const loops = container.querySelectorAll(".textmap-loop");
    expect(loops.length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain("Alpha"); // the loop links back to the ancestor
  });
});
