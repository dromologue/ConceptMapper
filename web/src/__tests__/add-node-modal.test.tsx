// SPEC: REQ-018 (Node Creation)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddNodeModal } from "../ui/AddNodeModal";
import { sampleStreams, sampleGenerations } from "./fixtures";

describe("AddNodeModal — Thinker", () => {
  const defaultProps = {
    type: "thinker" as const,
    streams: sampleStreams,
    generations: sampleGenerations,
    onAdd: vi.fn(),
    onCancel: vi.fn(),
  };

  // AC-018-11: Modal renders with correct title
  it("renders Add Thinker title", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByText("Add Thinker")).toBeInTheDocument();
  });

  // Form fields
  it("renders name input and select fields", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("e.g. Herbert Simon")).toBeInTheDocument();
    expect(screen.getByText("Stream")).toBeInTheDocument();
    expect(screen.getByText("Generation")).toBeInTheDocument();
    expect(screen.getByText("Eminence")).toBeInTheDocument();
  });

  // Eminence options
  it("shows all four eminence tiers", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByRole("option", { name: "Dominant" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Major" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Secondary" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Minor" })).toBeInTheDocument();
  });

  // AC-018-20: Add button disabled when name is empty
  it("disables Add button when name is empty", () => {
    render(<AddNodeModal {...defaultProps} />);
    const addBtn = screen.getByText("Add");
    expect(addBtn).toBeDisabled();
  });

  // Submit calls onAdd with correct values
  it("calls onAdd with name, stream, eminence, and generation", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddNodeModal {...defaultProps} onAdd={onAdd} />);

    await user.type(screen.getByPlaceholderText("e.g. Herbert Simon"), "Herbert Simon");
    await user.click(screen.getByText("Add"));

    expect(onAdd).toHaveBeenCalledWith(
      "Herbert Simon",
      "psychology", // first stream
      "secondary", // default eminence
      2 // first generation number
    );
  });

  // Cancel
  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AddNodeModal {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  // Cancel on overlay click
  it("calls onCancel when overlay is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AddNodeModal {...defaultProps} onCancel={onCancel} />);

    // Click the overlay (the outer div)
    const overlay = document.querySelector(".modal-overlay");
    if (overlay) await user.click(overlay);
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("AddNodeModal — Concept", () => {
  const defaultProps = {
    type: "concept" as const,
    streams: sampleStreams,
    generations: sampleGenerations,
    onAddConcept: vi.fn(),
    onCancel: vi.fn(),
  };

  // AC-018-12: Modal renders with correct title
  it("renders Add Concept title", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByText("Add Concept")).toBeInTheDocument();
  });

  // Concept-specific fields
  it("shows Concept Type and Abstraction Level selects instead of Eminence", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByText("Concept Type")).toBeInTheDocument();
    expect(screen.getByText("Abstraction Level")).toBeInTheDocument();
    expect(screen.queryByText("Eminence")).not.toBeInTheDocument();
  });

  // Concept type options match taxonomy
  it("shows all six concept types", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByText("Framework")).toBeInTheDocument();
    expect(screen.getByText("Principle")).toBeInTheDocument();
    expect(screen.getByText("Distinction")).toBeInTheDocument();
    expect(screen.getByText("Mechanism")).toBeInTheDocument();
    expect(screen.getByText("Prescription")).toBeInTheDocument();
    expect(screen.getByText("Synthesis")).toBeInTheDocument();
  });

  // Abstraction level options
  it("shows all four abstraction levels", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByText("Concrete")).toBeInTheDocument();
    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByText("Theoretical")).toBeInTheDocument();
    expect(screen.getByText("Meta-theoretical")).toBeInTheDocument();
  });

  it("calls onAddConcept with correct values", async () => {
    const user = userEvent.setup();
    const onAddConcept = vi.fn();
    render(<AddNodeModal {...defaultProps} onAddConcept={onAddConcept} />);

    await user.type(screen.getByPlaceholderText("e.g. Bounded Rationality"), "Bounded Rationality");
    await user.click(screen.getByText("Add"));

    expect(onAddConcept).toHaveBeenCalledWith(
      "Bounded Rationality",
      "psychology",
      "framework",
      "theoretical",
      2
    );
  });
});
