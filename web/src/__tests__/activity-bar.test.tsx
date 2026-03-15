import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityBar } from "../ui/ActivityBar";
import { defaultNodeTypeConfigs } from "./fixtures";

const defaultProps = {
  viewMode: "full",
  onViewModeChange: vi.fn(),
  sidebarOpen: false,
  onToggleSidebar: vi.fn(),
  onOpenSettings: vi.fn(),
  onEditTaxonomy: vi.fn(),
  nodeTypeConfigs: defaultNodeTypeConfigs,
};

describe("ActivityBar", () => {
  it("renders full network button and dynamic node type buttons", () => {
    render(<ActivityBar {...defaultProps} />);
    expect(screen.getByTitle("Full Network")).toBeInTheDocument();
    // Dynamic buttons from nodeTypeConfigs — "Node View" for DEFAULT_NODE_CONFIG
    expect(screen.getByTitle("Node View")).toBeInTheDocument();
  });

  it("highlights the active view mode", () => {
    render(<ActivityBar {...defaultProps} viewMode="node" />);
    expect(screen.getByTitle("Node View").className).toContain("active");
    expect(screen.getByTitle("Full Network").className).not.toContain("active");
  });

  it("calls onViewModeChange when view buttons are clicked", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    render(<ActivityBar {...defaultProps} onViewModeChange={onViewModeChange} />);

    await user.click(screen.getByTitle("Node View"));
    expect(onViewModeChange).toHaveBeenCalledWith("node");
  });

  it("calls onToggleSidebar when sidebar button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleSidebar = vi.fn();
    render(<ActivityBar {...defaultProps} onToggleSidebar={onToggleSidebar} />);

    await user.click(screen.getByTitle("Toggle Sidebar"));
    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it("highlights sidebar button when sidebar is open", () => {
    render(<ActivityBar {...defaultProps} sidebarOpen={true} />);
    expect(screen.getByTitle("Toggle Sidebar").className).toContain("active");
  });

  it("renders settings button and calls onOpenSettings", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(<ActivityBar {...defaultProps} onOpenSettings={onOpenSettings} />);

    await user.click(screen.getByTitle("Settings"));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it("renders taxonomy edit button", async () => {
    const user = userEvent.setup();
    const onEditTaxonomy = vi.fn();
    render(<ActivityBar {...defaultProps} onEditTaxonomy={onEditTaxonomy} />);

    await user.click(screen.getByTitle("Edit Taxonomy"));
    expect(onEditTaxonomy).toHaveBeenCalled();
  });

  it("displays custom icons from node type configs", () => {
    const customConfigs = [
      { id: "person", label: "Person", shape: "circle" as const, icon: "P", fields: [] },
      { id: "org", label: "Organisation", shape: "rectangle" as const, icon: "O", fields: [] },
    ];
    render(<ActivityBar {...defaultProps} nodeTypeConfigs={customConfigs} />);
    expect(screen.getByTitle("Person View")).toBeInTheDocument();
    expect(screen.getByTitle("Organisation View")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("O")).toBeInTheDocument();
  });

  it("updates labels when node type configs change", () => {
    const configs1 = [{ id: "item", label: "Item", shape: "circle" as const, icon: "I", fields: [] }];
    const { rerender } = render(<ActivityBar {...defaultProps} nodeTypeConfigs={configs1} />);
    expect(screen.getByTitle("Item View")).toBeInTheDocument();

    const configs2 = [{ id: "item", label: "Widget", shape: "circle" as const, icon: "W", fields: [] }];
    rerender(<ActivityBar {...defaultProps} nodeTypeConfigs={configs2} />);
    expect(screen.getByTitle("Widget View")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
  });
});
