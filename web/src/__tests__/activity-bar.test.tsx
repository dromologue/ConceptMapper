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

  // SPEC: REQ-075 (Explode View — moved from Sidebar)
  it("renders explode button when onExplode is provided (AC-075-01)", () => {
    render(<ActivityBar {...defaultProps} onExplode={vi.fn()} />);
    expect(screen.getByTitle("Explode graph")).toBeInTheDocument();
  });

  it("does not render explode button when onExplode is not provided", () => {
    render(<ActivityBar {...defaultProps} />);
    expect(screen.queryByTitle("Explode graph")).not.toBeInTheDocument();
  });

  it("shows active state when exploded (AC-075-01)", () => {
    render(<ActivityBar {...defaultProps} onExplode={vi.fn()} exploded={true} />);
    const btn = screen.getByTitle("Collapse graph");
    expect(btn.className).toContain("active");
  });

  it("calls onExplode when button is clicked", async () => {
    const user = userEvent.setup();
    const onExplode = vi.fn();
    render(<ActivityBar {...defaultProps} onExplode={onExplode} />);
    await user.click(screen.getByTitle("Explode graph"));
    expect(onExplode).toHaveBeenCalled();
  });

  // SPEC: REQ-061C (Layout Presets)
  it("renders layout button when onLayoutPresetChange is provided (AC-061C-02)", () => {
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={vi.fn()} />);
    expect(screen.getByTitle("Layout")).toBeInTheDocument();
  });

  it("does not render layout button when onLayoutPresetChange is not provided", () => {
    render(<ActivityBar {...defaultProps} />);
    expect(screen.queryByTitle("Layout")).not.toBeInTheDocument();
  });

  it("shows layout popover with three options when clicked (AC-061C-02)", async () => {
    const user = userEvent.setup();
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={vi.fn()} />);
    await user.click(screen.getByTitle("Layout"));
    expect(screen.getByText("Force")).toBeInTheDocument();
    expect(screen.getByText("Flow")).toBeInTheDocument();
    expect(screen.getByText("Radial")).toBeInTheDocument();
  });

  it("calls onLayoutPresetChange when a preset is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={onChange} />);
    await user.click(screen.getByTitle("Layout"));
    await user.click(screen.getByText("Flow"));
    expect(onChange).toHaveBeenCalledWith("flow");
  });

  it("shows Reset Classifiers button when onResetLayout is provided (AC-061C-07)", async () => {
    const user = userEvent.setup();
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={vi.fn()} onResetLayout={vi.fn()} />);
    await user.click(screen.getByTitle("Layout"));
    expect(screen.getByText("Reset Classifiers")).toBeInTheDocument();
  });

  it("calls onResetLayout when Reset Classifiers is clicked", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={vi.fn()} onResetLayout={onReset} />);
    await user.click(screen.getByTitle("Layout"));
    await user.click(screen.getByText("Reset Classifiers"));
    expect(onReset).toHaveBeenCalled();
  });

  it("highlights active layout preset", async () => {
    const user = userEvent.setup();
    render(<ActivityBar {...defaultProps} layoutPreset="radial" onLayoutPresetChange={vi.fn()} />);
    await user.click(screen.getByTitle("Layout"));
    const radialBtn = screen.getByText("Radial").closest("button")!;
    expect(radialBtn.className).toContain("active");
  });
});
