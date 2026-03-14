// SPEC: REQ-018 (Edge Creation), REQ-023 (AC-023-07/08)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddEdgeModal } from "../ui/AddEdgeModal";
import { argyris, senge, doubleLoop, cynefin } from "./fixtures";

describe("AddEdgeModal — Thinker to Thinker", () => {
  const defaultProps = {
    sourceNode: argyris,
    targetNode: senge,
    onAdd: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders source and target names", () => {
    render(<AddEdgeModal {...defaultProps} />);
    expect(screen.getByText(/Chris Argyris/)).toBeInTheDocument();
    expect(screen.getByText(/Peter Senge/)).toBeInTheDocument();
  });

  // AC-023-08: Edge type dropdown shows only valid types for thinker-thinker
  it("shows only thinker-thinker edge types", () => {
    render(<AddEdgeModal {...defaultProps} />);
    expect(screen.getByText("Teacher → Pupil")).toBeInTheDocument();
    expect(screen.getByText("Chain (cultural capital)")).toBeInTheDocument();
    expect(screen.getByText("Rivalry")).toBeInTheDocument();
    expect(screen.getByText("Alliance")).toBeInTheDocument();
    // Should NOT show concept-concept types
    expect(screen.queryByText("Extends")).not.toBeInTheDocument();
    expect(screen.queryByText("Subsumes")).not.toBeInTheDocument();
  });

  it("disables Add Edge button until type is selected", () => {
    render(<AddEdgeModal {...defaultProps} />);
    const addBtn = screen.getByRole("button", { name: "Add Edge" });
    expect(addBtn).toBeDisabled();
  });

  it("calls onAdd with selected edge type", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddEdgeModal {...defaultProps} onAdd={onAdd} />);

    await user.selectOptions(screen.getByRole("combobox"), "rivalry");
    await user.click(screen.getByRole("button", { name: "Add Edge" }));

    expect(onAdd).toHaveBeenCalledWith("rivalry");
  });
});

describe("AddEdgeModal — Concept to Concept", () => {
  it("shows only concept-concept edge types", () => {
    render(
      <AddEdgeModal
        sourceNode={cynefin}
        targetNode={doubleLoop}
        onAdd={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Extends")).toBeInTheDocument();
    expect(screen.getByText("Opposes")).toBeInTheDocument();
    expect(screen.getByText("Enables")).toBeInTheDocument();
    expect(screen.getByText("Reframes")).toBeInTheDocument();
    // Should NOT show thinker-thinker types
    expect(screen.queryByText("Teacher → Pupil")).not.toBeInTheDocument();
    expect(screen.queryByText("Rivalry")).not.toBeInTheDocument();
  });
});

describe("AddEdgeModal — Thinker to Concept", () => {
  it("shows only thinker-concept edge types", () => {
    render(
      <AddEdgeModal
        sourceNode={argyris}
        targetNode={doubleLoop}
        onAdd={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Originates")).toBeInTheDocument();
    expect(screen.getByText("Develops")).toBeInTheDocument();
    expect(screen.getByText("Contests")).toBeInTheDocument();
    expect(screen.getByText("Applies")).toBeInTheDocument();
    // Should NOT show other categories
    expect(screen.queryByText("Rivalry")).not.toBeInTheDocument();
    expect(screen.queryByText("Extends")).not.toBeInTheDocument();
  });
});

describe("AddEdgeModal — Cancel", () => {
  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <AddEdgeModal
        sourceNode={argyris}
        targetNode={senge}
        onAdd={vi.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
