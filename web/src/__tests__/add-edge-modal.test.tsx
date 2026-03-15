// SPEC: REQ-018 (Edge Creation)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddEdgeModal } from "../ui/AddEdgeModal";
import { argyris, senge } from "./fixtures";

const defaultProps = {
  sourceNode: argyris,
  targetNode: senge,
  onAdd: vi.fn(),
  onCancel: vi.fn(),
};

describe("AddEdgeModal", () => {
  it("renders source and target names", () => {
    render(<AddEdgeModal {...defaultProps} />);
    expect(screen.getByText(/Chris Argyris/)).toBeInTheDocument();
    expect(screen.getByText(/Peter Senge/)).toBeInTheDocument();
  });

  it("shows default edge types in flat list", () => {
    render(<AddEdgeModal {...defaultProps} />);
    expect(screen.getByText("Chain")).toBeInTheDocument();
    expect(screen.getByText("Originates")).toBeInTheDocument();
    expect(screen.getByText("Rivalry")).toBeInTheDocument();
  });

  it("shows weight slider", () => {
    render(<AddEdgeModal {...defaultProps} />);
    expect(screen.getByText(/Weight/)).toBeInTheDocument();
  });

  it("disables Add Edge button until type is selected", () => {
    render(<AddEdgeModal {...defaultProps} />);
    const addBtn = screen.getByRole("button", { name: "Add Edge" });
    expect(addBtn).toBeDisabled();
  });

  it("calls onAdd with edge type and weight", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddEdgeModal {...defaultProps} onAdd={onAdd} />);

    await user.selectOptions(screen.getByRole("combobox"), "rivalry");
    await user.click(screen.getByRole("button", { name: "Add Edge" }));

    expect(onAdd).toHaveBeenCalledWith("rivalry", 1.0);
  });

  it("uses template edge types when provided", () => {
    render(
      <AddEdgeModal
        {...defaultProps}
        edgeTypeConfigs={[
          { id: "custom", label: "Custom Link", directed: true },
          { id: "dependency", label: "Depends On", directed: true },
        ]}
      />
    );
    expect(screen.getByText("Custom Link")).toBeInTheDocument();
    expect(screen.getByText("Depends On")).toBeInTheDocument();
    expect(screen.queryByText("Chain")).not.toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AddEdgeModal {...defaultProps} onCancel={onCancel} />);
    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
