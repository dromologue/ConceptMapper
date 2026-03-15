import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EdgePopover } from "../ui/EdgePopover";
import type { GraphEdge } from "../types/graph-ir";

const sampleEdge: GraphEdge = {
  from: "argyris",
  to: "senge",
  edge_type: "chain",
  edge_category: "thinker_thinker",
  directed: true,
  weight: 1.0,
  visual: { style: "solid", show_arrow: true },
};

const defaultProps = {
  edge: sampleEdge,
  position: { x: 200, y: 150 },
  onUpdate: vi.fn(),
  onClose: vi.fn(),
};

describe("EdgePopover", () => {
  it("renders with edge type label and weight slider", () => {
    render(<EdgePopover {...defaultProps} edgeTypeLabel="Chain" />);
    expect(screen.getByText("Chain")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Edge note...")).toBeInTheDocument();
  });

  it("displays current weight value", () => {
    render(<EdgePopover {...defaultProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls onUpdate when weight changes", () => {
    const onUpdate = vi.fn();
    render(<EdgePopover {...defaultProps} onUpdate={onUpdate} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "2" } });
    expect(onUpdate).toHaveBeenCalledWith("argyris", "senge", { weight: 2 });
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(<EdgePopover {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("displays note with existing value", () => {
    const edgeWithNote = { ...sampleEdge, note: "Test note" };
    render(<EdgePopover {...defaultProps} edge={edgeWithNote} />);
    expect(screen.getByDisplayValue("Test note")).toBeInTheDocument();
  });
});
