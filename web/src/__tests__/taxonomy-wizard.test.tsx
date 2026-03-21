import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxonomyWizard } from "../ui/TaxonomyWizard";

const defaultProps = {
  onComplete: vi.fn(),
  onCancel: vi.fn(),
};

// Steps (default, both axes enabled): dimensions → title → node_types → streams → generations → edges → review → create
// Helper navigates through steps with valid data at each gate
async function navigateToStep(user: ReturnType<typeof userEvent.setup>, stepId: string) {
  const order = ["dimensions", "title", "node_types", "streams", "generations", "edges", "review", "create"];
  const targetIdx = order.indexOf(stepId);
  if (targetIdx < 0) throw new Error(`Unknown step: ${stepId}`);

  // Step 0 (dimensions) is shown on render; always valid → just click Next
  if (targetIdx >= 1) {
    await user.click(screen.getByText("Next")); // dimensions → title
  }
  if (targetIdx >= 2) {
    await user.type(screen.getByPlaceholderText(/Management Theory/), "Test Map");
    await user.click(screen.getByText("Next")); // title → node_types
  }
  if (targetIdx >= 3) {
    await user.click(screen.getByText("Next")); // node_types → streams
  }
  if (targetIdx >= 4) {
    await user.type(screen.getByPlaceholderText("Name"), "Psychology");
    await user.click(screen.getByText("Next")); // streams → generations
  }
  if (targetIdx >= 5) {
    await user.click(screen.getByText("Next")); // generations → edges
  }
  if (targetIdx >= 6) {
    await user.click(screen.getByText("Next")); // edges → review
  }
  if (targetIdx >= 7) {
    await user.click(screen.getByText("Next")); // review → create
  }
}

describe("TaxonomyWizard", () => {
  it("renders step 1 (dimensions) with axis toggles", () => {
    render(<TaxonomyWizard {...defaultProps} />);
    expect(screen.getByText("What do you want to map?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Categories")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Phases")).toBeInTheDocument();
  });

  it("Next button is not disabled on dimensions step", () => {
    render(<TaxonomyWizard {...defaultProps} />);
    const nextBtn = screen.getByText("Next");
    expect(nextBtn.className).not.toContain("disabled");
  });

  it("advances to title step when Next clicked", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "title");
    expect(screen.getByText("Name Your Taxonomy")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Management Theory/)).toBeInTheDocument();
  });

  it("Next button has disabled class when title is empty", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "title");
    const nextBtn = screen.getByText("Next");
    expect(nextBtn.className).toContain("disabled");
  });

  it("advances to node types step", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    expect(screen.getByText("Define Node Types & Fields")).toBeInTheDocument();
  });

  it("node types step shows default Node type", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    expect(screen.getByDisplayValue("Node")).toBeInTheDocument();
  });

  it("node types step: can add a new node type", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    await user.click(screen.getByText("+ Add Type"));
    expect(screen.getByText("Untitled Type")).toBeInTheDocument();
  });

  it("streams step shows category label", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "streams");
    expect(screen.getByText("Define Categories")).toBeInTheDocument();
  });

  it("generations step shows phases", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "generations");
    expect(screen.getByText("Define Phases")).toBeInTheDocument();
  });

  it("edges step shows default edge types", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "edges");
    expect(screen.getByText("Define Edge Types")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Chain")).toBeInTheDocument();
  });

  it("review step shows entered data", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "review");
    expect(screen.getByText(/Review/)).toBeInTheDocument();
    expect(screen.getByText("Test Map")).toBeInTheDocument();
    expect(screen.getByText("Psychology")).toBeInTheDocument();
    expect(screen.getByText(/Node Types \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Edge Types \(5\)/)).toBeInTheDocument();
  });

  it("Create calls onComplete with correct data", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onComplete={onComplete} />);
    await navigateToStep(user, "create");
    await user.click(screen.getByText("Create"));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test Map",
      node_types: expect.arrayContaining([
        expect.objectContaining({ id: "node", label: "Node", shape: "circle" }),
      ]),
      edge_types: expect.arrayContaining([
        expect.objectContaining({ id: "chain", label: "Chain" }),
      ]),
    }));
  });

  it("Cancel calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onCancel={onCancel} />);
    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("Back button navigates to previous step", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "title");
    expect(screen.getByText("Name Your Taxonomy")).toBeInTheDocument();
    await user.click(screen.getByText("Back"));
    expect(screen.getByText("What do you want to map?")).toBeInTheDocument();
  });

  it("edit mode pre-fills data and shows Save button", async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyWizard
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          title: "Existing",
          streams: [{ id: "psych", name: "Psychology", color: "#4A90D9" }],
          generations: [{ number: 1, period: "1960-1980", label: "Founders" }],
        }}
      />
    );
    // Step 1 is dimensions; advance to title
    await user.click(screen.getByText("Next"));
    expect(screen.getByText("Edit Taxonomy")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing")).toBeInTheDocument();
    // Navigate through all steps to final
    await user.click(screen.getByText("Next")); // → node_types
    await user.click(screen.getByText("Next")); // → streams
    await user.click(screen.getByText("Next")); // → generations
    await user.click(screen.getByText("Next")); // → edges
    await user.click(screen.getByText("Next")); // → review
    await user.click(screen.getByText("Next")); // → create
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("Save as Template button calls onSaveTemplate", async () => {
    const user = userEvent.setup();
    const onSaveTemplate = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onSaveTemplate={onSaveTemplate} />);
    await navigateToStep(user, "review");
    await user.click(screen.getByText("Save as Template"));
    expect(onSaveTemplate).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test Map",
    }));
  });

  it("can add a field to a node type", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    await user.click(screen.getByText("+ Field"));
    const fieldInputs = screen.getAllByPlaceholderText("Field label");
    expect(fieldInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("shape dropdown offers all 6 shape options", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    // Find the shape select — the default node has shape "circle"
    const shapeSelect = screen.getByDisplayValue("Circle");
    expect(shapeSelect).toBeInTheDocument();
    // Check all options exist
    const options = shapeSelect.querySelectorAll("option");
    const values = [...options].map((o) => o.getAttribute("value"));
    expect(values).toContain("circle");
    expect(values).toContain("rectangle");
    expect(values).toContain("diamond");
    expect(values).toContain("hexagon");
    expect(values).toContain("triangle");
    expect(values).toContain("pill");
  });

  it("edit mode shows existing node types", async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyWizard
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          title: "Existing",
          streams: [{ id: "s1", name: "Stream", color: "#000" }],
          generations: [{ number: 1 }],
          node_types: [
            {
              id: "person", label: "Person", shape: "circle" as const, icon: "P",
              fields: [
                { key: "importance", label: "Importance", type: "text" as const },
                { key: "role", label: "Role", type: "text" as const },
              ],
            },
            {
              id: "org", label: "Organisation", shape: "rectangle" as const, icon: "O",
              fields: [
                { key: "importance", label: "Significance", type: "text" as const },
                { key: "role", label: "Function", type: "text" as const },
              ],
            },
          ],
        }}
      />
    );
    // Navigate to node types step
    await user.click(screen.getByText("Next")); // → title
    await user.click(screen.getByText("Next")); // → node_types
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.getByText("Organisation")).toBeInTheDocument();
  });
});
