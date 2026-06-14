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

/** Open the Advanced Tools flyout. Only callable when an advanced tool prop is provided. */
async function openAdvanced(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTitle("Advanced Tools"));
}

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

  // SPEC: REQ-075 (Explode View — inside Advanced flyout)
  it("renders Advanced Tools button when onExplode is provided (AC-075-01)", () => {
    render(<ActivityBar {...defaultProps} onExplode={vi.fn()} />);
    expect(screen.getByTitle("Advanced Tools")).toBeInTheDocument();
  });

  it("does not render Advanced Tools button when no advanced tools are provided", () => {
    render(<ActivityBar {...defaultProps} />);
    expect(screen.queryByTitle("Advanced Tools")).not.toBeInTheDocument();
  });

  it("shows Explode Graph item in Advanced flyout when onExplode is provided (AC-075-01)", async () => {
    const user = userEvent.setup();
    render(<ActivityBar {...defaultProps} onExplode={vi.fn()} />);
    await openAdvanced(user);
    expect(screen.getByText("Explode Graph")).toBeInTheDocument();
  });

  it("shows active state on Advanced button when exploded (AC-075-01)", () => {
    render(<ActivityBar {...defaultProps} onExplode={vi.fn()} exploded={true} />);
    expect(screen.getByTitle("Advanced Tools").className).toContain("active");
  });

  it("shows Collapse Graph label in flyout when exploded", async () => {
    const user = userEvent.setup();
    render(<ActivityBar {...defaultProps} onExplode={vi.fn()} exploded={true} />);
    await openAdvanced(user);
    expect(screen.getByText("Collapse Graph")).toBeInTheDocument();
  });

  it("calls onExplode when Explode Graph is clicked in Advanced flyout", async () => {
    const user = userEvent.setup();
    const onExplode = vi.fn();
    render(<ActivityBar {...defaultProps} onExplode={onExplode} />);
    await openAdvanced(user);
    await user.click(screen.getByText("Explode Graph"));
    expect(onExplode).toHaveBeenCalled();
  });

  // SPEC: REQ-061C (Layout Presets — inside Advanced flyout)
  it("shows Advanced Tools button when onLayoutPresetChange is provided (AC-061C-02)", () => {
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={vi.fn()} />);
    expect(screen.getByTitle("Advanced Tools")).toBeInTheDocument();
  });

  it("does not render a standalone Layout button (layout is in Advanced flyout)", () => {
    render(<ActivityBar {...defaultProps} />);
    expect(screen.queryByTitle("Layout")).not.toBeInTheDocument();
  });

  it("shows layout section with three presets in Advanced flyout (AC-061C-02)", async () => {
    const user = userEvent.setup();
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={vi.fn()} />);
    await openAdvanced(user);
    expect(screen.getByText("Force")).toBeInTheDocument();
    expect(screen.getByText("Flow")).toBeInTheDocument();
    expect(screen.getByText("Radial")).toBeInTheDocument();
  });

  it("calls onLayoutPresetChange when a preset is selected in Advanced flyout", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={onChange} />);
    await openAdvanced(user);
    await user.click(screen.getByText("Flow"));
    expect(onChange).toHaveBeenCalledWith("flow");
  });

  it("shows Reset Classifiers in Advanced flyout when onResetLayout is provided (AC-061C-07)", async () => {
    const user = userEvent.setup();
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={vi.fn()} onResetLayout={vi.fn()} />);
    await openAdvanced(user);
    expect(screen.getByText("Reset Classifiers")).toBeInTheDocument();
  });

  it("calls onResetLayout when Reset Classifiers is clicked in Advanced flyout", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<ActivityBar {...defaultProps} layoutPreset="force" onLayoutPresetChange={vi.fn()} onResetLayout={onReset} />);
    await openAdvanced(user);
    await user.click(screen.getByText("Reset Classifiers"));
    expect(onReset).toHaveBeenCalled();
  });

  it("highlights active layout preset in Advanced flyout", async () => {
    const user = userEvent.setup();
    render(<ActivityBar {...defaultProps} layoutPreset="radial" onLayoutPresetChange={vi.fn()} />);
    await openAdvanced(user);
    const radialBtn = screen.getByText("Radial").closest("button")!;
    expect(radialBtn.className).toContain("active");
  });

  // SPEC: REQ-061D (Properties and Notes toolbar buttons)
  it("renders Properties button when onToggleProperties is provided (AC-061D-01)", () => {
    render(<ActivityBar {...defaultProps} onToggleProperties={vi.fn()} />);
    expect(screen.getByTitle("Properties")).toBeInTheDocument();
  });

  it("highlights Properties button when propertiesOpen is true", () => {
    render(<ActivityBar {...defaultProps} onToggleProperties={vi.fn()} propertiesOpen={true} />);
    expect(screen.getByTitle("Properties").className).toContain("active");
  });

  it("calls onToggleProperties when Properties button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ActivityBar {...defaultProps} onToggleProperties={onToggle} />);
    await user.click(screen.getByTitle("Properties"));
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders Notes button when onToggleNotes is provided (AC-061D-02)", () => {
    render(<ActivityBar {...defaultProps} onToggleNotes={vi.fn()} />);
    expect(screen.getByTitle("Notes")).toBeInTheDocument();
  });

  it("highlights Notes button when notesOpen is true", () => {
    render(<ActivityBar {...defaultProps} onToggleNotes={vi.fn()} notesOpen={true} />);
    expect(screen.getByTitle("Notes").className).toContain("active");
  });

  it("calls onToggleNotes when Notes button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ActivityBar {...defaultProps} onToggleNotes={onToggle} />);
    await user.click(screen.getByTitle("Notes"));
    expect(onToggle).toHaveBeenCalled();
  });

  // REQ-088 — expand level stepper (inside Advanced flyout)
  describe("expand level stepper", () => {
    it("hides the stepper and Advanced button when the graph has no hierarchy (maxExpandLevel = 0)", () => {
      render(<ActivityBar {...defaultProps} expandLevel={0} maxExpandLevel={0} onExpandLevelChange={vi.fn()} />);
      // maxExpandLevel=0 → hasAdvancedTools=false → Advanced button absent
      expect(screen.queryByTitle("Advanced Tools")).not.toBeInTheDocument();
    });

    it("renders +, depth label, and − inside Advanced flyout when hierarchy is present", async () => {
      const user = userEvent.setup();
      render(<ActivityBar {...defaultProps} expandLevel={1} maxExpandLevel={4} onExpandLevelChange={vi.fn()} />);
      await openAdvanced(user);
      expect(screen.getByLabelText("Expand one level")).toBeInTheDocument();
      expect(screen.getByLabelText("Collapse one level")).toBeInTheDocument();
      expect(screen.getByText("1/4")).toBeInTheDocument();
    });

    it("disables the − button at level 0 and the + button at maxExpandLevel", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ActivityBar {...defaultProps} expandLevel={0} maxExpandLevel={3} onExpandLevelChange={vi.fn()} />
      );
      await openAdvanced(user);
      expect(screen.getByLabelText("Collapse one level")).toBeDisabled();
      expect(screen.getByLabelText("Expand one level")).not.toBeDisabled();
      rerender(<ActivityBar {...defaultProps} expandLevel={3} maxExpandLevel={3} onExpandLevelChange={vi.fn()} />);
      expect(screen.getByLabelText("Expand one level")).toBeDisabled();
      expect(screen.getByLabelText("Collapse one level")).not.toBeDisabled();
    });

    it("calls onExpandLevelChange with level+1 when + is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ActivityBar {...defaultProps} expandLevel={1} maxExpandLevel={4} onExpandLevelChange={onChange} />);
      await openAdvanced(user);
      await user.click(screen.getByLabelText("Expand one level"));
      expect(onChange).toHaveBeenCalledWith(2);
    });

    it("calls onExpandLevelChange with level-1 when − is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ActivityBar {...defaultProps} expandLevel={2} maxExpandLevel={4} onExpandLevelChange={onChange} />);
      await openAdvanced(user);
      await user.click(screen.getByLabelText("Collapse one level"));
      expect(onChange).toHaveBeenCalledWith(1);
    });

    it("double-clicking the depth label toggles between fully collapsed and fully expanded", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      // From not-fully-expanded → max
      const { rerender } = render(
        <ActivityBar {...defaultProps} expandLevel={1} maxExpandLevel={4} onExpandLevelChange={onChange} />
      );
      await openAdvanced(user);
      await user.dblClick(screen.getByText("1/4"));
      expect(onChange).toHaveBeenLastCalledWith(4);
      // From fully expanded → 0
      rerender(<ActivityBar {...defaultProps} expandLevel={4} maxExpandLevel={4} onExpandLevelChange={onChange} />);
      await user.dblClick(screen.getByText("4/4"));
      expect(onChange).toHaveBeenLastCalledWith(0);
    });
  });
});
