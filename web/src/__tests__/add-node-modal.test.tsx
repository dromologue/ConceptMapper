// SPEC: REQ-018 (Node Creation)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddNodeModal } from "../ui/AddNodeModal";
import { sampleStreams, sampleGenerations, defaultNodeTypeConfigs } from "./fixtures";

describe("AddNodeModal — Default node type", () => {
  const defaultProps = {
    nodeTypeConfigs: defaultNodeTypeConfigs,
    streams: sampleStreams,
    generations: sampleGenerations,
    onAdd: vi.fn(),
    onCancel: vi.fn(),
    initialNodeType: "node",
  };

  it("renders Add Node title", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByText("Add Node")).toBeInTheDocument();
  });

  it("renders name input and select fields", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("e.g. New Node")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Horizon")).toBeInTheDocument();
  });

  it("renders essential fields (name, category, horizon)", () => {
    render(<AddNodeModal {...defaultProps} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Horizon")).toBeInTheDocument();
  });

  it("disables Add button when name is empty", () => {
    render(<AddNodeModal {...defaultProps} />);
    const addBtn = screen.getByText("Add");
    expect(addBtn).toBeDisabled();
  });

  it("calls onAdd with nodeType, name, stream, generation, and properties", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddNodeModal {...defaultProps} onAdd={onAdd} />);

    await user.type(screen.getByPlaceholderText("e.g. New Node"), "Herbert Simon");
    await user.click(screen.getByText("Add"));

    expect(onAdd).toHaveBeenCalledWith(
      "node",            // nodeType
      "Herbert Simon",   // name
      "psychology",      // first stream
      2,                 // first generation number
      expect.any(Object) // properties
    );
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AddNodeModal {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when overlay is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AddNodeModal {...defaultProps} onCancel={onCancel} />);

    const overlay = document.querySelector(".modal-overlay");
    if (overlay) await user.click(overlay);
    expect(onCancel).toHaveBeenCalled();
  });
});
